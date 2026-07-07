/**
 * Converts an ISO date string (YYYY-MM-DD) into DD-MonthName-YYYY format.
 * @param dateString - The date string to convert (e.g., "2026-07-25")
 * @returns The formatted date (e.g., "25-July-2026") or the original string if parsing fails
 */
export default function formatResultDate(dateString?: string | null): string {
  // Safely handle null, undefined, or empty strings
  if (!dateString) return "";

  const date = new Date(dateString);
  
  // Check if the date object is valid
  if (isNaN(date.getTime())) {
    return dateString; // Return original string if parsing fails
  }

  const day = String(date.getDate()).padStart(2, '0');
  
  // Array of full month names marked as readonly (as const) for better type safety and performance
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ] as const;
  
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${monthName}-${year}`;
}