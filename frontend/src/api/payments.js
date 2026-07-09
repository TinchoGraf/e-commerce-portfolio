import client from './client';

export function createPayment(orderId) {
  return client.post(`/payments/${orderId}/create`);
}

export function mockCheckout(orderId) {
  return client.post(`/payments/mock-checkout/${orderId}`);
}
