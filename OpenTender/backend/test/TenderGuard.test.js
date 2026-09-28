const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * TenderGuard Hardhat test suite
 * Covers:
 *   - Role assignment & access control
 *   - Tender lifecycle (create, pre‑risk, publish)
 *   - Sealed‑bid commit / reveal with commitment hash parity
 *   - Post‑reveal AI risk recording
 *   - Award selection (lowest valid bid) and awarding
 *   - Decision proof recording
 *   - Freeze workflow (reviewer role)
 */

describe('TenderGuard', function () {
  let TenderGuard, tenderGuard;
  let owner, issuer, bidder1, bidder2, reviewer, other;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Helper to compute commitment hash identical to contract logic
  function commitmentHash(tenderId, bidder, amount, nonce) {
    return ethers.utils.solidityKeccak256(
      ['uint256', 'address', 'uint256', 'bytes32'],
      [tenderId, bidder, amount, nonce]
    );
  }

  beforeEach(async function () {
    [owner, issuer, bidder1, bidder2, reviewer, other] = await ethers.getSigners();
    // Deploy contract (owner is the deployer and admin)
    TenderGuard = await ethers.getContractFactory('TenderGuard');
    tenderGuard = await TenderGuard.deploy();
    

    // Grant ISSUER_ROLE to issuer address (owner already admin)
    const ISSUER_ROLE = await tenderGuard.ISSUER_ROLE();
    const REVIEWER_ROLE = await tenderGuard.REVIEWER_ROLE();
    await tenderGuard.grantRole(ISSUER_ROLE, issuer.address);
    await tenderGuard.grantRole(REVIEWER_ROLE, reviewer.address);
  });

  it('should allow issuer to create tender and progress through lifecycle', async function () {
    // 1️⃣ Create tender (issuer)
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('10'); // 10 ETH equivalent
    const block = await ethers.provider.getBlock('latest');
    const now = block.timestamp;
    const submissionDeadline = now + 3600; // 1 hour later
    const revealDeadline = now + 7200; // 2 hours later

    // createTender returns tenderId
    const txCreate = await tenderGuard
      .connect(issuer)
      .createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await txCreate.wait();
    const tenderId = receipt.events[0].args.tenderId;

    // Verify tender stored correctly
    const t = await tenderGuard.tenders(tenderId);
    expect(t.issuer).to.equal(issuer.address);
    expect(t.budget).to.equal(budget);
    expect(t.status).to.equal(0); // DRAFT enum index

    // 2️⃣ Record pre‑risk
    await expect(
      tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 42, ethers.encodeBytes32String('pre'))
    )
      .to.emit(tenderGuard, 'PreTenderRiskRecorded')
      .withArgs(tenderId, 42, ethers.encodeBytes32String('pre'));

    // 3️⃣ Publish tender
    await expect(tenderGuard.connect(issuer).publishTender(tenderId))
      .to.emit(tenderGuard, 'TenderPublished')
      .withArgs(tenderId);

    // status should be PUBLISHED (index 2)
    const tAfterPublish = await tenderGuard.tenders(tenderId);
    expect(tAfterPublish.status).to.equal(2);

    // 4️⃣ Commit bids from two bidders
    const amount1 = ethers.parseEther('5'); // 5 ETH
    const amount2 = ethers.parseEther('4'); // 4 ETH (lower)
    const nonce1 = ethers.encodeBytes32String('nonce1');
    const nonce2 = ethers.encodeBytes32String('nonce2');
    const commitment1 = commitmentHash(tenderId, bidder1.address, amount1, nonce1);
    const commitment2 = commitmentHash(tenderId, bidder2.address, amount2, nonce2);

    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, commitment1))
      .to.emit(tenderGuard, 'BidCommitted')
      .withArgs(tenderId, bidder1.address, commitment1);
    await expect(tenderGuard.connect(bidder2).commitBid(tenderId, commitment2))
      .to.emit(tenderGuard, 'BidCommitted')
      .withArgs(tenderId, bidder2.address, commitment2);

    // 5️⃣ Fast‑forward time to after submission deadline for reveal phase
    await ethers.provider.send('evm_increaseTime', [3600 + 1]); // +1 second
    await ethers.provider.send('evm_mine');

    // Reveal bids
    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount1, nonce1))
      .to.emit(tenderGuard, 'BidRevealed')
      .withArgs(tenderId, bidder1.address, amount1);
    await expect(tenderGuard.connect(bidder2).revealBid(tenderId, amount2, nonce2))
      .to.emit(tenderGuard, 'BidRevealed')
      .withArgs(tenderId, bidder2.address, amount2);

    // 6️⃣ Fast‑forward to after reveal deadline for AI risk recording
    await ethers.provider.send('evm_increaseTime', [3600 + 1]); // another hour
    await ethers.provider.send('evm_mine');

    await expect(
      tenderGuard
        .connect(issuer)
        .recordAIRisk(tenderId, 85, ethers.encodeBytes32String('post'))
    )
      .to.emit(tenderGuard, 'PostRiskRecorded')
      .withArgs(tenderId, 85, ethers.encodeBytes32String('post'));

    // 7️⃣ Make awardable (issuer) – should select bidder2 (lower amount)
    await expect(tenderGuard.connect(issuer).makeAwardable(tenderId))
      .to.emit(tenderGuard, 'TenderMadeAwardable')
      .withArgs(tenderId);

    const tAwardable = await tenderGuard.tenders(tenderId);
    expect(tAwardable.winner).to.equal(bidder2.address);
    expect(tAwardable.winningAmount).to.equal(amount2);
    expect(tAwardable.status).to.equal(6); // AWARDABLE index

    // 8️⃣ Award tender (issuer)
    await expect(
      tenderGuard.connect(issuer).awardTender(tenderId, bidder2.address, amount2)
    )
      .to.emit(tenderGuard, 'TenderAwarded')
      .withArgs(tenderId, bidder2.address, amount2);

    const tAwarded = await tenderGuard.tenders(tenderId);
    expect(tAwarded.status).to.equal(7); // AWARDED

    // 9️⃣ Record decision proof
    await expect(
      tenderGuard
        .connect(issuer)
        .recordDecisionProof(tenderId, ethers.encodeBytes32String('proof'))
    )
      .to.emit(tenderGuard, 'DecisionProofRecorded')
      .withArgs(tenderId, ethers.encodeBytes32String('proof'));
  });

  it('should enforce access control and status checks', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const block = await ethers.provider.getBlock('latest');
    const now = block.timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;

    // Non‑issuer cannot create tender
    await expect(
      tenderGuard.connect(other).createTender(metadataHash, budget, submissionDeadline, revealDeadline)
    ).to.be.revertedWith('Caller is not an issuer');

    // Issuer creates tender successfully
    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;

    // Publisher cannot record pre‑risk before draft (still draft, ok) – but non‑issuer cannot
    await expect(
      tenderGuard.connect(other).recordPreTenderRisk(tenderId, 10, ethers.encodeBytes32String('pre'))
    ).to.be.revertedWith('Caller is not an issuer');

    // Issuer records pre‑risk and publishes
    await tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 10, ethers.encodeBytes32String('pre'));
    await tenderGuard.connect(issuer).publishTender(tenderId);

    // Commit bid after publish succeeds
    const amount = ethers.parseEther('1');
    const nonce = ethers.encodeBytes32String('n');
    const commitment = commitmentHash(tenderId, bidder1.address, amount, nonce);
    await tenderGuard.connect(bidder1).commitBid(tenderId, commitment);

    // Attempt to reveal before submission deadline should revert
    await expect(
      tenderGuard.connect(bidder1).revealBid(tenderId, amount, nonce)
    ).to.be.revertedWith('Reveal phase not started');

    // Advance time beyond submission deadline but before reveal deadline
    await ethers.provider.send('evm_increaseTime', [1100]);
    await ethers.provider.send('evm_mine');

    // Wrong commitment should revert
    const wrongCommit = commitmentHash(tenderId, bidder1.address, amount + 1n, nonce); // unchanged
    await expect(
      tenderGuard.connect(bidder1).revealBid(tenderId, amount.add(1), nonce)
    ).to.be.revertedWith('Commitment mismatch');

    // Correct reveal succeeds
    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, nonce))
      .to.emit(tenderGuard, 'BidRevealed')
      .withArgs(tenderId, bidder1.address, amount);
  });

  it('reviewer can freeze a tender', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const block = await ethers.provider.getBlock('latest');
    const now = block.timestamp;
    const submissionDeadline = now + 1000;
    const revealDeadline = now + 2000;

    const tx = await tenderGuard.connect(issuer).createTender(metadataHash, budget, submissionDeadline, revealDeadline);
    const receipt = await tx.wait();
    const tenderId = receipt.events[0].args.tenderId;
    await tenderGuard.connect(issuer).publishTender(tenderId);

    await expect(tenderGuard.connect(reviewer).freezeTender(tenderId))
      .to.emit(tenderGuard, 'TenderFrozen')
      .withArgs(tenderId);

    const t = await tenderGuard.tenders(tenderId);
    expect(t.status).to.equal(8); // FROZEN enum index
  });
});
