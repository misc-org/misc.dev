export function formatDate(dateString: string | number | Date) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
