import { expect } from "chai";
import type { Contract } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("SupplierRegistry", function () {
  let registry: Contract;
  let accounts: Awaited<ReturnType<typeof ethers.getSigners>>;
  let supplierIdHash: string;
  let categoryHash: string;
  let documentHash: string;

  async function register(supplier = accounts[1]) {
    return registry.registerSupplier(
      supplier.address,
      supplierIdHash,
      categoryHash,
      8n,
      documentHash,
    );
  }

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    registry = await ethers.deployContract("SupplierRegistry");
    supplierIdHash = ethers.keccak256(ethers.toUtf8Bytes("supplier-id"));
    categoryHash = ethers.keccak256(ethers.toUtf8Bytes("civil works"));
    documentHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain documents"));
  });

  it("allows the administrator to register a supplier", async function () {
    await expect(register())
      .to.emit(registry, "SupplierRegistered")
      .withArgs(accounts[1].address, supplierIdHash);
    expect(await registry.isSupplierRegistered(accounts[1].address)).to.equal(true);
  });

  it("rejects duplicate supplier registration", async function () {
    await register();
    await expect(register()).to.be.revertedWithCustomError(registry, "SupplierAlreadyRegistered");
  });

  it("rejects unauthorized registration", async function () {
    await expect(registry.connect(accounts[2]).registerSupplier(
      accounts[1].address,
      supplierIdHash,
      categoryHash,
      8n,
      documentHash,
    )).to.be.revertedWithCustomError(registry, "Unauthorized");
  });

  it("returns procurement fields and only the document fingerprint", async function () {
    await register();
    const supplier = await registry.getSupplier(accounts[1].address);
    expect(supplier.supplierIdHash).to.equal(supplierIdHash);
    expect(supplier.categoryHash).to.equal(categoryHash);
    expect(supplier.yearsExperience).to.equal(8n);
    expect(supplier.documentHash).to.equal(documentHash);
    expect(supplier.active).to.equal(true);
    expect(supplier.reputationScore).to.equal(50n);
    expect(supplier.contractsCompleted).to.equal(0n);
    expect(supplier.registered).to.equal(true);
  });

  it("restricts performance updates to the owner or authorized contracts", async function () {
    await register();
    await expect(registry.connect(accounts[2]).recordContractCompleted(accounts[1].address))
      .to.be.revertedWithCustomError(registry, "Unauthorized");
    await registry.setAuthorizedContract(accounts[4].address, true);
    await expect(registry.connect(accounts[4]).recordContractCompleted(accounts[1].address))
      .to.emit(registry, "SupplierContractCompleted");
    expect((await registry.getSupplier(accounts[1].address)).contractsCompleted).to.equal(1n);
  });

  it("updates reputation deterministically from performance and bond-loss records", async function () {
    await register();
    await registry.recordContractWon(accounts[1].address, ethers.parseEther("1"));
    await registry.recordSuccessfulMilestone(accounts[1].address, true);
    await registry.recordContractCompleted(accounts[1].address);
    const improved = await registry.getSupplier(accounts[1].address);
    expect(improved.reputationScore).to.equal(100n);
    expect(improved.performanceScore).to.equal(100n);

    await expect(registry.recordFailedMilestone(accounts[1].address))
      .to.emit(registry, "SupplierReputationUpdated");
    const afterFailure = await registry.getSupplier(accounts[1].address);
    expect(afterFailure.milestonesFailed).to.equal(1n);
    expect(afterFailure.reputationScore).to.be.lessThan(improved.reputationScore);

    await expect(registry.recordBondPenalty(accounts[1].address, ethers.parseEther("0.5")))
      .to.emit(registry, "SupplierBondPenalty")
      .withArgs(accounts[1].address, ethers.parseEther("0.5"));
    const afterPenalty = await registry.getSupplier(accounts[1].address);
    expect(afterPenalty.performanceBondLosses).to.equal(ethers.parseEther("0.5"));
    expect(afterPenalty.reputationScore).to.be.lessThan(afterFailure.reputationScore);
  });

  it("supports inactive supplier state without erasing profile data", async function () {
    await register();
    await registry.setSupplierActive(accounts[1].address, false);
    expect(await registry.isSupplierRegistered(accounts[1].address)).to.equal(false);
    expect((await registry.getSupplier(accounts[1].address)).registered).to.equal(true);
    await expect(registry.getSupplier(accounts[2].address))
      .to.be.revertedWithCustomError(registry, "SupplierNotRegistered");
  });
});
