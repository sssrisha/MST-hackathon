export async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(text));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function makeCommitment(amount, salt) {
  const text = `${amount}:${salt}`;
  const hex = await sha256Hex(text);
  return `0x${hex}`;
}

export function makeBidCommitment({ tenderId, wallet, amount, salt }) {
  const cleanWallet = String(wallet || '').trim().toLowerCase();
  const cleanAmount = Number(amount);
  const preimage = `${tenderId}:${cleanWallet}:${cleanAmount}:${String(salt)}`;
  const hex = Array.from(new TextEncoder().encode(preimage))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

export function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
