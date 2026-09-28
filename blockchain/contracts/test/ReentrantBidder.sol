// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IReentrantTestTender {
    function commitBid(uint256 tenderId, bytes32 commitment) external payable;
    function revealBid(uint256 tenderId, uint256 bidAmount, bytes32 secret) external;
}

interface IReentrantTestEscrow {
    function releaseMilestonePayment(uint256 tenderId, uint256 milestoneId) external;
}

contract ReentrantBidder {
    address private escrow;
    uint256 private tenderId;
    uint256 private milestoneId;
    bool public reentryAttempted;
    bool public reentryBlocked;

    function submitBid(address tenderGuard, uint256 id, bytes32 commitment) external {
        IReentrantTestTender(tenderGuard).commitBid(id, commitment);
    }

    function reveal(address tenderGuard, uint256 id, uint256 amount, bytes32 secret) external {
        IReentrantTestTender(tenderGuard).revealBid(id, amount, secret);
    }

    function setReentryTarget(address escrowAddress, uint256 id, uint256 milestone) external {
        escrow = escrowAddress;
        tenderId = id;
        milestoneId = milestone;
    }

    receive() external payable {
        if (escrow == address(0)) return;
        reentryAttempted = true;
        try IReentrantTestEscrow(escrow).releaseMilestonePayment(tenderId, milestoneId) {
            reentryBlocked = false;
        } catch {
            reentryBlocked = true;
        }
    }
}
