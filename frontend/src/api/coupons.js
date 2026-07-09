import client from './client';

export function validateCoupon(data) {
  return client.post('/coupons/validate', data);
}
