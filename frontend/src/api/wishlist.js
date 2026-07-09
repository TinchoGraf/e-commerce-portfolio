import client from './client';

export function getWishlist() {
  return client.get('/wishlist');
}

export function addToWishlist(data) {
  return client.post('/wishlist', data);
}

export function removeFromWishlist(productId) {
  return client.delete(`/wishlist/${productId}`);
}
