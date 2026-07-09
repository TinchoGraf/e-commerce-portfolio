import client from './client';

export function getProducts(params) {
  return client.get('/products', { params });
}

export function getProductBySlug(slug) {
  return client.get(`/products/${slug}`);
}
