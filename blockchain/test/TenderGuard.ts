import { expect } from "chai";
import type { Contract } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TenderGuard", function () {
  let tenderGuard: Contract;
  let supplierRegistry: Contract;
  let accounts: Awaited<ReturnType<typeof ethers.getSigners>>;
  let bidDeadline: number;
  let revealDeadline: number;

  const tenderId = 1n;
  const reportHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain report"));
  const decisionHash = ethers.keccak256(ethers.toUtf8Bytes("decision evidence"));

  async function createTender(deposit = 0n) {
    return tenderGuard.createTender("Road resurfacing", 100n, bidDeadline, revealDeadline, deposit);
  }

  async function commitmentFor(tender: bigint, bidder: { address: string }, amount: bigint, secret: string) {
    return ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "bytes32"],
      [tender, bidder.address, amount, secret],
    );
  }

  async function commitBid(bidderIndex: number, amount: bigint, secret: string, tender = tenderId, value = 0n) {
    const bidder = accounts[bidderIndex];
    const commitment = await commitmentFor(tender, bidder, amount, secret);
    await tenderGuard.connect(bidder).commitBid(tender, commitment, { value });
    return { bidder, commitment };
  }

  async function beginRevealPeriod() {
    await ethers.provider.send("evm_setNextBlockTimestamp", [bidDeadline]);
    await ethers.provider.send("evm_mine", []);
  }

  async function finishRevealPeriod() {
    await ethers.provider.send("evm_setNextBlockTimestamp", [revealDeadline + 1]);
    await ethers.provider.send("evm_mine", []);
  }

  async function revealAndAssess(index: number, amount: bigint, secret: string) {
    const bidder = accounts[index];
    await tenderGuard.connect(bidder).revealBid(tenderId, amount, secret);
    await tenderGuard.recordBidRisk(tenderId, bidder.address, 0n);
  }

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    supplierRegistry = await ethers.deployContract("SupplierRegistry");
    tenderGuard = await ethers.deployContract("TenderGuard", [await supplierRegistry.getAddress()]);
    await supplierRegistry.setAuthorizedContract(await tenderGuard.getAddress(), true);
    for (const index of [1, 2, 3]) {
      await supplierRegistry.registerSupplier(
        accounts[index].address,
        ethers.keccak256(ethers.toUtf8Bytes(`supplier-${index}`)),
        ethers.keccak256(ethers.toUtf8Bytes("construction")),
        5n,
        ethers.ZeroHash,
      );
    }
    const block = await ethers.provider.getBlock("latest");
    bidDeadline = block!.timestamp + 300;
    revealDeadline = bidDeadline + 300;
    await createTender();
  });

  it("sets the deployer as administrator and stores the registry reference", async function () {
    expect(await tenderGuard.owner()).to.equal(accounts[0].address);
    expect(await tenderGuard.supplierRegistry()).to.equal(await supplierRegistry.getAddress());
  });

  it("creates tenders with default procurement weights", async function () {
    const tender = await tenderGuard.getTender(tenderId);
    expect(tender.creator).to.equal(accounts[0].address);
    expect(tender.title).to.equal("Road resurfacing");
    expect(tender.budget).to.equal(100n);
    expect(tender.status).to.equal(0n);
    expect(tender.exists).to.equal(true);
    expect(await tenderGuard.getScoringWeights(tenderId)).to.deep.equal([40n, 25n, 20n, 15n]);
  });

  it("rejects empty titles, zero budgets, and invalid deadlines", async function () {
    await expect(tenderGuard.createTender("", 100n, bidDeadline, revealDeadline, 0n))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidTitle");
    await expect(tenderGuard.createTender("No budget", 0n, bidDeadline, revealDeadline, 0n))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidBudget");
    await expect(tenderGuard.createTender("Past", 100n, 1n, revealDeadline, 0n))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidDeadline");
    await expect(tenderGuard.createTender("Bad reveal", 100n, bidDeadline, bidDeadline, 0n))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidRevealDeadline");
  });

  it("restricts tender administration to the platform administrator", async function () {
    await expect(
      tenderGuard.connect(accounts[1]).createTender("Unauthorized", 1n, bidDeadline, revealDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await expect(
      tenderGuard.connect(accounts[1]).recordPreTenderRisk(tenderId, 10n, reportHash),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await expect(tenderGuard.connect(accounts[1]).freezeTender(tenderId))
      .to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
  });

  it("records pre-tender risk and its off-chain report hash", async function () {
    await expect(tenderGuard.recordPreTenderRisk(tenderId, 72n, reportHash))
      .to.emit(tenderGuard, "PreTenderRiskRecorded")
      .withArgs(tenderId, 72n, reportHash);
    const tender = await tenderGuard.getTender(tenderId);
    expect(tender.preTenderRiskScore).to.equal(72n);
    expect(tender.preTenderReportHash).to.equal(reportHash);
  });

  it("rejects risk scores over 100", async function () {
    await expect(tenderGuard.recordPreTenderRisk(tenderId, 101n, reportHash))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidRiskScore");
    await expect(tenderGuard.recordAIRisk(tenderId, 101n, reportHash))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidRiskScore");
    await expect(tenderGuard.recordBidRisk(tenderId, accounts[1].address, 101n))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidRiskScore");
  });

  it("rejects bids from unregistered and inactive suppliers", async function () {
    const secret = ethers.id("unregistered");
    const commitment = await commitmentFor(tenderId, accounts[4], 10n, secret);
    await expect(tenderGuard.connect(accounts[4]).commitBid(tenderId, commitment))
      .to.be.revertedWithCustomError(tenderGuard, "SupplierNotRegistered");
    await supplierRegistry.setSupplierActive(accounts[1].address, false);
    const registeredCommitment = await commitmentFor(tenderId, accounts[1], 10n, secret);
    await expect(tenderGuard.connect(accounts[1]).commitBid(tenderId, registeredCommitment))
      .to.be.revertedWithCustomError(tenderGuard, "SupplierNotRegistered");
  });

  it("accepts a registered supplier commitment and stores no bid amount", async function () {
    const secret = ethers.id("sealed-bid");
    const { bidder, commitment } = await commitBid(1, 10n, secret);
    const bid = await tenderGuard.getBid(tenderId, 0n);
    expect(bid.bidder).to.equal(bidder.address);
    expect(bid.commitment).to.equal(commitment);
    expect(bid.revealedAmount).to.equal(0n);
    expect(await tenderGuard.getBidCount(tenderId)).to.equal(1n);
    await expect(tenderGuard.connect(accounts[2]).commitBid(tenderId, ethers.id("event")))
      .to.emit(tenderGuard, "BidCommitted");
  });

  it("rejects duplicate commitments and incorrect native deposits", async function () {
    const secret = ethers.id("duplicate");
    await commitBid(1, 10n, secret);
    await expect(commitBid(1, 11n, ethers.id("again")))
      .to.be.revertedWithCustomError(tenderGuard, "AlreadyCommitted");

    const block = await ethers.provider.getBlock("latest");
    const secondBidDeadline = block!.timestamp + 100;
    const secondRevealDeadline = secondBidDeadline + 100;
    await tenderGuard.createTender("Deposit tender", 10n, secondBidDeadline, secondRevealDeadline, 100n);
    const commitment = await commitmentFor(2n, accounts[2], 1n, ethers.id("deposit"));
    await expect(tenderGuard.connect(accounts[2]).commitBid(2n, commitment, { value: 99n }))
      .to.be.revertedWithCustomError(tenderGuard, "IncorrectDeposit");
  });

  it("reveals valid bids and rejects wrong, early, late, and duplicate reveals", async function () {
    const secret = ethers.id("reveal-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret))
      .to.be.revertedWithCustomError(tenderGuard, "RevealNotOpen");
    await beginRevealPeriod();
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, 10n, ethers.id("wrong")))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidReveal");
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, 101n, secret))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidReveal");
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret))
      .to.emit(tenderGuard, "BidRevealed")
      .withArgs(tenderId, bidder.address, 10n, true);
    await tenderGuard.recordBidRisk(tenderId, bidder.address, 0n);
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret))
      .to.be.revertedWithCustomError(tenderGuard, "AlreadyRevealed");
    await finishRevealPeriod();
    await expect(tenderGuard.connect(accounts[2]).revealBid(tenderId, 10n, secret))
      .to.be.revertedWithCustomError(tenderGuard, "RevealClosed");
  });

  it("requires weights to total 100 and permits tender admins to configure them", async function () {
    await expect(tenderGuard.setScoringWeights(tenderId, 40, 20, 20, 15))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidWeights");
    await expect(tenderGuard.connect(accounts[1]).setScoringWeights(tenderId, 40, 25, 20, 15))
      .to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await expect(tenderGuard.setScoringWeights(tenderId, 50, 20, 20, 10))
      .to.emit(tenderGuard, "ScoringWeightsUpdated")
      .withArgs(tenderId, 50, 20, 20, 10);
    expect(await tenderGuard.getScoringWeights(tenderId)).to.deep.equal([50n, 20n, 20n, 10n]);
  });

  it("exposes deterministic score components for each eligible bid", async function () {
    const secret = ethers.id("evaluation");
    await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await revealAndAssess(1, 10n, secret);
    const evaluation = await tenderGuard.getBidEvaluation(tenderId, 0n);
    expect(evaluation.bidder).to.equal(accounts[1].address);
    expect(evaluation.bidAmount).to.equal(10n);
    expect(evaluation.priceScore).to.equal(100n);
    expect(evaluation.reputationScore).to.equal(50n);
    expect(evaluation.performanceScore).to.equal(50n);
    expect(evaluation.riskScore).to.equal(100n);
    expect(evaluation.finalScore).to.equal(77n);
  });

  it("selects the highest weighted score rather than price alone", async function () {
    await supplierRegistry.recordContractCompleted(accounts[1].address);
    await supplierRegistry.recordSuccessfulMilestone(accounts[1].address, true);
    const bids = [
      { index: 1, amount: 10n, secret: ethers.id("better-performance") },
      { index: 2, amount: 9n, secret: ethers.id("lower-price") },
    ];
    for (const bid of bids) await commitBid(bid.index, bid.amount, bid.secret);
    await beginRevealPeriod();
    for (const bid of bids) await revealAndAssess(bid.index, bid.amount, bid.secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    const evaluationBeforeAward = await tenderGuard.getBidEvaluation(tenderId, 0n);
    await expect(tenderGuard.awardTender(tenderId))
      .to.emit(tenderGuard, "TenderAwarded")
      .withArgs(tenderId, accounts[1].address, 10n, 96n);
    expect(await tenderGuard.getWinner(tenderId)).to.equal(accounts[1].address);
    await supplierRegistry.recordContractFailure(accounts[1].address);
    const evaluationAfterReputationChange = await tenderGuard.getBidEvaluation(tenderId, 0n);
    expect(evaluationAfterReputationChange.finalScore).to.equal(evaluationBeforeAward.finalScore);
    expect(evaluationAfterReputationChange.reputationScore).to.equal(evaluationBeforeAward.reputationScore);
  });

  it("still favors the lowest bid when supplier scores are equal", async function () {
    const bids = [
      { index: 1, amount: 10n, secret: ethers.id("price-a") },
      { index: 2, amount: 8n, secret: ethers.id("price-b") },
      { index: 3, amount: 9n, secret: ethers.id("price-c") },
    ];
    for (const bid of bids) await commitBid(bid.index, bid.amount, bid.secret);
    await beginRevealPeriod();
    for (const bid of bids) await revealAndAssess(bid.index, bid.amount, bid.secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.awardTender(tenderId);
    expect(await tenderGuard.getWinner(tenderId)).to.equal(accounts[2].address);
    expect(await tenderGuard.getWinningBid(tenderId)).to.equal(8n);
  });

  it("requires a risk assessment for every valid bid before awardability", async function () {
    const secret = ethers.id("missing-risk");
    await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await tenderGuard.connect(accounts[1]).revealBid(tenderId, 10n, secret);
    await finishRevealPeriod();
    await expect(tenderGuard.makeAwardable(tenderId))
      .to.be.revertedWithCustomError(tenderGuard, "BidRiskMissing");
  });

  it("records AI risk separately and freezes tenders irreversibly", async function () {
    await tenderGuard.recordPreTenderRisk(tenderId, 30n, reportHash);
    await expect(tenderGuard.recordAIRisk(tenderId, 81n, decisionHash))
      .to.emit(tenderGuard, "AIRiskRecorded")
      .withArgs(tenderId, 81n, decisionHash);
    expect((await tenderGuard.getTender(tenderId)).preTenderRiskScore).to.equal(30n);
    expect((await tenderGuard.getTender(tenderId)).aiRiskScore).to.equal(81n);
    await expect(tenderGuard.freezeTender(tenderId)).to.emit(tenderGuard, "TenderFrozen").withArgs(tenderId, 81n);
    await finishRevealPeriod();
    await expect(tenderGuard.makeAwardable(tenderId)).to.be.revertedWithCustomError(tenderGuard, "InvalidStatus");
  });

  it("cannot make a tender awardable early or without a valid bid", async function () {
    await expect(tenderGuard.makeAwardable(tenderId)).to.be.revertedWithCustomError(tenderGuard, "RevealNotOpen");
    await finishRevealPeriod();
    await expect(tenderGuard.makeAwardable(tenderId)).to.be.revertedWithCustomError(tenderGuard, "NoValidBids");
  });

  it("ignores unrevealed bids during scoring and awarding", async function () {
    const validSecret = ethers.id("valid");
    await commitBid(1, 10n, validSecret);
    await commitBid(2, 1n, ethers.id("unrevealed"));
    await beginRevealPeriod();
    await revealAndAssess(1, 10n, validSecret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.awardTender(tenderId);
    expect(await tenderGuard.getWinner(tenderId)).to.equal(accounts[1].address);
  });

  it("restricts awarding and prevents awarding twice", async function () {
    const secret = ethers.id("award-once");
    await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await revealAndAssess(1, 10n, secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await expect(tenderGuard.connect(accounts[2]).awardTender(tenderId))
      .to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await tenderGuard.awardTender(tenderId);
    await expect(tenderGuard.awardTender(tenderId)).to.be.revertedWithCustomError(tenderGuard, "InvalidStatus");
  });

  it("records decision proofs and rejects empty hashes", async function () {
    await expect(tenderGuard.recordDecisionProof(tenderId, decisionHash))
      .to.emit(tenderGuard, "DecisionProofRecorded")
      .withArgs(tenderId, decisionHash);
    expect((await tenderGuard.getTender(tenderId)).decisionHash).to.equal(decisionHash);
    await expect(tenderGuard.recordDecisionProof(tenderId, ethers.ZeroHash))
      .to.be.revertedWithCustomError(tenderGuard, "InvalidHash");
  });

  it("returns a valid bidder deposit and forfeits an unrevealed deposit", async function () {
    const deposit = ethers.parseEther("0.1");
    const block = await ethers.provider.getBlock("latest");
    bidDeadline = block!.timestamp + 300;
    revealDeadline = bidDeadline + 300;
    await createTender(deposit);
    const secret = ethers.id("refundable-deposit");
    const { bidder } = await commitBid(1, 10n, secret, 2n, deposit);
    await beginRevealPeriod();
    await tenderGuard.connect(bidder).revealBid(2n, 10n, secret);
    await finishRevealPeriod();
    await expect(tenderGuard.connect(bidder).claimBidDeposit(2n))
      .to.emit(tenderGuard, "BidDepositSettled")
      .withArgs(2n, bidder.address, deposit, true);
    expect(await ethers.provider.getBalance(await tenderGuard.getAddress())).to.equal(0n);
    await expect(tenderGuard.connect(bidder).claimBidDeposit(2n))
      .to.be.revertedWithCustomError(tenderGuard, "DepositUnavailable");
  });

  it("exposes bid and tender views and rejects missing records", async function () {
    expect(await tenderGuard.getTenderStatus(tenderId)).to.equal(0n);
    await expect(tenderGuard.getTender(99n)).to.be.revertedWithCustomError(tenderGuard, "TenderNotFound");
    await expect(tenderGuard.getBidCount(99n)).to.be.revertedWithCustomError(tenderGuard, "TenderNotFound");
  });
});
