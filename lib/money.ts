/**
 * All money in the customer app is integer paise, exactly as the server sends
 * it. Only this function turns it into text; nothing ever does float maths.
 */
export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  // Indian digit grouping: 12,34,567
  const digits = String(rupees);
  const grouped =
    digits.length > 3 ? digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + digits.slice(-3) : digits;
  return `${negative ? '-' : ''}₹${grouped}${fraction === 0 ? '' : '.' + String(fraction).padStart(2, '0')}`;
}
