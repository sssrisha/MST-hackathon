// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract SupplierRegistry {
    struct Supplier {
        bytes32 supplierIdHash;
        bytes32 categoryHash;
        uint32 yearsExperience;
        uint32 contractsCompleted;
        uint32 contractsWon;
        uint32 contractsFailed;
        uint32 milestonesCompleted;
        uint32 milestonesFailed;
        uint32 onTimeCompletions;
        uint128 totalContractValue;
        uint128 performanceBondLosses;
        uint8 reputationScore;
        uint8 performanceScore;
        bytes32 documentHash;
        bool active;
        bool registered;
    }

    error Unauthorized();
    error InvalidSupplier();
    error SupplierAlreadyRegistered(address supplier);
    error SupplierNotRegistered(address supplier);
    error InvalidSupplierData();
    error ValueOverflow();

    address public immutable owner;
    mapping(address => Supplier) private suppliers;
    mapping(address => bool) public authorizedContracts;

    // Only the fingerprint is on-chain; company documents and personal data stay off-chain.
    event SupplierRegistered(address indexed supplier, bytes32 supplierIdHash);
    event SupplierAuthorizationUpdated(address indexed account, bool authorized);
    event SupplierStatusUpdated(address indexed supplier, bool active);
    event SupplierPerformanceUpdated(
        address indexed supplier,
        uint32 contractsCompleted,
        uint32 contractsFailed,
        uint32 milestonesCompleted,
        uint32 milestonesFailed,
        uint32 onTimeCompletions,
        uint128 performanceBondLosses
    );
    event SupplierReputationUpdated(address indexed supplier, uint8 reputationScore, uint8 performanceScore);
    event SupplierContractWon(address indexed supplier, uint256 contractValue);
    event SupplierContractCompleted(address indexed supplier);
    event SupplierContractFailed(address indexed supplier);
    event SupplierBondPenalty(address indexed supplier, uint256 penaltyAmount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != owner && !authorizedContracts[msg.sender]) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAuthorizedContract(address account, bool authorized) external onlyOwner {
        if (account == address(0)) revert InvalidSupplier();
        authorizedContracts[account] = authorized;
        emit SupplierAuthorizationUpdated(account, authorized);
    }

    function registerSupplier(
        address supplier,
        bytes32 supplierIdHash,
        bytes32 categoryHash,
        uint256 yearsExperience,
        bytes32 documentHash
    ) external onlyOwner {
        if (supplier == address(0)) revert InvalidSupplier();
        if (suppliers[supplier].registered) revert SupplierAlreadyRegistered(supplier);
        if (supplierIdHash == bytes32(0) || categoryHash == bytes32(0)) revert InvalidSupplierData();
        if (yearsExperience > type(uint32).max) revert ValueOverflow();

        suppliers[supplier] = Supplier({
            supplierIdHash: supplierIdHash,
            categoryHash: categoryHash,
            yearsExperience: uint32(yearsExperience),
            contractsCompleted: 0,
            contractsWon: 0,
            contractsFailed: 0,
            milestonesCompleted: 0,
            milestonesFailed: 0,
            onTimeCompletions: 0,
            totalContractValue: 0,
            performanceBondLosses: 0,
            reputationScore: 50,
            performanceScore: 50,
            documentHash: documentHash,
            active: true,
            registered: true
        });

        emit SupplierRegistered(supplier, supplierIdHash);
        emit SupplierReputationUpdated(supplier, 50, 50);
    }

    function setSupplierActive(address supplier, bool active) external onlyOwner {
        Supplier storage profile = _supplier(supplier);
        profile.active = active;
        emit SupplierStatusUpdated(supplier, active);
    }

    function isSupplierRegistered(address supplier) external view returns (bool) {
        return suppliers[supplier].registered && suppliers[supplier].active;
    }

    function getSupplier(address supplier) external view returns (Supplier memory) {
        return _supplier(supplier);
    }

    function getSupplierScores(address supplier) external view returns (uint8 reputationScore, uint8 performanceScore) {
        Supplier storage profile = _supplier(supplier);
        return (profile.reputationScore, profile.performanceScore);
    }

    function recordContractWon(address supplier, uint256 contractValue) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        if (contractValue > type(uint128).max - profile.totalContractValue) revert ValueOverflow();
        profile.contractsWon++;
        profile.totalContractValue += uint128(contractValue);
        emit SupplierContractWon(supplier, contractValue);
        _updateScores(supplier, profile);
    }

    function recordSuccessfulMilestone(address supplier, bool onTime) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        profile.milestonesCompleted++;
        if (onTime) profile.onTimeCompletions++;
        _updateScores(supplier, profile);
    }

    function recordFailedMilestone(address supplier) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        profile.milestonesFailed++;
        _updateScores(supplier, profile);
    }

    function recordContractCompleted(address supplier) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        profile.contractsCompleted++;
        emit SupplierContractCompleted(supplier);
        _updateScores(supplier, profile);
    }

    function recordContractFailure(address supplier) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        profile.contractsFailed++;
        emit SupplierContractFailed(supplier);
        _updateScores(supplier, profile);
    }

    function recordBondPenalty(address supplier, uint256 penaltyAmount) external onlyAuthorized {
        Supplier storage profile = _supplier(supplier);
        if (penaltyAmount == 0 || penaltyAmount > type(uint128).max - profile.performanceBondLosses) {
            revert ValueOverflow();
        }
        profile.performanceBondLosses += uint128(penaltyAmount);
        emit SupplierBondPenalty(supplier, penaltyAmount);
        _updateScores(supplier, profile);
    }

    function _supplier(address supplier) private view returns (Supplier storage profile) {
        profile = suppliers[supplier];
        if (!profile.registered) revert SupplierNotRegistered(supplier);
    }

    function _updateScores(address supplier, Supplier storage profile) private {
        uint256 contractCount = uint256(profile.contractsCompleted) + profile.contractsFailed;
        uint256 milestoneCount = uint256(profile.milestonesCompleted) + profile.milestonesFailed;
        uint256 completionRate = contractCount == 0 ? 50 : uint256(profile.contractsCompleted) * 100 / contractCount;
        uint256 milestoneRate = milestoneCount == 0 ? 50 : uint256(profile.milestonesCompleted) * 100 / milestoneCount;
        uint256 onTimeRate = profile.milestonesCompleted == 0
            ? 50
            : uint256(profile.onTimeCompletions) * 100 / profile.milestonesCompleted;

        // Reputation weights contract completion, milestone success, and on-time delivery; bond losses subtract up to 30 points.
        uint256 bondPenalty = uint256(profile.performanceBondLosses) * 30 /
            (uint256(profile.totalContractValue) + profile.performanceBondLosses + 1);
        if (bondPenalty > 30) bondPenalty = 30;
        uint256 reputation = (completionRate * 50 + milestoneRate * 30 + onTimeRate * 20) / 100;
        reputation = reputation > bondPenalty ? reputation - bondPenalty : 0;
        uint256 performance = (milestoneRate + onTimeRate) / 2;

        profile.reputationScore = uint8(reputation);
        profile.performanceScore = uint8(performance);
        emit SupplierPerformanceUpdated(
            supplier,
            profile.contractsCompleted,
            profile.contractsFailed,
            profile.milestonesCompleted,
            profile.milestonesFailed,
            profile.onTimeCompletions,
            profile.performanceBondLosses
        );
        emit SupplierReputationUpdated(supplier, uint8(reputation), uint8(performance));
    }
}
