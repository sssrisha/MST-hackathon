export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const numericAmount = Math.round(Number(amount));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numericAmount);
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return isoString;
  }
}

export function shortHash(hash) {
  if (!hash || typeof hash !== 'string') return '—';
  const clean = hash.trim();
  if (clean.length <= 12) return clean;
  // Format as 0x1234...abcd
  const prefix = clean.startsWith('0x') ? clean.slice(0, 6) : `0x${clean.slice(0, 4)}`;
  const suffix = clean.slice(-4);
  return `${prefix}...${suffix}`;
}
