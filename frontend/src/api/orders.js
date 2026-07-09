import client from './client';

export function createOrder(data) {
  return client.post('/orders', data);
}

export function getOrders(params) {
  return client.get('/orders', { params });
}

export function getOrder(orderId) {
  return client.get(`/orders/${orderId}`);
}
