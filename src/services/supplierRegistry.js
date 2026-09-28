/**
 * TenderGuard Supplier Registry Service
 * 
 * Future FastAPI / Contract Route Mappings:
 * - getSuppliers()    -> GET  /api/suppliers (MST contract: getSuppliers())
 * - getSupplier(id)   -> GET  /api/suppliers/:id
 */

import { initialSuppliers } from '../data/suppliers.js';

export const USE_MOCK = true;

let memorySuppliers = [...initialSuppliers];

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getSuppliers() {
  await delay(300);
  return memorySuppliers.map((s) => ({ ...s, mock: true }));
}

export async function getSupplier(id) {
  await delay(300);
  const supplier = memorySuppliers.find((s) => s.id === id);
  if (!supplier) return null;
  return { ...supplier, mock: true };
}
