import { expect } from "chai";
import type { Contract } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TenderGuard", function () {
  let tenderGuard: Contract;
  let accounts: Awaited<ReturnType<typeof ethers.getSigners>>;
  let bidDeadline: number;
  let revealDeadline: number;

  const tenderId = 1n;
  const reportHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain report"));
  const decisionHash = ethers.keccak256(ethers.toUtf8Bytes("decision evidence"));

  async function createTender() {
    await tenderGuard.createTender(
      "Road resurfacing",
      100n,
      bidDeadline,
      revealDeadline,
      0n,
    );
  }

  async function commitmentFor(bidder: { address: string }, amount: bigint, secret: string) {
    return ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "bytes32"],
      [tenderId, bidder.address, amount, secret],
    );
  }

  async function commitBid(bidderIndex: number, amount: bigint, secret: string) {
    const bidder = accounts[bidderIndex];
    const commitment = await commitmentFor(bidder, amount, secret);
    await tenderGuard.connect(bidder).commitBid(tenderId, commitment);
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

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    tenderGuard = await ethers.deployContract("TenderGuard");
    const block = await ethers.provider.getBlock("latest");
    bidDeadline = block!.timestamp + 100;
    revealDeadline = bidDeadline + 100;
    await createTender();
  });

  it("sets the deployer as platform administrator", async function () {
    expect(await tenderGuard.owner()).to.equal(accounts[0].address);
  });

  it("creates a tender with the required fields and initial status", async function () {
    const tender = await tenderGuard.getTender(tenderId);
    expect(tender.creator).to.equal(accounts[0].address);
    expect(tender.title).to.equal("Road resurfacing");
    expect(tender.budget).to.equal(100n);
    expect(tender.bidDeadline).to.equal(BigInt(bidDeadline));
    expect(tender.revealDeadline).to.equal(BigInt(revealDeadline));
    expect(tender.status).to.equal(0n);
    expect(tender.exists).to.equal(true);
  });

  it("emits TenderCreated with audit-relevant creation data", async function () {
    const block = await ethers.provider.getBlock("latest");
    const nextBidDeadline = block!.timestamp + 500;
    await expect(
      tenderGuard.createTender("Water supply", 50n, nextBidDeadline, nextBidDeadline + 50, 0n),
    )
      .to.emit(tenderGuard, "TenderCreated")
      .withArgs(2n, accounts[0].address, "Water supply", 50n, nextBidDeadline, nextBidDeadline + 50, 0n);
  });

  it("rejects empty titles, zero budgets, and invalid deadlines", async function () {
    await expect(
      tenderGuard.createTender("", 100n, bidDeadline, revealDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidTitle");
    await expect(
      tenderGuard.createTender("No budget", 0n, bidDeadline, revealDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidBudget");
    await expect(
      tenderGuard.createTender("Past", 100n, 1n, revealDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidDeadline");
    await expect(
      tenderGuard.createTender("Bad reveal", 100n, bidDeadline, bidDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidRevealDeadline");
  });

  it("restricts tender creation and administration to the owner", async function () {
    await expect(
      tenderGuard.connect(accounts[1]).createTender("Unauthorized", 1n, bidDeadline, revealDeadline, 0n),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await expect(
      tenderGuard.connect(accounts[1]).recordPreTenderRisk(tenderId, 10n, reportHash),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
    await expect(
      tenderGuard.connect(accounts[1]).freezeTender(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
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
    await expect(
      tenderGuard.recordPreTenderRisk(tenderId, 101n, reportHash),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidRiskScore");
    await expect(
      tenderGuard.recordAIRisk(tenderId, 101n, reportHash),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidRiskScore");
  });

  it("commits a bidder's sealed commitment without storing the bid amount", async function () {
    const secret = ethers.id("bidder-a-secret");
    const { bidder, commitment } = await commitBid(1, 10n, secret);
    const bid = await tenderGuard.getBid(tenderId, 0n);
    expect(bid.bidder).to.equal(bidder.address);
    expect(bid.commitment).to.equal(commitment);
    expect(bid.revealedAmount).to.equal(0n);
    expect(bid.committed).to.equal(true);
    expect(bid.revealed).to.equal(false);
    expect(await tenderGuard.getBidCount(tenderId)).to.equal(1n);
  });

  it("emits BidCommitted", async function () {
    const secret = ethers.id("event-secret");
    const commitment = await commitmentFor(accounts[1], 10n, secret);
    await expect(tenderGuard.connect(accounts[1]).commitBid(tenderId, commitment))
      .to.emit(tenderGuard, "BidCommitted")
      .withArgs(tenderId, accounts[1].address, commitment);
  });

  it("rejects duplicate commitments by the same bidder", async function () {
    const secret = ethers.id("duplicate-secret");
    await commitBid(1, 10n, secret);
    await expect(
      commitBid(1, 12n, ethers.id("second-secret")),
    ).to.be.revertedWithCustomError(tenderGuard, "AlreadyCommitted");
  });

  it("reveals a correct bid only during the reveal window", async function () {
    const amount = 10n;
    const secret = ethers.id("correct-secret");
    const { bidder } = await commitBid(1, amount, secret);
    await beginRevealPeriod();
    await expect(tenderGuard.connect(bidder).revealBid(tenderId, amount, secret))
      .to.emit(tenderGuard, "BidRevealed")
      .withArgs(tenderId, bidder.address, amount, true);
    const bid = await tenderGuard.getBid(tenderId, 0n);
    expect(bid.revealedAmount).to.equal(amount);
    expect(bid.revealed).to.equal(true);
    expect(bid.valid).to.equal(true);
    expect(await tenderGuard.getTenderStatus(tenderId)).to.equal(1n);
  });

  it("rejects reveals before the bidding deadline", async function () {
    const secret = ethers.id("early-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await expect(
      tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret),
    ).to.be.revertedWithCustomError(tenderGuard, "RevealNotOpen");
  });

  it("rejects an incorrect reveal without marking the bid revealed", async function () {
    const secret = ethers.id("real-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await expect(
      tenderGuard.connect(bidder).revealBid(tenderId, 10n, ethers.id("wrong-secret")),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidReveal");
    expect((await tenderGuard.getBid(tenderId, 0n)).revealed).to.equal(false);
    await expect(
      tenderGuard.connect(bidder).revealBid(tenderId, 11n, secret),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidReveal");
  });

  it("rejects reveal attempts from bidders without commitments", async function () {
    await beginRevealPeriod();
    await expect(
      tenderGuard.connect(accounts[2]).revealBid(tenderId, 10n, ethers.id("none")),
    ).to.be.revertedWithCustomError(tenderGuard, "NoCommitment");
  });

  it("rejects duplicate reveals and reveals after the deadline", async function () {
    const secret = ethers.id("single-reveal");
    const { bidder } = await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret);
    await expect(
      tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret),
    ).to.be.revertedWithCustomError(tenderGuard, "AlreadyRevealed");
    await finishRevealPeriod();
    await expect(
      tenderGuard.connect(accounts[2]).revealBid(tenderId, 10n, secret),
    ).to.be.revertedWithCustomError(tenderGuard, "RevealClosed");
  });

  it("records AI risk separately from pre-tender risk", async function () {
    await tenderGuard.recordPreTenderRisk(tenderId, 30n, reportHash);
    await expect(tenderGuard.recordAIRisk(tenderId, 81n, decisionHash))
      .to.emit(tenderGuard, "AIRiskRecorded")
      .withArgs(tenderId, 81n, decisionHash);
    const tender = await tenderGuard.getTender(tenderId);
    expect(tender.preTenderRiskScore).to.equal(30n);
    expect(tender.aiRiskScore).to.equal(81n);
    expect(tender.aiReportHash).to.equal(decisionHash);
  });

  it("freezes a tender and prevents it from becoming awardable", async function () {
    await expect(tenderGuard.freezeTender(tenderId))
      .to.emit(tenderGuard, "TenderFrozen")
      .withArgs(tenderId, 0n);
    expect(await tenderGuard.getTenderStatus(tenderId)).to.equal(3n);
    await finishRevealPeriod();
    await expect(
      tenderGuard.makeAwardable(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidStatus");
  });

  it("cannot make a tender awardable before reveal completes", async function () {
    await expect(
      tenderGuard.makeAwardable(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "RevealNotOpen");
  });

  it("cannot make a tender awardable without a valid revealed bid", async function () {
    await finishRevealPeriod();
    await expect(
      tenderGuard.makeAwardable(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "NoValidBids");
  });

  it("selects the lowest valid bid from multiple bidders", async function () {
    const bids = [
      { index: 1, amount: 10n, secret: ethers.id("bid-a") },
      { index: 2, amount: 8n, secret: ethers.id("bid-b") },
      { index: 3, amount: 9n, secret: ethers.id("bid-c") },
    ];
    for (const bid of bids) await commitBid(bid.index, bid.amount, bid.secret);
    await beginRevealPeriod();
    for (const bid of bids) {
      await tenderGuard.connect(accounts[bid.index]).revealBid(tenderId, bid.amount, bid.secret);
    }
    await finishRevealPeriod();
    await expect(tenderGuard.makeAwardable(tenderId))
      .to.emit(tenderGuard, "TenderAwardable")
      .withArgs(tenderId);
    await expect(tenderGuard.awardTender(tenderId))
      .to.emit(tenderGuard, "TenderAwarded")
      .withArgs(tenderId, accounts[2].address, 8n);
    expect(await tenderGuard.getWinner(tenderId)).to.equal(accounts[2].address);
    expect(await tenderGuard.getWinningBid(tenderId)).to.equal(8n);
    expect(await tenderGuard.getTenderStatus(tenderId)).to.equal(4n);
  });

  it("ignores unrevealed bids and rejects invalid reveal attempts", async function () {
    const validSecret = ethers.id("valid-bid-secret");
    const unrevealedSecret = ethers.id("unrevealed-bid-secret");
    const { bidder: validBidder } = await commitBid(1, 10n, validSecret);
    await commitBid(2, 1n, unrevealedSecret);
    const { bidder: invalidBidder } = await commitBid(3, 2n, ethers.id("other-secret"));
    await beginRevealPeriod();
    await tenderGuard.connect(validBidder).revealBid(tenderId, 10n, validSecret);
    await expect(
      tenderGuard.connect(invalidBidder).revealBid(tenderId, 2n, ethers.id("wrong")),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidReveal");
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.awardTender(tenderId);
    expect(await tenderGuard.getWinner(tenderId)).to.equal(validBidder.address);
    expect(await tenderGuard.getWinningBid(tenderId)).to.equal(10n);
  });

  it("rejects an unauthorized award", async function () {
    const secret = ethers.id("authorization-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await expect(
      tenderGuard.connect(accounts[1]).awardTender(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "Unauthorized");
  });

  it("cannot award a frozen tender", async function () {
    const secret = ethers.id("freeze-award-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.freezeTender(tenderId);
    await expect(
      tenderGuard.awardTender(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidStatus");
  });

  it("records decision proof hashes and rejects empty hashes", async function () {
    await expect(tenderGuard.recordDecisionProof(tenderId, decisionHash))
      .to.emit(tenderGuard, "DecisionProofRecorded")
      .withArgs(tenderId, decisionHash);
    expect((await tenderGuard.getTender(tenderId)).decisionHash).to.equal(decisionHash);
    await expect(
      tenderGuard.recordDecisionProof(tenderId, ethers.ZeroHash),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidHash");
  });

  it("rejects a second award after the tender is awarded", async function () {
    const secret = ethers.id("award-once-secret");
    const { bidder } = await commitBid(1, 10n, secret);
    await beginRevealPeriod();
    await tenderGuard.connect(bidder).revealBid(tenderId, 10n, secret);
    await finishRevealPeriod();
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.awardTender(tenderId);
    await expect(
      tenderGuard.awardTender(tenderId),
    ).to.be.revertedWithCustomError(tenderGuard, "InvalidStatus");
  });

  it("provides tender status and rejects nonexistent tender lookups", async function () {
    expect(await tenderGuard.getTenderStatus(tenderId)).to.equal(0n);
    await expect(tenderGuard.getTender(99n))
      .to.be.revertedWithCustomError(tenderGuard, "TenderNotFound");
    await expect(tenderGuard.getBidCount(99n))
      .to.be.revertedWithCustomError(tenderGuard, "TenderNotFound");
  });
});
