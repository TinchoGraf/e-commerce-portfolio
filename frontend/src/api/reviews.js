import client from './client';

export function getProductReviews(productId, params) {
  return client.get(`/reviews/product/${productId}`, { params });
}

export function createReview(data) {
  return client.post('/reviews', data);
}

export function updateReview(reviewId, data) {
  return client.put(`/reviews/${reviewId}`, data);
}

export function deleteReview(reviewId) {
  return client.delete(`/reviews/${reviewId}`);
}
