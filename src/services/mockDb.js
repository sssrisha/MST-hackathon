import { initialTenders } from '../data/tenders.js';
import { initialBids } from '../data/bids.js';
import { initialSuppliers } from '../data/suppliers.js';

const STORAGE_PREFIX = 'tg.v1.';

export const STORAGE_KEYS = {
  tenders: 'tg.v1.tenders',
  bids: 'tg.v1.bids',
  suppliers: 'tg.v1.suppliers',
  contractors: 'tg.v1.contractors',
  session: 'tg.v1.session',
  secrets: 'tg.v1.secrets',
  walletLedger: 'tg.v1.walletLedger',
  tenderState: 'tg.v1.tenderState',
  demo: 'tg.v1.demo'
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getStorageKey(name) {
  return `${STORAGE_PREFIX}${name}`;
}

export function seedDemoContractor() {
  const contractors = readJSON(STORAGE_KEYS.contractors, []);
  const demoContractor = {
    contractorId: 'TG-1042',
    supplierId: 'TG-1042',
    company: 'ABC Infrastructure Pvt Ltd',
    email: 'demo@abcinfra.example',
    phone: '+91 98765 43210',
    passwordHash: null,
    category: 'Infrastructure',
    yearsOfExperience: 8,
    gstin: '27ABCDE1234F1Z5',
    walletAddress: '0xABCD12347890EFAB5678901234567890ABCD1234',
    walletLabel: 'Wallet: 0xABCD...1234 (demo)',
    reputation: 91,
    reputationLabel: 'Top performer',
    isDemo: true,
    history: [],
    business: {
      registrationId: 'ABC-INF-2023',
      contactName: 'Rakesh Mehta',
      businessType: 'Engineering & Construction',
      gstin: '27ABCDE1234F1Z5'
    },
    createdAt: '2026-09-01T10:00:00Z'
  };
  const existing = contractors.find((c) => c.email === demoContractor.email);
  if (!existing) {
    contractors.push(demoContractor);
    writeJSON(STORAGE_KEYS.contractors, contractors);
  }
  return demoContractor;
}

export function ensureSeeded() {
  if (!localStorage) return;

  const existingTenders = readJSON(STORAGE_KEYS.tenders, null);
  if (!existingTenders) {
    writeJSON(STORAGE_KEYS.tenders, clone(initialTenders));
  }

  const existingBids = readJSON(STORAGE_KEYS.bids, null);
  if (!existingBids) {
    writeJSON(STORAGE_KEYS.bids, clone(initialBids));
  }

  const existingSuppliers = readJSON(STORAGE_KEYS.suppliers, null);
  if (!existingSuppliers) {
    writeJSON(STORAGE_KEYS.suppliers, clone(initialSuppliers));
  }

  const existingContractors = readJSON(STORAGE_KEYS.contractors, null);
  if (!existingContractors) {
    writeJSON(STORAGE_KEYS.contractors, []);
  }

  const existingSecrets = readJSON(STORAGE_KEYS.secrets, null);
  if (!existingSecrets) {
    writeJSON(STORAGE_KEYS.secrets, {});
  }

  const existingWalletLedger = readJSON(STORAGE_KEYS.walletLedger, null);
  if (!existingWalletLedger) {
    writeJSON(STORAGE_KEYS.walletLedger, {
      '0xABCD12347890EFAB5678901234567890ABCD1234': { balance: 250, locked: 0 }
    });
  }

  const existingTenderState = readJSON(STORAGE_KEYS.tenderState, null);
  if (!existingTenderState) {
    writeJSON(STORAGE_KEYS.tenderState, {
      T003: 'OPEN',
      T004: 'OPEN',
      T005: 'REVEAL'
    });
  }

  seedDemoContractor();

  if (!readJSON(STORAGE_KEYS.session, null)) {
    writeJSON(STORAGE_KEYS.session, null);
  }
}

export function resetAll() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
  ensureSeeded();
  return true;
}

export function readData(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  return readJSON(getStorageKey(key), fallback);
}

export function writeData(key, value) {
  if (typeof window === 'undefined') return value;
  writeJSON(getStorageKey(key), value);
  return value;
}

export function getAllTenders() {
  return readJSON(STORAGE_KEYS.tenders, clone(initialTenders));
}

export function getAllBids() {
  return readJSON(STORAGE_KEYS.bids, clone(initialBids));
}

export function getAllSuppliers() {
  return readJSON(STORAGE_KEYS.suppliers, clone(initialSuppliers));
}

export function getAllContractors() {
  return readJSON(STORAGE_KEYS.contractors, []);
}

export function getSession() {
  return readJSON(STORAGE_KEYS.session, null);
}

export function setSession(value) {
  writeJSON(STORAGE_KEYS.session, value);
  return value;
}

export function getSecrets() {
  return readJSON(STORAGE_KEYS.secrets, {});
}

export function setSecrets(value) {
  writeJSON(STORAGE_KEYS.secrets, value);
  return value;
}

export function getWalletLedger() {
  return readJSON(STORAGE_KEYS.walletLedger, {});
}

export function setWalletLedger(value) {
  writeJSON(STORAGE_KEYS.walletLedger, value);
  return value;
}

export function getTenderState() {
  return readJSON(STORAGE_KEYS.tenderState, {});
}

export function setTenderState(value) {
  writeJSON(STORAGE_KEYS.tenderState, value);
  return value;
}

export function setStorageValue(key, value) {
  writeJSON(key, value);
  return value;
}

export function getStorageValue(key, fallback) {
  return readJSON(key, fallback);
}

export function clearSession() {
  setSession(null);
}

export default {
  STORAGE_KEYS,
  ensureSeeded,
  resetAll,
  readData,
  writeData,
  getAllTenders,
  getAllBids,
  getAllSuppliers,
  getAllContractors,
  getSession,
  setSession,
  getSecrets,
  setSecrets,
  getWalletLedger,
  setWalletLedger,
  getTenderState,
  setTenderState,
  getStorageKey
};
