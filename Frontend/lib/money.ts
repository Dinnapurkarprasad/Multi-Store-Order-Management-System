// Money is a plain JS number off the wire (250.5, not "250.50"). Formatted in
// exactly one place (PRD §9) so ₹1,240.00 looks the same on a ticket, a table
// and a toast.
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (amount: number) => inr.format(amount);
