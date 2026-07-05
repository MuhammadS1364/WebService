/**
 * Converts an ISO date string (YYYY-MM-DD) into DD-MonthName-YYYY format.
 * @param {string} dateString - The date string to convert (e.g., "2026-07-25")
 * @returns {string} The formatted date (e.g., "25-July-2026")
 */
export default function formatResultDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  
  // Check if the date object is valid
  if (isNaN(date.getTime())) {
    return dateString; // Return original if parsing fails
  }

  const day = String(date.getDate()).padStart(2, '0');
  
  // Array of full month names
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${monthName}-${year}`;
}