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

  async function parseTenderId(receipt) {
    const event = receipt.logs
      .map((log) => {
        try {
          return tenderGuard.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsedLog) => parsedLog?.name === 'TenderCreated');
    return event.args.tenderId;
  }

  async function createTender() {
    const latestBlock = await ethers.provider.getBlock('latest');
    const submissionDeadline = latestBlock.timestamp + 600;
    const revealDeadline = latestBlock.timestamp + 1200;
    const receipt = await (
      await tenderGuard.connect(issuer).createTender(
        ethers.encodeBytes32String('meta'),
        ethers.parseEther('10'),
        submissionDeadline,
        revealDeadline
      )
    ).wait();
    return {
      tenderId: await parseTenderId(receipt),
      submissionDeadline,
      revealDeadline,
    };
  }

  async function createPublishedTender() {
    const tender = await createTender();
    await tenderGuard.connect(issuer).publishTender(tender.tenderId);
    return tender;
  }

  async function setNextTimestamp(timestamp) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
    await ethers.provider.send('evm_mine', []);
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

  it('initializes the deployer as admin and leaves business roles unassigned', async function () {
    const adminRole = await tenderGuard.DEFAULT_ADMIN_ROLE();
    const issuerRole = await tenderGuard.ISSUER_ROLE();
    const reviewerRole = await tenderGuard.REVIEWER_ROLE();

    expect(await tenderGuard.hasRole(adminRole, owner.address)).to.equal(true);
    expect(await tenderGuard.hasRole(issuerRole, owner.address)).to.equal(false);
    expect(await tenderGuard.hasRole(reviewerRole, owner.address)).to.equal(false);
    expect(await tenderGuard.hasRole(issuerRole, issuer.address)).to.equal(true);
    expect(await tenderGuard.hasRole(reviewerRole, reviewer.address)).to.equal(true);
  });

  it('emits tender creation data and rejects invalid budget and deadlines', async function () {
    const latestBlock = await ethers.provider.getBlock('latest');
    const submissionDeadline = latestBlock.timestamp + 600;
    const revealDeadline = latestBlock.timestamp + 1200;
    const metadataHash = ethers.encodeBytes32String('metadata');

    await expect(
      tenderGuard.connect(issuer).createTender(
        metadataHash,
        0,
        submissionDeadline,
        revealDeadline
      )
    ).to.be.revertedWith('Budget must be > 0');
    await expect(
      tenderGuard.connect(issuer).createTender(
        metadataHash,
        1,
        latestBlock.timestamp - 1,
        revealDeadline
      )
    ).to.be.revertedWith('Submission deadline in past');
    await expect(
      tenderGuard.connect(issuer).createTender(
        metadataHash,
        1,
        submissionDeadline,
        submissionDeadline
      )
    ).to.be.revertedWith('Reveal deadline must be after submission');

    await expect(
      tenderGuard.connect(issuer).createTender(
        metadataHash,
        1,
        submissionDeadline,
        revealDeadline
      )
    )
      .to.emit(tenderGuard, 'TenderCreated')
      .withArgs(1n, issuer.address, metadataHash);
  });

  it('records pre-tender risk only for an issuer and while the tender is draft', async function () {
    const { tenderId } = await createTender();
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes('pre-tender report'));

    await expect(
      tenderGuard.connect(other).recordPreTenderRisk(tenderId, 20, reportHash)
    ).to.be.revertedWith('Caller is not an issuer');
    await expect(
      tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 101, reportHash)
    ).to.be.revertedWith('Score must be 0-100');
    await expect(
      tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 20, reportHash)
    )
      .to.emit(tenderGuard, 'PreTenderRiskRecorded')
      .withArgs(tenderId, 20, reportHash);

    await tenderGuard.connect(issuer).publishTender(tenderId);
    await expect(
      tenderGuard.connect(issuer).recordPreTenderRisk(tenderId, 21, reportHash)
    ).to.be.revertedWith('Invalid tender status');
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
    const { tenderId } = await createTender();
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
    const { tenderId } = await createTender();

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

  it('requires reviewer role to freeze and prevents awarding a frozen tender', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const { tenderId } = await createTender();
    await tenderGuard.connect(issuer).publishTender(tenderId);
    // Non‑reviewer cannot freeze
    await expect(tenderGuard.connect(other).freezeTender(tenderId)).to.be.revertedWith('Caller is not a reviewer');
    // Freeze works for reviewer
    await tenderGuard.connect(reviewer).freezeTender(tenderId);
    await expect(tenderGuard.connect(reviewer).freezeTender(tenderId))
      .to.be.revertedWith('Cannot freeze finalised tender');
    // After freezing, attempt to award should fail (status not AWARDABLE)
    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder1.address, 0)).to.be.revertedWith('Invalid tender status');
  });

  it('should reject decisionProof recording before tender is awarded', async function () {
    const metadataHash = ethers.encodeBytes32String('meta');
    const budget = ethers.parseEther('1');
    const { tenderId } = await createTender();
    await expect(
      tenderGuard.connect(issuer).recordDecisionProof(tenderId, ethers.encodeBytes32String('proof'))
    ).to.be.revertedWith('Invalid tender status');
  });

  it('checks commitment hash inputs and exposes the committed value', async function () {
    const { tenderId } = await createPublishedTender();
    const amount = ethers.parseEther('1');
    const secret = ethers.id('commitment validation secret');
    const expectedCommitment = commitmentHash(tenderId, bidder1.address, amount, secret);

    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, expectedCommitment))
      .to.emit(tenderGuard, 'BidCommitted')
      .withArgs(tenderId, bidder1.address, expectedCommitment);
    expect(await tenderGuard.commitments(tenderId, bidder1.address))
      .to.equal(expectedCommitment);
    expect(await tenderGuard.bidderList(tenderId, 0)).to.equal(bidder1.address);
    expect(expectedCommitment).to.equal(
      ethers.solidityPackedKeccak256(
        ['uint256', 'address', 'uint256', 'bytes32'],
        [tenderId, bidder1.address, amount, secret]
      )
    );
  });

  it('rejects commits before publication, after the deadline, and for unknown tender IDs', async function () {
    const { tenderId, submissionDeadline } = await createTender();
    const commitment = ethers.keccak256(ethers.toUtf8Bytes('commitment'));
    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, commitment))
      .to.be.revertedWith('Invalid tender status');
    await tenderGuard.connect(issuer).publishTender(tenderId);

    await setNextTimestamp(submissionDeadline + 1);
    await expect(tenderGuard.connect(bidder1).commitBid(tenderId, commitment))
      .to.be.revertedWith('Commit phase ended');
    await expect(tenderGuard.connect(bidder1).commitBid(999, commitment))
      .to.be.revertedWith('Invalid tender status');
  });

  it('reveals a matching commitment, rejects wrong preimages, and permits repeated valid reveals', async function () {
    const { tenderId, submissionDeadline } = await createPublishedTender();
    const amount = ethers.parseEther('2');
    const secret = ethers.id('correct reveal secret');
    const commitment = commitmentHash(tenderId, bidder1.address, amount, secret);
    await tenderGuard.connect(bidder1).commitBid(tenderId, commitment);
    await setNextTimestamp(submissionDeadline + 1);

    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, ethers.id('wrong secret')))
      .to.be.revertedWith('Commitment mismatch');
    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount + 1n, secret))
      .to.be.revertedWith('Commitment mismatch');
    await expect(tenderGuard.connect(bidder2).revealBid(tenderId, amount, secret))
      .to.be.revertedWith('No commitment found');

    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, secret))
      .to.emit(tenderGuard, 'BidRevealed')
      .withArgs(tenderId, bidder1.address, amount);
    expect(await tenderGuard.revealedBids(tenderId, bidder1.address)).to.equal(amount);

    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, secret))
      .to.emit(tenderGuard, 'BidRevealed')
      .withArgs(tenderId, bidder1.address, amount);
  });

  it('rejects reveals before the submission deadline and after the reveal deadline', async function () {
    const { tenderId, submissionDeadline, revealDeadline } = await createPublishedTender();
    const amount = 10n;
    const secret = ethers.id('reveal boundary secret');
    await tenderGuard.connect(bidder1).commitBid(
      tenderId,
      commitmentHash(tenderId, bidder1.address, amount, secret)
    );

    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, secret))
      .to.be.revertedWith('Reveal phase not started');
    await setNextTimestamp(revealDeadline + 1);
    await expect(tenderGuard.connect(bidder1).revealBid(tenderId, amount, secret))
      .to.be.revertedWith('Reveal deadline passed');
    await expect(tenderGuard.connect(bidder1).revealBid(999, amount, secret))
      .to.be.revertedWith('Reveal deadline passed');
    expect(submissionDeadline).to.be.lessThan(revealDeadline);
  });

  it('records post-reveal risk only after the reveal deadline', async function () {
    const { tenderId, revealDeadline } = await createTender();
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes('post-reveal report'));
    await expect(tenderGuard.connect(issuer).recordAIRisk(tenderId, 60, reportHash))
      .to.be.revertedWith('Can record risk only after reveal deadline');
    await expect(tenderGuard.connect(other).recordAIRisk(tenderId, 60, reportHash))
      .to.be.revertedWith('Caller is not an issuer');
    await expect(tenderGuard.connect(issuer).recordAIRisk(tenderId, 101, reportHash))
      .to.be.revertedWith('Score must be 0-100');

    await setNextTimestamp(revealDeadline);
    await expect(tenderGuard.connect(issuer).recordAIRisk(tenderId, 60, reportHash))
      .to.emit(tenderGuard, 'PostRiskRecorded')
      .withArgs(tenderId, 60, reportHash);
  });

  it('rejects awards without revealed bids and invalid winner or amount', async function () {
    const { tenderId, submissionDeadline, revealDeadline } = await createPublishedTender();
    const amount1 = 80n;
    const amount2 = 50n;
    const secret1 = ethers.id('award candidate one');
    const secret2 = ethers.id('award candidate two');
    await tenderGuard.connect(bidder1).commitBid(
      tenderId,
      commitmentHash(tenderId, bidder1.address, amount1, secret1)
    );
    await tenderGuard.connect(bidder2).commitBid(
      tenderId,
      commitmentHash(tenderId, bidder2.address, amount2, secret2)
    );
    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder2.address, amount2))
      .to.be.revertedWith('Invalid tender status');

    await setNextTimestamp(submissionDeadline + 1);
    await tenderGuard.connect(bidder1).revealBid(tenderId, amount1, secret1);
    await tenderGuard.connect(bidder2).revealBid(tenderId, amount2, secret2);
    await setNextTimestamp(revealDeadline + 1);
    await tenderGuard.connect(issuer).makeAwardable(tenderId);

    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder1.address, amount2))
      .to.be.revertedWith('Winner/amount mismatch');
    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder2.address, amount2 + 1n))
      .to.be.revertedWith('Winner/amount mismatch');
    await expect(tenderGuard.connect(other).awardTender(tenderId, bidder2.address, amount2))
      .to.be.revertedWith('Caller is not an issuer');

    await expect(tenderGuard.connect(issuer).awardTender(tenderId, bidder2.address, amount2))
      .to.emit(tenderGuard, 'TenderAwarded')
      .withArgs(tenderId, bidder2.address, amount2);
  });

  it('prevents freezing a tender after it has been awarded', async function () {
    const { tenderId, submissionDeadline, revealDeadline } = await createPublishedTender();
    const amount = 25n;
    const secret = ethers.id('freeze awarded tender');
    await tenderGuard.connect(bidder1).commitBid(
      tenderId,
      commitmentHash(tenderId, bidder1.address, amount, secret)
    );
    await setNextTimestamp(submissionDeadline + 1);
    await tenderGuard.connect(bidder1).revealBid(tenderId, amount, secret);
    await setNextTimestamp(revealDeadline + 1);
    await tenderGuard.connect(issuer).makeAwardable(tenderId);
    await tenderGuard.connect(issuer).awardTender(tenderId, bidder1.address, amount);

    await expect(tenderGuard.connect(reviewer).freezeTender(tenderId))
      .to.be.revertedWith('Cannot freeze finalised tender');
  });

  it('rejects invalid ABI addresses for award recipients', async function () {
    expect(() => tenderGuard.interface.encodeFunctionData('awardTender', [1n, 'not-an-address', 1n]))
      .to.throw();
  });

  it('rejects making frozen or empty-bid tenders awardable', async function () {
    const emptyTender = await createTender();
    await setNextTimestamp(emptyTender.revealDeadline + 1);
    await expect(tenderGuard.connect(issuer).makeAwardable(emptyTender.tenderId))
      .to.be.revertedWith('No valid revealed bids');

    const frozenTender = await createTender();
    await tenderGuard.connect(reviewer).freezeTender(frozenTender.tenderId);
    await setNextTimestamp(frozenTender.revealDeadline + 1);
    await expect(tenderGuard.connect(issuer).makeAwardable(frozenTender.tenderId))
      .to.be.revertedWith('Tender is frozen');
  });
});
