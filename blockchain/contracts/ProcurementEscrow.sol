// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface ITenderGuardEscrow {
    function getEscrowTenderData(uint256 tenderId)
        external
        view
        returns (address creator, address winner, uint256 winningBid, uint8 status, bool exists);
    function isTenderAdmin(uint256 tenderId, address account) external view returns (bool);
}

interface ISupplierRegistryEscrow {
    function recordSuccessfulMilestone(address supplier, bool onTime) external;
    function recordFailedMilestone(address supplier) external;
    function recordContractCompleted(address supplier) external;
    function recordContractFailure(address supplier) external;
    function recordBondPenalty(address supplier, uint256 penaltyAmount) external;
}

contract ProcurementEscrow {
    struct Milestone {
        bytes32 descriptionHash;
        uint256 paymentAmount;
        bool completed;
        bool paid;
        bool disputed;
        uint256 deadline;
        bool failed;
    }

    struct TenderFunds {
        uint256 escrowAmount;
        uint256 remainingEscrow;
        uint256 fundingTimestamp;
        uint256 performanceBond;
        uint256 remainingBond;
        uint256 failedMilestoneCount;
        bool funded;
        bool bondDeposited;
        bool bondReleased;
        bool contractCompleted;
        bool contractFailureRecorded;
    }

    error Unauthorized();
    error TenderNotFound(uint256 tenderId);
    error TenderNotAwarded();
    error InvalidStatus();
    error AlreadyFunded();
    error InvalidAmount();
    error IncorrectFundingAmount();
    error NotWinner();
    error BondAlreadyDeposited();
    error MilestoneLimitReached();
    error InvalidMilestone();
    error MilestoneNotFound();
    error MilestoneAlreadyResolved();
    error MilestoneNotCompleted();
    error MilestoneNotFailed();
    error MilestoneAlreadyPaid();
    error InsufficientEscrow();
    error BondUnavailable();
    error PenaltyExceedsBond();
    error ContractNotCompleted();
    error TransferFailed();
    error ReentrantCall();

    uint256 public constant MAX_MILESTONES = 5;
    uint8 private constant AWARDED_STATUS = 4;

    address public immutable owner;
    ITenderGuardEscrow public immutable tenderGuard;
    ISupplierRegistryEscrow public immutable supplierRegistry;
    uint256 private entered;

    // Procurement funds and performance bonds remain separate native-currency balances.
    mapping(uint256 => TenderFunds) public tenderFunds;
    mapping(uint256 => Milestone[]) private tenderMilestones;

    event TenderFunded(uint256 indexed tenderId, uint256 amount);
    event PerformanceBondDeposited(uint256 indexed tenderId, address indexed supplier, uint256 amount);
    event MilestoneCreated(uint256 indexed tenderId, uint256 indexed milestoneId, bytes32 descriptionHash, uint256 paymentAmount, uint256 deadline);
    event MilestoneCompleted(uint256 indexed tenderId, uint256 indexed milestoneId);
    event MilestoneFailed(uint256 indexed tenderId, uint256 indexed milestoneId);
    event MilestonePaymentReleased(uint256 indexed tenderId, uint256 indexed milestoneId, address indexed supplier, uint256 amount);
    event PerformanceBondReleased(uint256 indexed tenderId, address indexed supplier, uint256 amount);
    event PerformanceBondPenalized(uint256 indexed tenderId, address indexed supplier, uint256 amount);
    event UnusedEscrowRefunded(uint256 indexed tenderId, address indexed authority, uint256 amount);

    modifier nonReentrant() {
        if (entered != 0) revert ReentrantCall();
        entered = 1;
        _;
        entered = 0;
    }

    constructor(address tenderGuardAddress, address supplierRegistryAddress) {
        if (tenderGuardAddress == address(0) || supplierRegistryAddress == address(0)) revert InvalidAmount();
        owner = msg.sender;
        tenderGuard = ITenderGuardEscrow(tenderGuardAddress);
        supplierRegistry = ISupplierRegistryEscrow(supplierRegistryAddress);
    }

    function fundTender(uint256 tenderId) external payable {
        _requireTenderAdmin(tenderId);
        (,, uint256 winningBid, uint8 status, bool exists) = tenderGuard.getEscrowTenderData(tenderId);
        if (!exists) revert TenderNotFound(tenderId);
        if (status != AWARDED_STATUS) revert TenderNotAwarded();
        TenderFunds storage funds = tenderFunds[tenderId];
        if (funds.funded) revert AlreadyFunded();
        if (msg.value == 0) revert InvalidAmount();
        if (msg.value != winningBid) revert IncorrectFundingAmount();

        funds.escrowAmount = msg.value;
        funds.remainingEscrow = msg.value;
        funds.fundingTimestamp = block.timestamp;
        funds.funded = true;
        emit TenderFunded(tenderId, msg.value);
    }

    function depositPerformanceBond(uint256 tenderId) external payable {
        (,, , uint8 status, bool exists) = tenderGuard.getEscrowTenderData(tenderId);
        if (!exists) revert TenderNotFound(tenderId);
        if (status != AWARDED_STATUS) revert TenderNotAwarded();
        (, address winner,,,) = tenderGuard.getEscrowTenderData(tenderId);
        if (msg.sender != winner) revert NotWinner();
        TenderFunds storage funds = tenderFunds[tenderId];
        if (funds.bondDeposited) revert BondAlreadyDeposited();
        if (msg.value == 0) revert InvalidAmount();

        // The winner's bond is returned only after all scheduled milestones are paid.
        funds.performanceBond = msg.value;
        funds.remainingBond = msg.value;
        funds.bondDeposited = true;
        emit PerformanceBondDeposited(tenderId, winner, msg.value);
    }

    function createMilestone(
        uint256 tenderId,
        bytes32 descriptionHash,
        uint256 paymentAmount,
        uint256 deadline
    ) external {
        _requireTenderAdmin(tenderId);
        TenderFunds storage funds = tenderFunds[tenderId];
        if (!funds.funded || funds.contractCompleted) revert InvalidStatus();
        if (descriptionHash == bytes32(0) || paymentAmount == 0 || deadline <= block.timestamp) revert InvalidMilestone();
        Milestone[] storage milestones = tenderMilestones[tenderId];
        if (milestones.length >= MAX_MILESTONES) revert MilestoneLimitReached();

        uint256 allocated;
        for (uint256 i = 0; i < milestones.length; i++) allocated += milestones[i].paymentAmount;
        if (allocated + paymentAmount > funds.escrowAmount) revert InsufficientEscrow();

        uint256 milestoneId = milestones.length;
        milestones.push(Milestone({
            descriptionHash: descriptionHash,
            paymentAmount: paymentAmount,
            completed: false,
            paid: false,
            disputed: false,
            deadline: deadline,
            failed: false
        }));
        emit MilestoneCreated(tenderId, milestoneId, descriptionHash, paymentAmount, deadline);
    }

    function completeMilestone(uint256 tenderId, uint256 milestoneId) external {
        _requireTenderAdmin(tenderId);
        Milestone storage milestone = _milestone(tenderId, milestoneId);
        if (milestone.completed || milestone.failed || milestone.paid) revert MilestoneAlreadyResolved();
        milestone.completed = true;
            (, address winner,,,) = _tenderData(tenderId);
        supplierRegistry.recordSuccessfulMilestone(winner, block.timestamp <= milestone.deadline);
        emit MilestoneCompleted(tenderId, milestoneId);
    }

    function failMilestone(uint256 tenderId, uint256 milestoneId) external {
        _requireTenderAdmin(tenderId);
        Milestone storage milestone = _milestone(tenderId, milestoneId);
        if (milestone.completed || milestone.failed || milestone.paid) revert MilestoneAlreadyResolved();
        if (block.timestamp <= milestone.deadline) revert InvalidStatus();
        milestone.failed = true;
        tenderFunds[tenderId].failedMilestoneCount++;
            (, address winner,,,) = _tenderData(tenderId);
        supplierRegistry.recordFailedMilestone(winner);
        TenderFunds storage funds = tenderFunds[tenderId];
        if (!funds.contractFailureRecorded) {
            funds.contractFailureRecorded = true;
            supplierRegistry.recordContractFailure(winner);
        }
        emit MilestoneFailed(tenderId, milestoneId);
    }

    function releaseMilestonePayment(uint256 tenderId, uint256 milestoneId) external nonReentrant {
        Milestone storage milestone = _milestone(tenderId, milestoneId);
        TenderFunds storage funds = tenderFunds[tenderId];
        if (!funds.funded) revert InvalidStatus();
        if (!milestone.completed) revert MilestoneNotCompleted();
        if (milestone.paid) revert MilestoneAlreadyPaid();
        if (funds.remainingEscrow < milestone.paymentAmount) revert InsufficientEscrow();
        (, address winner,,,) = _tenderData(tenderId);

        // Apply state and reputation effects before the supplier callback; nonReentrant blocks nested payouts.
        milestone.paid = true;
        funds.remainingEscrow -= milestone.paymentAmount;
        if (funds.failedMilestoneCount == 0 && _allMilestonesPaid(tenderId)) {
            funds.contractCompleted = true;
            supplierRegistry.recordContractCompleted(winner);
        }
        (bool sent, ) = payable(winner).call{value: milestone.paymentAmount}("");
        if (!sent) revert TransferFailed();
        emit MilestonePaymentReleased(tenderId, milestoneId, winner, milestone.paymentAmount);
    }

    function releasePerformanceBond(uint256 tenderId) external nonReentrant {
        TenderFunds storage funds = tenderFunds[tenderId];
        if (!funds.contractCompleted || !_allMilestonesPaid(tenderId)) revert ContractNotCompleted();
        if (!funds.bondDeposited || funds.bondReleased) revert BondUnavailable();
        (, address winner,,,) = _tenderData(tenderId);

        uint256 amount = funds.remainingBond;
        funds.remainingBond = 0;
        funds.bondReleased = true;
        if (amount > 0) {
            (bool sent, ) = payable(winner).call{value: amount}("");
            if (!sent) revert TransferFailed();
        }
        emit PerformanceBondReleased(tenderId, winner, amount);
    }

    function penalizePerformanceBond(uint256 tenderId, uint256 amount) external nonReentrant {
        _requireTenderAdmin(tenderId);
        TenderFunds storage funds = tenderFunds[tenderId];
        if (!funds.bondDeposited || funds.bondReleased || funds.contractCompleted) revert BondUnavailable();
        if (amount == 0) revert InvalidAmount();
        if (amount > funds.remainingBond) revert PenaltyExceedsBond();
        (, address winner,,,) = _tenderData(tenderId);

        funds.remainingBond -= amount;
        supplierRegistry.recordBondPenalty(winner, amount);
        (bool sent, ) = payable(owner).call{value: amount}("");
        if (!sent) revert TransferFailed();
        emit PerformanceBondPenalized(tenderId, winner, amount);
    }

    function refundUnusedEscrow(uint256 tenderId) external nonReentrant {
        _requireTenderAdmin(tenderId);
        TenderFunds storage funds = tenderFunds[tenderId];
        bool failedAndSettled = funds.failedMilestoneCount > 0 && _allMilestonesSettled(tenderId);
        if (!funds.contractCompleted && !failedAndSettled) revert ContractNotCompleted();
        (address creator,,,,) = _tenderData(tenderId);
        uint256 amount = funds.remainingEscrow;
        if (amount == 0) revert InvalidAmount();

        funds.remainingEscrow = 0;
        (bool sent, ) = payable(creator).call{value: amount}("");
        if (!sent) revert TransferFailed();
        emit UnusedEscrowRefunded(tenderId, creator, amount);
    }

    function getMilestoneCount(uint256 tenderId) external view returns (uint256) {
        _tenderData(tenderId);
        return tenderMilestones[tenderId].length;
    }

    function getMilestone(uint256 tenderId, uint256 milestoneId) external view returns (Milestone memory) {
        return _milestone(tenderId, milestoneId);
    }

    function _requireTenderAdmin(uint256 tenderId) private view {
        (,,,, bool exists) = tenderGuard.getEscrowTenderData(tenderId);
        if (!exists) revert TenderNotFound(tenderId);
        if (!tenderGuard.isTenderAdmin(tenderId, msg.sender)) revert Unauthorized();
    }

    function _tenderData(uint256 tenderId)
        private
        view
        returns (address creator, address winner, uint256 winningBid, uint8 status, bool exists)
    {
        (creator, winner, winningBid, status, exists) = tenderGuard.getEscrowTenderData(tenderId);
        if (!exists) revert TenderNotFound(tenderId);
    }

    function _milestone(uint256 tenderId, uint256 milestoneId) private view returns (Milestone storage milestone) {
        _tenderData(tenderId);
        if (milestoneId >= tenderMilestones[tenderId].length) revert MilestoneNotFound();
        milestone = tenderMilestones[tenderId][milestoneId];
    }

    function _allMilestonesPaid(uint256 tenderId) private view returns (bool) {
        Milestone[] storage milestones = tenderMilestones[tenderId];
        if (milestones.length == 0) return false;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].completed || !milestones[i].paid) return false;
        }
        return true;
    }

    function _allMilestonesSettled(uint256 tenderId) private view returns (bool) {
        Milestone[] storage milestones = tenderMilestones[tenderId];
        if (milestones.length == 0) return false;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].paid && !milestones[i].failed) return false;
        }
        return true;
    }
}
