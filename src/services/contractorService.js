import { getCurrentUser, hasDemoSession } from './authService.js';
import { getAllTenders, getAllBids, getAllSuppliers, getAllContractors } from './mockDb.js';
import { getEscrow } from './escrowService.js';
import { initialSuppliers } from '../data/suppliers.js';

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeNumber(value) {
  return Number(value) || 0;
}

export async function getProfile() {
  // Future FastAPI route: GET /api/contractors/me
  await delay(150);
  const user = getCurrentUser();
  if (!user) return null;
  return { ...user };
}

export async function updateProfile(profilePatch) {
  // Future FastAPI route: PUT /api/contractors/me
  await delay(250);
  const current = getCurrentUser();
  if (!current) throw new Error('Login required');
  const contractors = getAllContractors();
  const index = contractors.findIndex((item) => item.contractorId === current.contractorId);

  if (index === -1) throw new Error('Contractor not found');

  const next = {
    ...contractors[index],
    company: profilePatch.company || contractors[index].company,
    phone: profilePatch.phone || contractors[index].phone,
    category: profilePatch.category || contractors[index].category,
    yearsOfExperience: Number(profilePatch.yearsOfExperience ?? contractors[index].yearsOfExperience),
    gstin: profilePatch.gstin || contractors[index].gstin,
    business: {
      ...contractors[index].business,
      contactName: profilePatch.contactName || contractors[index].business?.contactName,
      businessType: profilePatch.businessType || contractors[index].business?.businessType,
      registrationId: profilePatch.registrationId || contractors[index].business?.registrationId,
      gstin: profilePatch.gstin || contractors[index].business?.gstin
    }
  };

  contractors[index] = next;
  localStorage.setItem('tg.v1.contractors', JSON.stringify(contractors));
  return next;
}

export async function getDashboard() {
  // Future FastAPI route: GET /api/contractors/dashboard
  await delay(250);
  const user = getCurrentUser();
  if (!user) return null;

  const suppliers = getAllSuppliers();
  const supplier = suppliers.find((item) => item.id === user.supplierId) || initialSuppliers[0];

  const bids = getAllBids();
  const myBids = Object.values(bids)
    .flat()
    .filter((bid) => bid.contractorId === user.contractorId || bid.supplierId === user.supplierId);

  const won = myBids.filter((bid) => bid.status === 'AWARDED' || bid.status === 'VERIFIED').length;
  const activeContracts = await getActiveContracts();
  const reputation = await getReputation();

  return {
    profile: user,
    supplier,
    reputation,
    wallet: {
      address: user.walletAddress || supplier.walletAddress,
      balance: 250,
      locked: Math.max(0, 18 - myBids.length * 5),
      network: 'MST Testnet (demo)'
    },
    stats: {
      contractsCompleted: supplier.completedContracts,
      contractsWon: supplier.wonContracts,
      activeContracts: activeContracts.length,
      onTimeCompletion: supplier.onTimePercentage,
      averagePerformance: supplier.avgPerformance,
      failedContracts: supplier.failedContracts,
      disputes: supplier.disputes,
      performanceBondsLost: supplier.bondsLost,
      totalContractValue: supplier.totalValue
    },
    openTenders: myBids.length,
    actionItems: myBids.some((bid) => bid.status === 'COMMITTED') ? [{ label: '1 bid ready to reveal', href: '/contractor/bids' }] : []
  };
}

export async function getMyBids() {
  // Future FastAPI route: GET /api/contractors/me/bids
  await delay(250);
  const user = getCurrentUser();
  if (!user) return [];

  const tenders = getAllTenders();
  const bids = Object.values(getAllBids())
    .flat()
    .filter((bid) => (bid.contractorId || bid.supplierId) === user.contractorId || bid.supplierId === user.supplierId);

  return bids.map((bid) => {
    const tender = tenders.find((item) => item.id === bid.tenderId) || null;
    return {
      ...bid,
      tenderTitle: tender?.title || bid.tenderId,
      statusLabel: bid.status,
      tenderStatus: tender?.status || 'OPEN',
      currentStatus: deriveBidStatus(bid, tender)
    };
  });
}

