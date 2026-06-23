export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function normalizeAmount(amount: number): number {
  if (isNaN(amount) || amount == null) return 0;
  // Medusa v2 stores prices as the actual decimal amount (not in cents).
  // For example, £5.00 is stored as 5, not 500.
  return amount;
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
