import { expect } from "chai";
import type { Contract } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("ProcurementEscrow", function () {
  let registry: Contract;
  let tenderGuard: Contract;
  let escrow: Contract;
  let accounts: Awaited<ReturnType<typeof ethers.getSigners>>;
  let bidDeadline: number;
  let revealDeadline: number;
  const tenderId = 1n;
  const procurementAmount = ethers.parseEther("1");
  const bondAmount = ethers.parseEther("0.2");
  const milestoneHash = ethers.keccak256(ethers.toUtf8Bytes("foundation milestone"));

  async function createMilestone(paymentAmount = procurementAmount) {
    const block = await ethers.provider.getBlock("latest");
    await escrow.createMilestone(tenderId, milestoneHash, paymentAmount, block!.timestamp + 3600);
  }

  async function fund() {
    return escrow.fundTender(tenderId, { value: procurementAmount });
  }

  async function depositBond() {
    return escrow.connect(accounts[1]).depositPerformanceBond(tenderId, { value: bondAmount });
  }

  async function completeAndPay() {
    await createMilestone();
    await escrow.completeMilestone(tenderId, 0n);
    await escrow.releaseMilestonePayment(tenderId, 0n);
  }

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    registry = await ethers.deployContract("SupplierRegistry");
    tenderGuard = await ethers.deployContract("TenderGuard", [await registry.getAddress()]);
    escrow = await ethers.deployContract("ProcurementEscrow", [
      await tenderGuard.getAddress(),
      await registry.getAddress(),
    ]);
    await registry.setAuthorizedContract(await tenderGuard.getAddress(), true);
    await registry.setAuthorizedContract(await escrow.getAddress(), true);
    await registry.registerSupplier(
      accounts[1].address,
      ethers.keccak256(ethers.toUtf8Bytes("winning supplier")),
      ethers.keccak256(ethers.toUtf8Bytes("construction")),
      6n,
      ethers.ZeroHash,
    );

    const block = await ethers.provider.getBlock("latest");
    bidDeadline = block!.timestamp + 300;
    revealDeadline = bidDeadline + 300;
    await tenderGuard.createTender("Bridge repairs", ethers.parseEther("10"), bidDeadline, revealDeadline, 0n);
    const secret = ethers.id("winning bid secret");
    const commitment = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "bytes32"],
      [tenderId, accounts[1].address, procurementAmount, secret],
    );
    await tenderGuard.connect(accounts[1]).commitBid(tenderId, commitment);
    await ethers.provider.send("evm_setNextBlockTimestamp", [bidDeadline]);
    await ethers.provider.send("evm_mine", []);
    await tenderGuard.connect(accounts[1]).revealBid(tenderId, procurementAmount, secret);
    await tenderGuard.recordBidRisk(tenderId, accounts[1].address, 0n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [revealDeadline + 1]);
    await ethers.provider.send("evm_mine", []);
    await tenderGuard.makeAwardable(tenderId);
    await tenderGuard.awardTender(tenderId);
  });

  it("allows the authority to fund an awarded tender with native currency", async function () {
    await expect(fund()).to.emit(escrow, "TenderFunded").withArgs(tenderId, procurementAmount);
    const funds = await escrow.tenderFunds(tenderId);
    expect(funds.escrowAmount).to.equal(procurementAmount);
    expect(funds.remainingEscrow).to.equal(procurementAmount);
    expect(funds.funded).to.equal(true);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(procurementAmount);
  });

  it("rejects duplicate and incorrect tender funding", async function () {
    await expect(escrow.fundTender(tenderId, { value: procurementAmount - 1n }))
      .to.be.revertedWithCustomError(escrow, "IncorrectFundingAmount");
    await fund();
    await expect(fund()).to.be.revertedWithCustomError(escrow, "AlreadyFunded");
  });

  it("allows only the winner to deposit a native performance bond", async function () {
    await expect(depositBond())
      .to.emit(escrow, "PerformanceBondDeposited")
      .withArgs(tenderId, accounts[1].address, bondAmount);
    expect((await escrow.tenderFunds(tenderId)).remainingBond).to.equal(bondAmount);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(bondAmount);
    await expect(escrow.connect(accounts[2]).depositPerformanceBond(tenderId, { value: bondAmount }))
      .to.be.revertedWithCustomError(escrow, "NotWinner");
  });

  it("rejects a second performance bond deposit", async function () {
    await depositBond();
    await expect(depositBond()).to.be.revertedWithCustomError(escrow, "BondAlreadyDeposited");
  });

  it("creates hashed milestones and enforces the five-milestone limit", async function () {
    await fund();
    for (let index = 0; index < 5; index++) await createMilestone(procurementAmount / 5n);
    expect(await escrow.getMilestoneCount(tenderId)).to.equal(5n);
    await expect(createMilestone(1n)).to.be.revertedWithCustomError(escrow, "MilestoneLimitReached");
    const milestone = await escrow.getMilestone(tenderId, 0n);
    expect(milestone.descriptionHash).to.equal(milestoneHash);
    expect(milestone.paymentAmount).to.equal(procurementAmount / 5n);
    expect(milestone.completed).to.equal(false);
    expect(milestone.paid).to.equal(false);
  });

  it("prevents milestones from allocating more than escrowed funds", async function () {
    await fund();
    await expect(createMilestone(procurementAmount + 1n))
      .to.be.revertedWithCustomError(escrow, "InsufficientEscrow");
  });

  it("restricts funding, milestone creation, completion, and penalties to authority", async function () {
    await expect(escrow.connect(accounts[2]).fundTender(tenderId, { value: procurementAmount }))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    await fund();
    const block = await ethers.provider.getBlock("latest");
    await expect(escrow.connect(accounts[2]).createMilestone(tenderId, milestoneHash, 1n, block!.timestamp + 100))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    await createMilestone();
    await expect(escrow.connect(accounts[2]).completeMilestone(tenderId, 0n))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    await depositBond();
    await expect(escrow.connect(accounts[2]).penalizePerformanceBond(tenderId, 1n))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
  });

  it("requires authority completion before releasing milestone payment", async function () {
    await fund();
    await createMilestone();
    await expect(escrow.releaseMilestonePayment(tenderId, 0n))
      .to.be.revertedWithCustomError(escrow, "MilestoneNotCompleted");
    await escrow.completeMilestone(tenderId, 0n);
    const supplier = await registry.getSupplier(accounts[1].address);
    expect(supplier.milestonesCompleted).to.equal(1n);
    expect(supplier.onTimeCompletions).to.equal(1n);
  });

  it("releases completed milestone payments once and updates supplier completion", async function () {
    await fund();
    await createMilestone();
    await escrow.completeMilestone(tenderId, 0n);
    const balanceBefore = await ethers.provider.getBalance(accounts[1].address);
    await expect(escrow.connect(accounts[8]).releaseMilestonePayment(tenderId, 0n))
      .to.emit(escrow, "MilestonePaymentReleased")
      .withArgs(tenderId, 0n, accounts[1].address, procurementAmount);
    const balanceAfter = await ethers.provider.getBalance(accounts[1].address);
    expect(balanceAfter - balanceBefore).to.equal(procurementAmount);
    expect((await escrow.getMilestone(tenderId, 0n)).paid).to.equal(true);
    expect((await registry.getSupplier(accounts[1].address)).contractsCompleted).to.equal(1n);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    await expect(escrow.releaseMilestonePayment(tenderId, 0n))
      .to.be.revertedWithCustomError(escrow, "MilestoneAlreadyPaid");
  });

  it("returns the bond only after every milestone is completed and paid", async function () {
    await fund();
    await depositBond();
    await createMilestone();
    await expect(escrow.releasePerformanceBond(tenderId))
      .to.be.revertedWithCustomError(escrow, "ContractNotCompleted");
    await escrow.completeMilestone(tenderId, 0n);
    await escrow.releaseMilestonePayment(tenderId, 0n);
    const balanceBefore = await ethers.provider.getBalance(accounts[1].address);
    await expect(escrow.releasePerformanceBond(tenderId))
      .to.emit(escrow, "PerformanceBondReleased")
      .withArgs(tenderId, accounts[1].address, bondAmount);
    expect(await ethers.provider.getBalance(accounts[1].address) - balanceBefore).to.equal(bondAmount);
    expect((await escrow.tenderFunds(tenderId)).bondReleased).to.equal(true);
    await expect(escrow.releasePerformanceBond(tenderId)).to.be.revertedWithCustomError(escrow, "BondUnavailable");
  });

  it("applies bond penalties, transfers native value to the authority, and updates reputation", async function () {
    await depositBond();
    const penalty = ethers.parseEther("0.05");
    await expect(escrow.penalizePerformanceBond(tenderId, penalty))
      .to.emit(escrow, "PerformanceBondPenalized")
      .withArgs(tenderId, accounts[1].address, penalty);
    expect((await escrow.tenderFunds(tenderId)).remainingBond).to.equal(bondAmount - penalty);
    expect((await registry.getSupplier(accounts[1].address)).performanceBondLosses).to.equal(penalty);
  });

  it("does not allow bond penalties above the remaining bond", async function () {
    await depositBond();
    await expect(escrow.penalizePerformanceBond(tenderId, bondAmount + 1n))
      .to.be.revertedWithCustomError(escrow, "PenaltyExceedsBond");
  });

  it("records failed milestones and supplier contract failures", async function () {
    await fund();
    await createMilestone();
    const milestone = await escrow.getMilestone(tenderId, 0n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(escrow.failMilestone(tenderId, 0n))
      .to.emit(escrow, "MilestoneFailed")
      .withArgs(tenderId, 0n);
    const supplier = await registry.getSupplier(accounts[1].address);
    expect(supplier.milestonesFailed).to.equal(1n);
    expect(supplier.contractsFailed).to.equal(1n);
    await expect(escrow.refundUnusedEscrow(tenderId))
      .to.emit(escrow, "UnusedEscrowRefunded")
      .withArgs(tenderId, accounts[0].address, procurementAmount);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
  });

  it("refunds unused escrow to the authority after all scheduled milestones are paid", async function () {
    await fund();
    const partial = procurementAmount / 2n;
    await createMilestone(partial);
    await escrow.completeMilestone(tenderId, 0n);
    await escrow.releaseMilestonePayment(tenderId, 0n);
    await expect(escrow.connect(accounts[2]).refundUnusedEscrow(tenderId))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    const before = await ethers.provider.getBalance(accounts[0].address);
    await expect(escrow.refundUnusedEscrow(tenderId))
      .to.emit(escrow, "UnusedEscrowRefunded")
      .withArgs(tenderId, accounts[0].address, partial);
    const after = await ethers.provider.getBalance(accounts[0].address);
    expect(after).to.be.greaterThan(before - ethers.parseEther("0.01"));
    expect((await escrow.tenderFunds(tenderId)).remainingEscrow).to.equal(0n);
  });

  it("blocks reentrant milestone withdrawals from a supplier receiver", async function () {
    const attacker = await ethers.deployContract("ReentrantBidder");
    const attackerAddress = await attacker.getAddress();
    await registry.registerSupplier(
      attackerAddress,
      ethers.keccak256(ethers.toUtf8Bytes("reentrant supplier")),
      ethers.keccak256(ethers.toUtf8Bytes("construction")),
      1n,
      ethers.ZeroHash,
    );

    const block = await ethers.provider.getBlock("latest");
    const secondBidDeadline = block!.timestamp + 300;
    const secondRevealDeadline = secondBidDeadline + 300;
    const secondTenderId = 2n;
    const amount = ethers.parseEther("0.5");
    const secret = ethers.id("reentrant bid");
    const commitment = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "bytes32"],
      [secondTenderId, attackerAddress, amount, secret],
    );
    await tenderGuard.createTender("Reentrant tender", ethers.parseEther("1"), secondBidDeadline, secondRevealDeadline, 0n);
    await attacker.submitBid(await tenderGuard.getAddress(), secondTenderId, commitment);
    await ethers.provider.send("evm_setNextBlockTimestamp", [secondBidDeadline]);
    await ethers.provider.send("evm_mine", []);
    await attacker.reveal(await tenderGuard.getAddress(), secondTenderId, amount, secret);
    await tenderGuard.recordBidRisk(secondTenderId, attackerAddress, 0n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [secondRevealDeadline + 1]);
    await ethers.provider.send("evm_mine", []);
    await tenderGuard.makeAwardable(secondTenderId);
    await tenderGuard.awardTender(secondTenderId);

    await escrow.fundTender(secondTenderId, { value: amount });
    const latest = await ethers.provider.getBlock("latest");
    const deadline = latest!.timestamp + 3600;
    await escrow.createMilestone(secondTenderId, milestoneHash, amount, deadline);
    await escrow.completeMilestone(secondTenderId, 0n);
    await attacker.setReentryTarget(await escrow.getAddress(), secondTenderId, 0n);
    await escrow.releaseMilestonePayment(secondTenderId, 0n);
    expect(await attacker.reentryAttempted()).to.equal(true);
    expect(await attacker.reentryBlocked()).to.equal(true);
    expect(await ethers.provider.getBalance(attackerAddress)).to.equal(amount);
  });
});
