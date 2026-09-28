import { getAllContractors, getSession, setSession, ensureSeeded } from './mockDb.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function generateContractorId() {
  const contractors = getAllContractors();
  const maxId = contractors.reduce((highest, entry) => {
    const match = String(entry.contractorId || '').match(/TG-(\d+)/);
    const current = match ? Number(match[1]) : 0;
    return Math.max(highest, current);
  }, 1000);
  return `TG-${String(maxId + 1).padStart(4, '0')}`;
}

export async function login(email, password) {
  // Future FastAPI route: POST /api/contractors/login
  await delay(250);
  ensureSeeded();

  const cleanedEmail = normalizeEmail(email);
  if (!cleanedEmail || !emailPattern.test(cleanedEmail)) {
    throw new Error('Enter a valid email');
  }

  if (!password || !String(password).trim()) {
    throw new Error('Password is required');
  }

  const contractors = getAllContractors();
  const contractor = contractors.find((entry) => entry.email === cleanedEmail);
  if (!contractor) {
    throw new Error('No contractor account found for this email');
  }

  const session = {
    contractorId: contractor.contractorId,
    email: contractor.email,
    loggedInAt: new Date().toISOString()
  };

  setSession(session);
  return {
    success: true,
    user: contractor,
    session,
    message: 'Logged in successfully'
  };
}

export async function signup(profile) {
  // Future FastAPI route: POST /api/contractors/signup
  await delay(350);
  ensureSeeded();

  const company = String(profile?.company || '').trim();
  const email = normalizeEmail(profile?.email);
  const password = String(profile?.password || '');

  if (!company) throw new Error('Company name is required');
  if (!email || !emailPattern.test(email)) throw new Error('Provide a valid email');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!profile?.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(profile.walletAddress)) {
    throw new Error('Valid wallet address is required');
  }

  const contractors = getAllContractors();
  if (contractors.some((entry) => entry.email === email)) {
    throw new Error('A contractor with this email already exists');
  }

  const contractorId = generateContractorId();
  const newContractor = {
    contractorId,
    supplierId: contractorId,
    company,
    email,
    phone: profile.phone || '+91 98765 43210',
    category: profile.category || 'Infrastructure',
    yearsOfExperience: Number(profile.yearsOfExperience || 0),
    gstin: profile.gstin || 'NA',
    walletAddress: profile.walletAddress,
    walletLabel: `Wallet: ${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)} (demo)`,
    reputation: 50,
    reputationLabel: 'New supplier, provisional',
    isDemo: false,
    history: [],
    business: {
      registrationId: profile.registrationId || 'NEW-REG',
      contactName: profile.contactName || 'Primary contact',
      businessType: profile.businessType || 'General contracting',
      gstin: profile.gstin || 'NA'
    },
    createdAt: new Date().toISOString()
  };

  contractors.push(newContractor);
  localStorage.setItem('tg.v1.contractors', JSON.stringify(contractors));

  const session = {
    contractorId: newContractor.contractorId,
    email: newContractor.email,
    loggedInAt: new Date().toISOString()
  };

  setSession(session);
  return {
    success: true,
    user: newContractor,
    session,
    message: 'Contractor account created successfully'
  };
}

export function logout() {
  // Future FastAPI route: POST /api/contractors/logout
  setSession(null);
  return true;
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  const contractors = getAllContractors();
  return contractors.find((entry) => entry.contractorId === session.contractorId) || null;
}

export function isAuthenticated() {
  return Boolean(getSession());
}

export function hasDemoSession() {
  const session = getSession();
  return Boolean(session && session.email === 'demo@abcinfra.example');
}

export default {
  login,
  signup,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasDemoSession
};
