// Shared by both internal notification emails that report a trip's
// dates (app/api/travel-kits/route.ts on survey submission, and
// lib/activateTravelKit.ts on purchase/activation) so the "exact dates
// vs month-only" formatting can't drift between the two.
export function formatTripDatesForNotification(
  departureDate: string | null,
  returnDate: string | null,
  travelMonth: string | null
): string {
  if (travelMonth) {
    return `Travel month: ${travelMonth} - exact dates not provided`;
  }

  if (departureDate && returnDate) {
    const start = new Date(`${departureDate}T00:00:00`);
    const end = new Date(`${returnDate}T00:00:00`);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    return `Travel dates: ${departureDate} to ${returnDate} (${days} days)`;
  }

  return "Travel dates: Not set";
}
