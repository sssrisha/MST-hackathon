// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TenderGuard
 * @notice Core contract for the TenderGuard hackathon MVP.
 * It manages the full tender lifecycle, sealed‑bid commitments/reveals,
 * AI risk scores, freezing, and award logic.
 *
 * The commitment hash matches the Python `commitment_hash` helper:
 *   keccak256(abi.encodePacked(tenderId, bidder, amount, nonce))
 * where `nonce` is a 32‑byte value.
 */
contract TenderGuard is AccessControl {
    using Counters for Counters.Counter;

    // -------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    // -------------------------------------------------------------------
    // Tender lifecycle enum
    // -------------------------------------------------------------------
    enum Status {
        DRAFT,
        PUBLISHED,
        BIDDING_CLOSED,
        REVEALING,
        REVIEW,
        AWARDABLE,
        AWARDED,
        FROZEN
    }

    // -------------------------------------------------------------------
    // Tender data structure
    // -------------------------------------------------------------------
    struct Tender {
        uint256 id;
        address issuer;
        bytes32 metadataHash; // off‑chain tender data hash
        uint256 budget; // in smallest token unit
        uint256 submissionDeadline; // block timestamp
        uint256 revealDeadline; // block timestamp
        uint8 preRiskScore; // 0‑100
        bytes32 preRiskReportHash;
        uint8 postRiskScore; // 0‑100
        bytes32 postRiskReportHash;
        Status status;
        address winner;
        uint256 winningAmount;
        bytes32 decisionProofHash;
    }

    // -------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------
    Counters.Counter private _tenderIds;
    mapping(uint256 => Tender) private tenders;
    // tenderId => bidder => commitment hash
    mapping(uint256 => mapping(address => bytes32)) public commitments;
    // tenderId => bidder => revealed amount
    mapping(uint256 => mapping(address => uint256)) public revealedBids;
    // tenderId => list of bidders (to enable iteration for award selection)
    mapping(uint256 => address[]) public bidderList;

    // -------------------------------------------------------------------
    // Events (one per state‑changing action)
    // -------------------------------------------------------------------
    event TenderCreated(uint256 indexed tenderId, address indexed issuer, bytes32 metadataHash);
    event PreTenderRiskRecorded(uint256 indexed tenderId, uint8 score, bytes32 reportHash);
    event TenderPublished(uint256 indexed tenderId);
    event BidCommitted(uint256 indexed tenderId, address indexed bidder, bytes32 commitment);
    event BidRevealed(uint256 indexed tenderId, address indexed bidder, uint256 amount);
    event PostRiskRecorded(uint256 indexed tenderId, uint8 score, bytes32 reportHash);
    event TenderFrozen(uint256 indexed tenderId);
    event TenderMadeAwardable(uint256 indexed tenderId);
    event TenderAwarded(uint256 indexed tenderId, address indexed winner, uint256 amount);
    event DecisionProofRecorded(uint256 indexed tenderId, bytes32 proofHash);

    // -------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------
    modifier onlyIssuer() {
        require(hasRole(ISSUER_ROLE, msg.sender), "Caller is not an issuer");
        _;
    }
    modifier onlyReviewer() {
        require(hasRole(REVIEWER_ROLE, msg.sender), "Caller is not a reviewer");
        _;
    }
    modifier validStatus(uint256 tenderId, Status required) {
        require(tenders[tenderId].status == required, "Invalid tender status");
        _;
    }
    modifier scoreWithinRange(uint8 score) {
        require(score <= 100, "Score must be 0-100");
        _;
    }

    // -------------------------------------------------------------------
    // Constructor – grant admin role to deployer
    // -------------------------------------------------------------------
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -------------------------------------------------------------------
    // 1️⃣ Tender lifecycle management
    // -------------------------------------------------------------------
    function createTender(
        bytes32 metadataHash,
        uint256 budget,
        uint256 submissionDeadline,
        uint256 revealDeadline
    ) external onlyIssuer returns (uint256) {
        require(budget > 0, "Budget must be > 0");
        require(submissionDeadline > block.timestamp, "Submission deadline in past");
        require(revealDeadline > submissionDeadline, "Reveal deadline must be after submission");

        _tenderIds.increment();
        uint256 tenderId = _tenderIds.current();
        Tender storage t = tenders[tenderId];
        t.id = tenderId;
        t.issuer = msg.sender;
        t.metadataHash = metadataHash;
        t.budget = budget;
        t.submissionDeadline = submissionDeadline;
        t.revealDeadline = revealDeadline;
        t.preRiskScore = 0;
        t.preRiskReportHash = 0x0;
        t.postRiskScore = 0;
        t.postRiskReportHash = 0x0;
        t.status = Status.DRAFT;
        t.winner = address(0);
        t.winningAmount = 0;
        t.decisionProofHash = 0x0;

        emit TenderCreated(tenderId, msg.sender, metadataHash);
        return tenderId;
    }

    function recordPreTenderRisk(uint256 tenderId, uint8 score, bytes32 reportHash)
        external
        onlyIssuer
        scoreWithinRange(score)
        validStatus(tenderId, Status.DRAFT)
    {
        Tender storage t = tenders[tenderId];
        t.preRiskScore = score;
        t.preRiskReportHash = reportHash;
        emit PreTenderRiskRecorded(tenderId, score, reportHash);
    }

    function publishTender(uint256 tenderId)
        external
        onlyIssuer
        validStatus(tenderId, Status.DRAFT)
    {
        Tender storage t = tenders[tenderId];
        t.status = Status.PUBLISHED;
        emit TenderPublished(tenderId);
    }

    // -------------------------------------------------------------------
    // 2️⃣ Bidding – sealed commitments & reveals
    // -------------------------------------------------------------------
    function commitBid(uint256 tenderId, bytes32 commitment)
        external
        validStatus(tenderId, Status.PUBLISHED)
    {
        Tender storage t = tenders[tenderId];
        require(block.timestamp <= t.submissionDeadline, "Commit phase ended");
        require(commitments[tenderId][msg.sender] == 0x0, "Already committed");
        commitments[tenderId][msg.sender] = commitment;
        bidderList[tenderId].push(msg.sender);
        emit BidCommitted(tenderId, msg.sender, commitment);
    }

    function revealBid(uint256 tenderId, uint256 amount, bytes32 nonce) external {
        Tender storage t = tenders[tenderId];
        require(block.timestamp > t.submissionDeadline, "Reveal phase not started");
        require(block.timestamp <= t.revealDeadline, "Reveal deadline passed");
        bytes32 stored = commitments[tenderId][msg.sender];
        require(stored != 0x0, "No commitment found");
        // Re‑create hash with the exact Solidity encoding
        bytes32 computed = keccak256(abi.encodePacked(tenderId, msg.sender, amount, nonce));
        require(computed == stored, "Commitment mismatch");
        revealedBids[tenderId][msg.sender] = amount;
        emit BidRevealed(tenderId, msg.sender, amount);
    }

    // -------------------------------------------------------------------
    // 3️⃣ Post‑reveal AI risk recording
    // -------------------------------------------------------------------
    function recordAIRisk(uint256 tenderId, uint8 score, bytes32 reportHash)
        external
        onlyIssuer
        scoreWithinRange(score)
    {
        Tender storage t = tenders[tenderId];
        require(block.timestamp >= t.revealDeadline, "Can record risk only after reveal deadline");
        t.postRiskScore = score;
        t.postRiskReportHash = reportHash;
        emit PostRiskRecorded(tenderId, score, reportHash);
    }

    // -------------------------------------------------------------------
    // 4️⃣ Freeze / human review workflow
    // -------------------------------------------------------------------
    function freezeTender(uint256 tenderId) external onlyReviewer {
        Tender storage t = tenders[tenderId];
        require(t.status != Status.AWARDED && t.status != Status.FROZEN, "Cannot freeze finalised tender");
        t.status = Status.FROZEN;
        emit TenderFrozen(tenderId);
    }

    // -------------------------------------------------------------------
    // 5️⃣ Award workflow – selects the lowest valid revealed bid
    // -------------------------------------------------------------------
    function makeAwardable(uint256 tenderId) external onlyIssuer {
        Tender storage t = tenders[tenderId];
        require(t.status != Status.FROZEN, "Tender is frozen");
        require(block.timestamp > t.revealDeadline, "Reveal phase not finished");

        (address lowestBidder, uint256 lowestAmount) = _findLowestBid(tenderId);
        require(lowestBidder != address(0), "No valid revealed bids");

        t.winner = lowestBidder;
        t.winningAmount = lowestAmount;
        t.status = Status.AWARDABLE;
        emit TenderMadeAwardable(tenderId);
    }

    function awardTender(uint256 tenderId, address winner, uint256 amount)
        external
        onlyIssuer
        validStatus(tenderId, Status.AWARDABLE)
    {
        Tender storage t = tenders[tenderId];
        require(winner == t.winner && amount == t.winningAmount, "Winner/amount mismatch");
        t.status = Status.AWARDED;
        emit TenderAwarded(tenderId, winner, amount);
    }

    // -------------------------------------------------------------------
    // 6️⃣ Record decision proof (hash of off‑chain award justification)
    // -------------------------------------------------------------------
    function recordDecisionProof(uint256 tenderId, bytes32 proofHash)
        external
        onlyIssuer
        validStatus(tenderId, Status.AWARDED)
    {
        Tender storage t = tenders[tenderId];
        t.decisionProofHash = proofHash;
        emit DecisionProofRecorded(tenderId, proofHash);
    }

    // -------------------------------------------------------------------
    // Helper to find the lowest valid revealed bid
    // -------------------------------------------------------------------
    function _findLowestBid(uint256 tenderId) internal view returns (address lowestBidder, uint256 lowestAmount) {
        address[] storage bidders = bidderList[tenderId];
        uint256 len = bidders.length;
        lowestBidder = address(0);
        lowestAmount = type(uint256).max;
        for (uint256 i = 0; i < len; i++) {
            address b = bidders[i];
            uint256 amount = revealedBids[tenderId][b];
            if (amount > 0 && amount < lowestAmount) {
                lowestAmount = amount;
                lowestBidder = b;
            }
        }
    }

    function _computeCommitmentHash(uint256 tenderId, address bidder, uint256 amount, bytes32 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(tenderId, bidder, amount, nonce));
    }



}
