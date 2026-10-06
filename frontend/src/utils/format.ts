// Small helpers for showing dates and money the same way everywhere.

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

// Adds days to today and returns the resulting date (used for the due date preview).
export function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
