import client from './client';

export function getAddresses() {
  return client.get('/addresses');
}

export function getAddress(id) {
  return client.get(`/addresses/${id}`);
}

export function createAddress(data) {
  return client.post('/addresses', data);
}

export function updateAddress(id, data) {
  return client.put(`/addresses/${id}`, data);
}

export function deleteAddress(id) {
  return client.delete(`/addresses/${id}`);
}
