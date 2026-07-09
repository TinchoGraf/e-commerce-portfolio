import client from './client';

export function getBrands() {
  return client.get('/brands');
}
