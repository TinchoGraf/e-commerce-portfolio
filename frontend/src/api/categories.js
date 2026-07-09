import client from './client';

export function getCategories() {
  return client.get('/categories');
}

export function getCategoryBySlug(slug) {
  return client.get(`/categories/${slug}`);
}