export async function getBid(bidId) {
  // Future FastAPI route: GET /api/contractors/me/bids/:bidId
  await delay(150);
  const bids = Object.values(getAllBids()).flat();
  return bids.find((bid) => bid.bidId === bidId) || null;
}

export async function getReputation() {
  // Future FastAPI route: GET /api/contractors/me/reputation
  await delay(200);
  const user = getCurrentUser();
  if (!user) return null;
  const suppliers = getAllSuppliers();
  const supplier = suppliers.find((item) => item.id === user.supplierId) || {
    reputation: 50,
    onTimePercentage: 0,
    avgPerformance: 0,
    completedContracts: 0,
    wonContracts: 0,
    failedContracts: 0,
    disputes: 0,
    bondsLost: 0,
    totalValue: '₹0'
  };

  const recentEvents = [
    { delta: '+6', date: '2026-09-18', label: 'Performance updated', tx: '0x9f2c...1234' },
    { delta: '+4', date: '2026-09-11', label: 'Bid verified', tx: '0x71c2...44a1' },
    { delta: '-2', date: '2026-08-29', label: 'Safety review', tx: '0x1a2c...bb21' }
  ];

  return {
    score: supplier.reputation || 50,
    label: supplier.reputation >= 80 ? 'High confidence' : 'New supplier, provisional',
    performance: supplier.avgPerformance || 0,
    onTime: supplier.onTimePercentage || 0,
    wins: supplier.wonContracts || 0,
    failed: supplier.failedContracts || 0,
    disputes: supplier.disputes || 0,
    bondsLost: supplier.bondsLost || 0,
    totalValue: supplier.totalValue || '₹0',
    recentEvents,
    title: 'Recent events'
  };
}

export async function getActiveContracts() {
  // Future FastAPI route: GET /api/contractors/me/contracts
  await delay(200);
  const user = getCurrentUser();
  if (!user) return [];

  const tenders = getAllTenders();
  const bids = Object.values(getAllBids()).flat();
  const myBidIds = new Set(
    bids.filter((bid) => (bid.contractorId || bid.supplierId) === user.contractorId || bid.supplierId === user.supplierId)
      .map((bid) => bid.tenderId)
  );

  return tenders
    .filter((item) => myBidIds.has(item.id) && (item.status === 'AWARDED' || item.status === 'FROZEN'))
    .map((item) => ({
      ...item,
      contractId: item.id,
      status: item.status === 'FROZEN' ? 'UNDER_REVIEW' : item.status,
      supplierId: user.supplierId,
      awardAmount: item.awardedAmount || 0
    }));
}

export async function getPayments() {
  // Future FastAPI route: GET /api/contractors/me/payments
  await delay(200);
  const activeContracts = await getActiveContracts();
  const escrowData = await Promise.all(activeContracts.map((contract) => getEscrow(contract.id)));

  return escrowData.map((entry) => ({
    tenderId: entry.tenderId,
    contractId: entry.tenderId,
    totalReleased: entry.derived?.released || 0,
    locked: entry.derived?.totalLocked || 0,
    bond: entry.derived?.bondLocked || 0,
    txHash: entry.rawLedger?.contractAddress || '0x000...',
    status: 'DEMO'
  }));
}

export function deriveBidStatus(bid, tender) {
  if (!bid) return 'COMMITTED';
  if (tender?.status === 'FROZEN') return 'UNDER_REVIEW';
  if (tender?.status === 'AWARDED') {
    if (bid.status === 'VERIFIED' && Number(bid.amount) > 0) return 'AWARDED';
    return 'NOT_SELECTED';
  }
  if (tender?.status === 'REVEAL' && (bid.status === 'COMMITTED' || !bid.amount)) return 'REVEAL_OPEN';
  if (bid.status === 'VERIFIED') return 'VERIFIED';
  if (bid.status === 'COMMITTED') return 'COMMITTED';
  if (bid.status === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  return 'COMMITTED';
}

export default {
  getProfile,
  updateProfile,
  getDashboard,
  getMyBids,
  getBid,
  getReputation,
  getActiveContracts,
  getPayments,
  deriveBidStatus
};
