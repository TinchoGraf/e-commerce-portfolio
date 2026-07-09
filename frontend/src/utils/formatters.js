const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatPrice(amount) {
  return priceFormatter.format(Number(amount) || 0);
}

export function formatDate(dateString) {
  return dateFormatter.format(new Date(dateString));
}

export function calculateDiscountPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) {
    return 0;
  }
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
