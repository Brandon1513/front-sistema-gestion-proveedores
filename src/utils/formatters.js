export const formatMoney = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : '—');

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const matchesTokens = (haystack, query) => {
  if (!query?.trim()) return true;
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const text = (haystack || '').toLowerCase();
  return tokens.every((t) => text.includes(t));
};