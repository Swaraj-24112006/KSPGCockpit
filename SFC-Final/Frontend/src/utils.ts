/**
 * Formats a number to Indian Rupees (₹) using the Indian Numbering System (Lakhs, Crores)
 * e.g., 150000 -> ₹1,50,000
 */
export function formatIndianRupees(val: number): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

/**
 * Returns a compact string in Lakhs or Crores if the amount is large
 * e.g., 150000 -> ₹1.5 Lakhs
 */
export function formatIndianRupeesCompact(val: number): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '₹0';
  }
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Crore`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakh`;
  }
  return formatIndianRupees(val);
}
