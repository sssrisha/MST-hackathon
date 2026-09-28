// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface ISupplierRegistry {
    function isSupplierRegistered(address supplier) external view returns (bool);
    function getSupplierScores(address supplier) external view returns (uint8 reputationScore, uint8 performanceScore);
    function recordContractWon(address supplier, uint256 contractValue) external;
}

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
        uint8 priceWeight;
        uint8 reputationWeight;
        uint8 performanceWeight;
        uint8 riskWeight;
        TenderStatus status;
        bool exists;
    }

    struct Bid {
        // Award-time snapshots keep the explanation stable if reputation changes later.
        address bidder;
        bytes32 commitment;
        uint256 revealedAmount;
        uint8 riskScore;
        uint8 evaluatedPriceScore;
        uint8 evaluatedReputationScore;
        uint8 evaluatedPerformanceScore;
        uint8 evaluatedRiskScore;
        uint8 evaluatedFinalScore;
        bool committed;
        bool revealed;
        bool valid;
        bool riskRecorded;
        bool evaluationRecorded;
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
    error InvalidWeights();
    error BiddingClosed();
    error RevealNotOpen();
    error RevealClosed();
    error AlreadyCommitted();
    error NoCommitment();
    error AlreadyRevealed();
    error InvalidReveal();
    error NoValidBids();
    error BidRiskMissing();
    error InvalidBidIndex();
    error SupplierNotRegistered(address supplier);
    error IncorrectDeposit();
    error DepositUnavailable();
    error TransferFailed();
    error ReentrantCall();

    address public immutable owner;
    ISupplierRegistry public immutable supplierRegistry;
    uint256 private nextTenderId = 1;
    uint256 private entered;

    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => Bid[]) private tenderBids;
    mapping(uint256 => mapping(address => uint256)) private bidderBidIndexPlusOne;
    mapping(uint256 => mapping(address => bool)) public bidDepositSettled;

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
    event BidRiskRecorded(uint256 indexed tenderId, address indexed bidder, uint256 riskScore);
    event BidDepositSettled(uint256 indexed tenderId, address indexed bidder, uint256 amount, bool refunded);
    event AIRiskRecorded(uint256 indexed tenderId, uint256 riskScore, bytes32 reportHash);
    event TenderFrozen(uint256 indexed tenderId, uint256 aiRiskScore);
    event TenderAwardable(uint256 indexed tenderId);
    event ScoringWeightsUpdated(uint256 indexed tenderId, uint8 priceWeight, uint8 reputationWeight, uint8 performanceWeight, uint8 riskWeight);
    event TenderAwarded(uint256 indexed tenderId, address indexed winner, uint256 winningBid, uint256 finalScore);
    event DecisionProofRecorded(uint256 indexed tenderId, bytes32 decisionHash);

    modifier nonReentrant() {
        if (entered != 0) revert ReentrantCall();
        entered = 1;
        _;
        entered = 0;
    }

    modifier tenderAdmin(uint256 tenderId) {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (msg.sender != owner && msg.sender != tender.creator) revert Unauthorized();
        _;
    }

    constructor(address registryAddress) {
        if (registryAddress == address(0)) revert InvalidHash();
        owner = msg.sender;
        supplierRegistry = ISupplierRegistry(registryAddress);
    }

    function createTender(
        string calldata title,
        uint256 budget,
        uint256 bidDeadline,
        uint256 revealDeadline,
        uint256 deposit
    ) external returns (uint256 tenderId) {
        if (msg.sender != owner) revert Unauthorized();
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
            priceWeight: 40,
            reputationWeight: 25,
            performanceWeight: 20,
            riskWeight: 15,
            status: TenderStatus.OPEN,
            exists: true
        });

        emit TenderCreated(tenderId, msg.sender, title, budget, bidDeadline, revealDeadline, deposit);
        emit ScoringWeightsUpdated(tenderId, 40, 25, 20, 15);
    }

    function recordPreTenderRisk(uint256 tenderId, uint256 riskScore, bytes32 reportHash)
        external
        tenderAdmin(tenderId)
    {
        if (riskScore > 100) revert InvalidRiskScore();
        if (reportHash == bytes32(0)) revert InvalidHash();
        Tender storage tender = tenders[tenderId];
        tender.preTenderRiskScore = riskScore;
        tender.preTenderReportHash = reportHash;
        emit PreTenderRiskRecorded(tenderId, riskScore, reportHash);
    }

    function setScoringWeights(
        uint256 tenderId,
        uint8 priceWeight,
        uint8 reputationWeight,
        uint8 performanceWeight,
        uint8 riskWeight
    ) external tenderAdmin(tenderId) {
        if (tenders[tenderId].status != TenderStatus.OPEN) revert InvalidStatus();
        if (uint256(priceWeight) + reputationWeight + performanceWeight + riskWeight != 100) {
            revert InvalidWeights();
        }
        Tender storage tender = tenders[tenderId];
        tender.priceWeight = priceWeight;
        tender.reputationWeight = reputationWeight;
        tender.performanceWeight = performanceWeight;
        tender.riskWeight = riskWeight;
        emit ScoringWeightsUpdated(tenderId, priceWeight, reputationWeight, performanceWeight, riskWeight);
    }

    function getScoringWeights(uint256 tenderId)
        external
        view
        returns (uint8 priceWeight, uint8 reputationWeight, uint8 performanceWeight, uint8 riskWeight)
    {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        Tender storage tender = tenders[tenderId];
        return (tender.priceWeight, tender.reputationWeight, tender.performanceWeight, tender.riskWeight);
    }

    function commitBid(uint256 tenderId, bytes32 commitment) external payable {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (tender.status != TenderStatus.OPEN || block.timestamp >= tender.bidDeadline) revert BiddingClosed();
        if (!supplierRegistry.isSupplierRegistered(msg.sender)) revert SupplierNotRegistered(msg.sender);
        if (commitment == bytes32(0)) revert InvalidHash();
        if (bidderBidIndexPlusOne[tenderId][msg.sender] != 0) revert AlreadyCommitted();
        if (msg.value != tender.deposit) revert IncorrectDeposit();

        tenderBids[tenderId].push(Bid({
            bidder: msg.sender,
            commitment: commitment,
            revealedAmount: 0,
            riskScore: 0,
            evaluatedPriceScore: 0,
            evaluatedReputationScore: 0,
            evaluatedPerformanceScore: 0,
            evaluatedRiskScore: 0,
            evaluatedFinalScore: 0,
            committed: true,
            revealed: false,
            valid: false,
            riskRecorded: false,
            evaluationRecorded: false
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
        if (bidAmount == 0 || bidAmount > tender.budget) revert InvalidReveal();

        bytes32 calculatedCommitment = keccak256(abi.encodePacked(tenderId, msg.sender, bidAmount, secret));
        if (calculatedCommitment != bid.commitment) revert InvalidReveal();
        if (tender.status == TenderStatus.OPEN) tender.status = TenderStatus.REVEAL;
        bid.revealedAmount = bidAmount;
        bid.revealed = true;
        bid.valid = true;
        emit BidRevealed(tenderId, msg.sender, bidAmount, true);
    }

    function claimBidDeposit(uint256 tenderId) external nonReentrant {
        Tender storage tender = tenders[tenderId];
        if (!tender.exists) revert TenderNotFound(tenderId);
        if (block.timestamp <= tender.revealDeadline) revert RevealNotOpen();
        uint256 indexPlusOne = bidderBidIndexPlusOne[tenderId][msg.sender];
        if (indexPlusOne == 0 || bidDepositSettled[tenderId][msg.sender]) revert DepositUnavailable();
        if (tender.deposit == 0) revert DepositUnavailable();

        // A valid reveal earns the deposit back; an unrevealed bid forfeits it to the platform.
        bidDepositSettled[tenderId][msg.sender] = true;
        Bid storage bid = tenderBids[tenderId][indexPlusOne - 1];
        bool refunded = bid.revealed && bid.valid;
        address payable recipient = payable(refunded ? msg.sender : owner);
        (bool sent, ) = recipient.call{value: tender.deposit}("");
        if (!sent) revert TransferFailed();
        emit BidDepositSettled(tenderId, msg.sender, tender.deposit, refunded);
    }

    function recordBidRisk(uint256 tenderId, address bidder, uint256 riskScore)
        external
        tenderAdmin(tenderId)
    {
        Tender storage tender = tenders[tenderId];
        if (riskScore > 100) revert InvalidRiskScore();
        if (tender.status == TenderStatus.FROZEN || tender.status == TenderStatus.AWARDED) revert InvalidStatus();
        uint256 indexPlusOne = bidderBidIndexPlusOne[tenderId][bidder];
        if (indexPlusOne == 0) revert NoCommitment();
        Bid storage bid = tenderBids[tenderId][indexPlusOne - 1];
        if (!bid.revealed || !bid.valid) revert InvalidStatus();
        bid.riskScore = uint8(riskScore);
        bid.riskRecorded = true;
        emit BidRiskRecorded(tenderId, bidder, riskScore);
    }

    function recordAIRisk(uint256 tenderId, uint256 riskScore, bytes32 reportHash)
        external
        tenderAdmin(tenderId)
    {
        if (riskScore > 100) revert InvalidRiskScore();
        if (reportHash == bytes32(0)) revert InvalidHash();
        Tender storage tender = tenders[tenderId];
        tender.aiRiskScore = riskScore;
        tender.aiReportHash = reportHash;
        emit AIRiskRecorded(tenderId, riskScore, reportHash);
    }

    function freezeTender(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status == TenderStatus.FROZEN || tender.status == TenderStatus.AWARDED) revert InvalidStatus();
        tender.status = TenderStatus.FROZEN;
        emit TenderFrozen(tenderId, tender.aiRiskScore);
    }

    function makeAwardable(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status == TenderStatus.FROZEN || tender.status == TenderStatus.AWARDED) revert InvalidStatus();
        if (block.timestamp <= tender.revealDeadline) revert RevealNotOpen();
        if (!_hasValidBid(tenderId)) revert NoValidBids();
        if (_hasBidMissingRisk(tenderId)) revert BidRiskMissing();
        tender.status = TenderStatus.AWARDABLE;
        emit TenderAwardable(tenderId);
    }

    function awardTender(uint256 tenderId) external tenderAdmin(tenderId) {
        Tender storage tender = tenders[tenderId];
        if (tender.status != TenderStatus.AWARDABLE) revert InvalidStatus();

        Bid[] storage bids = tenderBids[tenderId];
        address selectedBidder;
        uint256 selectedAmount;
        uint256 selectedScore;
        for (uint256 i = 0; i < bids.length; i++) {
            if (!bids[i].committed || !bids[i].revealed || !bids[i].valid || !bids[i].riskRecorded) continue;
            if (!supplierRegistry.isSupplierRegistered(bids[i].bidder)) continue;
            (uint256 finalScore, uint256 priceScore) = _evaluation(tenderId, i);
            (uint8 reputationScore, uint8 performanceScore) = supplierRegistry.getSupplierScores(bids[i].bidder);
            uint8 riskScore = uint8(100 - bids[i].riskScore);
            bids[i].evaluatedPriceScore = uint8(priceScore);
            bids[i].evaluatedReputationScore = reputationScore;
            bids[i].evaluatedPerformanceScore = performanceScore;
            bids[i].evaluatedRiskScore = riskScore;
            bids[i].evaluatedFinalScore = uint8(finalScore);
            bids[i].evaluationRecorded = true;
            if (
                selectedBidder == address(0) || finalScore > selectedScore ||
                (finalScore == selectedScore && bids[i].revealedAmount < selectedAmount)
            ) {
                selectedBidder = bids[i].bidder;
                selectedAmount = bids[i].revealedAmount;
                selectedScore = finalScore;
            }
        }
        if (selectedBidder == address(0)) revert NoValidBids();

        tender.winner = selectedBidder;
        tender.winningBid = selectedAmount;
        tender.status = TenderStatus.AWARDED;
        supplierRegistry.recordContractWon(selectedBidder, selectedAmount);
        emit TenderAwarded(tenderId, selectedBidder, selectedAmount, selectedScore);
    }

    function getBidEvaluation(uint256 tenderId, uint256 bidIndex)
        external
        view
        returns (
            address bidder,
            uint256 bidAmount,
            uint256 priceScore,
            uint256 reputationScore,
            uint256 performanceScore,
            uint256 riskScore,
            uint256 finalScore
        )
    {
        if (!tenders[tenderId].exists) revert TenderNotFound(tenderId);
        if (bidIndex >= tenderBids[tenderId].length) revert InvalidBidIndex();
        Bid storage bid = tenderBids[tenderId][bidIndex];
        if (!bid.committed || !bid.revealed || !bid.valid || !bid.riskRecorded) revert InvalidStatus();
        if (bid.evaluationRecorded) {
            priceScore = bid.evaluatedPriceScore;
            reputationScore = bid.evaluatedReputationScore;
            performanceScore = bid.evaluatedPerformanceScore;
            riskScore = bid.evaluatedRiskScore;
            finalScore = bid.evaluatedFinalScore;
        } else {
            if (!supplierRegistry.isSupplierRegistered(bid.bidder)) revert SupplierNotRegistered(bid.bidder);
            (finalScore, priceScore) = _evaluation(tenderId, bidIndex);
            (reputationScore, performanceScore) = supplierRegistry.getSupplierScores(bid.bidder);
            riskScore = 100 - bid.riskScore;
        }
        bidder = bid.bidder;
        bidAmount = bid.revealedAmount;
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

    function isTenderAdmin(uint256 tenderId, address account) external view returns (bool) {
        Tender storage tender = tenders[tenderId];
        return tender.exists && (account == owner || account == tender.creator);
    }

    function getEscrowTenderData(uint256 tenderId)
        external
        view
        returns (address creator, address winner, uint256 winningBid, uint8 status, bool exists)
    {
        Tender storage tender = tenders[tenderId];
        return (tender.creator, tender.winner, tender.winningBid, uint8(tender.status), tender.exists);
    }

    function _evaluation(uint256 tenderId, uint256 bidIndex)
        private
        view
        returns (uint256 finalScore, uint256 priceScore)
    {
        // Price is normalized to the lowest eligible quote, while lower bid risk earns a higher score.
        Bid storage bid = tenderBids[tenderId][bidIndex];
        uint256 lowestBid = type(uint256).max;
        Bid[] storage bids = tenderBids[tenderId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (
                bids[i].committed && bids[i].revealed && bids[i].valid && bids[i].riskRecorded &&
                supplierRegistry.isSupplierRegistered(bids[i].bidder) && bids[i].revealedAmount < lowestBid
            ) {
                lowestBid = bids[i].revealedAmount;
            }
        }
        if (lowestBid == type(uint256).max || bid.revealedAmount == 0) revert NoValidBids();
        priceScore = lowestBid * 100 / bid.revealedAmount;
        (uint8 reputation, uint8 performance) = supplierRegistry.getSupplierScores(bid.bidder);
        uint256 riskScore = 100 - bid.riskScore;
        Tender storage tender = tenders[tenderId];
        finalScore = (
            priceScore * tender.priceWeight +
            uint256(reputation) * tender.reputationWeight +
            uint256(performance) * tender.performanceWeight +
            riskScore * tender.riskWeight
        ) / 100;
    }

    function _hasValidBid(uint256 tenderId) private view returns (bool) {
        Bid[] storage bids = tenderBids[tenderId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (
                bids[i].committed && bids[i].revealed && bids[i].valid &&
                supplierRegistry.isSupplierRegistered(bids[i].bidder)
            ) return true;
        }
        return false;
    }

    function _hasBidMissingRisk(uint256 tenderId) private view returns (bool) {
        Bid[] storage bids = tenderBids[tenderId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (
                bids[i].committed && bids[i].revealed && bids[i].valid && !bids[i].riskRecorded &&
                supplierRegistry.isSupplierRegistered(bids[i].bidder)
            ) return true;
        }
        return false;
    }
}
