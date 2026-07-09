import client from './client';

export function validateCoupon(data, params) {
  return client.post('/coupons/validate', data, { params });
}
