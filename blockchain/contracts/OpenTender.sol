// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract TenderGuard {
    enum TenderStatus {
        OPEN,
        REVEAL,
        AWARDABLE,
        FROZEN,
        AWARDED
    }

    struct Tender {
        uint256 id;
        address creator;
        string title;
        uint256 budget;
        uint256 bidDeadline;
        uint256 revealDeadline;
        uint256 deposit;
        uint256 preTenderRiskScore;
        uint256 aiRiskScore;
        bytes32 preTenderReportHash;
        bytes32 aiReportHash;
        bytes32 decisionHash;
        address winner;
        uint256 winningBid;
        TenderStatus status;
        bool exists;
    }

    struct Bid {
        address bidder;
        bytes32 commitment;
        uint256 revealedAmount;
        bool committed;
        bool revealed;
        bool valid;
    }

    error Unauthorized();
    error TenderNotFound(uint256 tenderId);
    error InvalidTitle();
    error InvalidBudget();
    error InvalidDeadline();
    error InvalidRevealDeadline();
    error InvalidRiskScore();
    error InvalidHash();
    error InvalidStatus();
    error BiddingClosed();
    error RevealNotOpen();
    error RevealClosed();
    error AlreadyCommitted();
    error NoCommitment();
    error AlreadyRevealed();
    error InvalidReveal();
    error NoValidBids();
    error InvalidBidIndex();

    address public immutable owner;
    uint256 private nextTenderId = 1;

    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => Bid[]) private tenderBids;
    mapping(uint256 => mapping(address => uint256)) private bidderBidIndexPlusOne;

    event TenderCreated(
        uint256 indexed tenderId,
        address indexed creator,
        string title,
        uint256 budget,
        uint256 bidDeadline,
        uint256 revealDeadline,
        uint256 deposit
    );
    event PreTenderRiskRecorded(uint256 indexed tenderId, uint256 riskScore, bytes32 reportHash);
    event BidCommitted(uint256 indexed tenderId, address indexed bidder, bytes32 commitment);
    event BidRevealed(uint256 indexed tenderId, address indexed bidder, uint256 amount, bool valid);
    event AIRiskRecorded(uint256 indexed tenderId, uint256 riskScore, bytes32 reportHash);
    event TenderFrozen(uint256 indexed tenderId, uint256 aiRiskScore);
    event TenderAwardable(uint256 indexed tenderId);
    event TenderAwarded(uint256 indexed tenderId, address indexed winner, uint256 winningBid);
    event DecisionProofRecorded(uint256 indexed tenderId, bytes32 decisionHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier tenderAdmin(uint256 tenderId) {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (msg.sender != owner && msg.sender != tender.creator) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createTender(
        string calldata title,
        uint256 budget,
        uint256 bidDeadline,
        uint256 revealDeadline,
        uint256 deposit
    ) external onlyOwner returns (uint256 tenderId) {
        if (bytes(title).length == 0) revert InvalidTitle();
        if (budget == 0) revert InvalidBudget();
        if (bidDeadline <= block.timestamp) revert InvalidDeadline();
        if (revealDeadline <= bidDeadline) revert InvalidRevealDeadline();

        tenderId = nextTenderId++;
        tenders[tenderId] = Tender({
            id: tenderId,
            creator: msg.sender,
            title: title,
            budget: budget,
            bidDeadline: bidDeadline,
            revealDeadline: revealDeadline,
            deposit: deposit,
            preTenderRiskScore: 0,
            aiRiskScore: 0,
            preTenderReportHash: bytes32(0),
            aiReportHash: bytes32(0),
            decisionHash: bytes32(0),
            winner: address(0),
            winningBid: 0,
            status: TenderStatus.OPEN,
            exists: true
        });

        emit TenderCreated(tenderId, msg.sender, title, budget, bidDeadline, revealDeadline, deposit);
    }

    function recordPreTenderRisk(
        uint256 tenderId,
        uint256 riskScore,
        bytes32 reportHash
    ) external tenderAdmin(tenderId) {
        if (riskScore > 100) revert InvalidRiskScore();
        if (reportHash == bytes32(0)) revert InvalidHash();

        Tender storage tender = tenders[tenderId];
        tender.preTenderRiskScore = riskScore;
        tender.preTenderReportHash = reportHash;
        emit PreTenderRiskRecorded(tenderId, riskScore, reportHash);
    }

    function commitBid(uint256 tenderId, bytes32 commitment) external {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (tender.status != TenderStatus.OPEN || block.timestamp >= tender.bidDeadline) {
            revert BiddingClosed();
        }
        if (commitment == bytes32(0)) revert InvalidHash();
        if (bidderBidIndexPlusOne[tenderId][msg.sender] != 0) revert AlreadyCommitted();

        tenderBids[tenderId].push(Bid({
            bidder: msg.sender,
            commitment: commitment,
            revealedAmount: 0,
            committed: true,
            revealed: false,
            valid: false
        }));
        bidderBidIndexPlusOne[tenderId][msg.sender] = tenderBids[tenderId].length;

        emit BidCommitted(tenderId, msg.sender, commitment);
    }

    function revealBid(uint256 tenderId, uint256 bidAmount, bytes32 secret) external {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (block.timestamp < tender.bidDeadline) revert RevealNotOpen();
        if (block.timestamp > tender.revealDeadline) revert RevealClosed();

        uint256 indexPlusOne = bidderBidIndexPlusOne[tenderId][msg.sender];
        if (indexPlusOne == 0) revert NoCommitment();
        Bid storage bid = tenderBids[tenderId][indexPlusOne - 1];
        if (bid.revealed) revert AlreadyRevealed();

        bytes32 calculatedCommitment = keccak256(
            abi.encodePacked(tenderId, msg.sender, bidAmount, secret)
        );
        if (calculatedCommitment != bid.commitment) revert InvalidReveal();

        if (tender.status == TenderStatus.OPEN) tender.status = TenderStatus.REVEAL;
        bid.revealedAmount = bidAmount;
        bid.revealed = true;
        bid.valid = true;
        emit BidRevealed(tenderId, msg.sender, bidAmount, true);
    }

    function recordAIRisk(
        uint256 tenderId,
        uint256 riskScore,
        bytes32 reportHash
    ) external tenderAdmin(tenderId) {
        if (riskScore > 100) revert InvalidRiskScore();
        if (reportHash == bytes32(0)) revert InvalidHash();

        Tender storage tender = tenders[tenderId];
        tender.aiRiskScore = riskScore;
        tender.aiReportHash = reportHash;
        emit AIRiskRecorded(tenderId, riskScore, reportHash);
    }

    function freezeTender(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status == TenderStatus.FROZEN || tender.status == TenderStatus.AWARDED) {
            revert InvalidStatus();
        }
        tender.status = TenderStatus.FROZEN;
        emit TenderFrozen(tenderId, tender.aiRiskScore);
    }

    function makeAwardable(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status == TenderStatus.FROZEN || tender.status == TenderStatus.AWARDED) {
            revert InvalidStatus();
        }
        if (block.timestamp <= tender.revealDeadline) revert RevealNotOpen();
        if (!_hasValidBid(tenderId)) revert NoValidBids();

        tender.status = TenderStatus.AWARDABLE;
        emit TenderAwardable(tenderId);
    }

    function awardTender(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status != TenderStatus.AWARDABLE || tender.status == TenderStatus.FROZEN) {
            revert InvalidStatus();
        }

        Bid[] storage bids = tenderBids[tenderId];
        uint256 lowestBid = type(uint256).max;
        address lowestBidder;

        for (uint256 i = 0; i < bids.length; i++) {
            Bid storage bid = bids[i];
            if (bid.committed && bid.revealed && bid.valid && bid.revealedAmount < lowestBid) {
                lowestBid = bid.revealedAmount;
                lowestBidder = bid.bidder;
            }
        }
        if (lowestBidder == address(0)) revert NoValidBids();

        tender.winner = lowestBidder;
        tender.winningBid = lowestBid;
        tender.status = TenderStatus.AWARDED;
        emit TenderAwarded(tenderId, lowestBidder, lowestBid);
    }

    function recordDecisionProof(uint256 tenderId, bytes32 decisionHash) external tenderAdmin(tenderId) {
        if (decisionHash == bytes32(0)) revert InvalidHash();
        tenders[tenderId].decisionHash = decisionHash;
        emit DecisionProofRecorded(tenderId, decisionHash);
    }

    function getTender(uint256 tenderId) external view returns (Tender memory) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        return tenders[tenderId];
    }

    function getBidCount(uint256 tenderId) external view returns (uint256) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        return tenderBids[tenderId].length;
    }

    function getBid(uint256 tenderId, uint256 index) external view returns (Bid memory) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        if (index >= tenderBids[tenderId].length) revert InvalidBidIndex();
        return tenderBids[tenderId][index];
    }

    function getWinner(uint256 tenderId) external view returns (address) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        return tenders[tenderId].winner;
    }

    function getWinningBid(uint256 tenderId) external view returns (uint256) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        return tenders[tenderId].winningBid;
    }

    function getTenderStatus(uint256 tenderId) external view returns (TenderStatus) {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        return tenders[tenderId].status;
    }

    function _hasValidBid(uint256 tenderId) private view returns (bool) {
        Bid[] storage bids = tenderBids[tenderId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].committed && bids[i].revealed && bids[i].valid) return true;
        }
        return false;
    }
}
