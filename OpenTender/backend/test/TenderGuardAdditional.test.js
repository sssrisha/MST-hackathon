// Additional test suite for TenderGuard covering missing edge cases
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TenderGuard Additional Tests', function () {
  let TenderGuard, tenderGuard;
  let owner, issuer, bidder1, bidder2, reviewer, other;

  // Helper to compute commitment hash identical to contract logic
  function commitmentHash(tenderId, bidder, amount, nonce) {
    return ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256', 'bytes32'],
      [tenderId, bidder, amount, nonce]
    );
  }

  beforeEach(async function () {
    [owner, issuer, bidder1, bidder2, reviewer, other] = await ethers.getSigners();
    TenderGuard = await ethers.getContractFactory('TenderGuard');
    tenderGuard = await TenderGuard.deploy();
    
    const ISSUER_ROLE = await tenderGuard.ISSUER_ROLE();
    const REVIEWER_ROLE = await tenderGuard.REVIEWER_ROLE();
    await tenderGuard.grantRole(ISSUER_ROLE, issuer.address);
    await tenderGuard.grantRole(REVIEWER_ROLE, reviewer.address);
  });

  it('should enforce role assignment restrictions (only admin can grant roles)', async function () {
    const ISSUER_ROLE = await tenderGuard.ISSUER_ROLE();
    await expect(
      tenderGuard.connect(other).grantRole(ISSUER_ROLE, other.address)
    ).to.be.revertedWith(/AccessControl/);
  });

  it('should prevent duplicate bid commitments from same bidder', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;
    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;
    await tenderGuard.connect(issuer).publishTender(tenderId);
    const amount = ethers.parseEther('1');
    const nonce = ethers.encodeBytes32String('n');
    const commitment = commitmentHash(tenderId, bidder1.address, amount, nonce);
    await tenderGuard.connect(bidder1).commitBid(tenderId, commitment);
    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, commitment)).to.be.revertedWith('Already committed');
  });

  it('should enforce status checks for lifecycle functions', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;
    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;

    // commitBid before publish -> Invalid tender status
    const amount = ethers.parseEther('1');
    const nonce = ethers.encodeBytes32String('n');
    const commitment = commitmentHash(tenderId, bidder1.address, amount, nonce);
    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, commitment)).to.be.revertedWith('Invalid tender status');

    // publishTender twice -> second call should revert Invalid tender status
    await tenderGuard.connect(issuer).publishTender(tenderId);
    await expect(tenderGuard.connect(issuer).publishTender(tenderId)).to.be.revertedWith('Invalid tender status');

    // recordPreTenderRisk after publish -> Invalid tender status
    await expect(
      tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 10, ethers.encodeBytes32String('pre'))
    ).to.be.revertedWith('Invalid tender status');

    // recordAIRisk before reveal deadline -> should revert with specific message
    await expect(
      tenderGuard.connect(issuer).recordAIRisk(tenderId, 50, ethers.encodeBytes32String('post'))
    ).to.be.revertedWith('Can record risk only after reveal deadline');

    // makeAwardable before reveal deadline -> revert
    await expect(tenderGuard.connect(issuer).makeAwardable(tenderId)).to.be.revertedWith('Reveal phase not finished');

    // awardTender before awardable -> revert
    await expect(
      tenderGuard.connect(issuer).awardTender(tenderId, bidder1.address, amount)
    ).to.be.revertedWith('Invalid tender status');
  });

  it('should enforce reviewer role for freezeTender and prevent freezing after award', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;
    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;
    await tenderGuard.connect(issuer).publishTender(tenderId);
    // Non‑reviewer cannot freeze
    await expect(tenderGuard.connect(other).freezeTender(tenderId)).to.be.revertedWith('Caller is not a reviewer');
    // Freeze works for reviewer
    await tenderGuard.connect(reviewer).freezeTender(tenderId);
    const tFrozen = await tenderGuard.tenders(tenderId);
    expect(tFrozen.status).to.equal(8); // FROZEN
    // After freezing, attempt to award should fail (status not AWARDABLE)
    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder1.address, 0)).to.be.revertedWith('Invalid tender status');
  });

  it('should reject decisionProof recording before tender is awarded', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;
    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;
    await expect(
      tenderGuard.connect(issuer).recordDecisionProof(tenderId, ethers.encodeBytes32String('proof'))
    ).to.be.revertedWith('Invalid tender status');
  });
});
