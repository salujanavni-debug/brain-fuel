export function formatTimestamp(isoString) {
  if (!isoString) return 'Not checked yet';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatLatency(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return '—';
  return `${Math.round(ms)} ms`;
}
