export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function normalizeAmount(amount: number): number {
  if (isNaN(amount) || amount == null) return 0;
  // Check if amount is in cents (integer and > 100) or already in decimal format
  // If it's an integer and > 100, assume it's in cents and divide by 100
  // Otherwise, assume it's already in decimal format
  return Number.isInteger(amount) && amount > 100 ? amount / 100 : amount;
}

export function formatPrice(amount: number, currencyCode: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { 
    style: "currency", 
    currency: currencyCode, 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(normalizeAmount(amount));
}

export function formatPriceNoDecimals(amount: number, currencyCode: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { 
    style: "currency", 
    currency: currencyCode, 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(normalizeAmount(amount));
}
