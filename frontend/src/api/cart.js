import client from './client';

export function getCart() {
  return client.get('/cart');
}

export function addToCart(data) {
  return client.post('/cart/items', data);
}

export function updateCartItem(itemId, data) {
  return client.put(`/cart/items/${itemId}`, data);
}

export function removeCartItem(itemId) {
  return client.delete(`/cart/items/${itemId}`);
}

export function clearCart() {
  return client.delete('/cart');
}
