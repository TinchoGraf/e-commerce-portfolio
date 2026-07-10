import client from './client';

// Dashboard
export const getDashboardMetrics = () => client.get('/admin/dashboard');

// Users
export const getUsers = (params) => client.get('/admin/users', { params });
export const getUser = (userId) => client.get(`/admin/users/${userId}`);
export const updateUserRole = (userId, data) => client.put(`/admin/users/${userId}/role`, data);
export const updateUserStatus = (userId, data) => client.put(`/admin/users/${userId}/status`, data);

// Products admin
export const getAdminProducts = (params) =>
  client.get('/products', { params: { ...params, include_inactive: true } });
export const getAdminProductById = (productId) => client.get(`/products/id/${productId}`);
export const createProduct = (data) => client.post('/products', data);
export const updateProduct = (productId, data) => client.put(`/products/${productId}`, data);
export const deleteProduct = (productId) => client.delete(`/products/${productId}`);
export const addProductImage = (productId, data) => client.post(`/products/${productId}/images`, data);
export const deleteProductImage = (imageId) => client.delete(`/products/images/${imageId}`);
export const addProductVariant = (productId, data) => client.post(`/products/${productId}/variants`, data);
export const updateProductVariant = (variantId, data) => client.put(`/products/variants/${variantId}`, data);
export const deleteProductVariant = (variantId) => client.delete(`/products/variants/${variantId}`);

// Categories / Brands (para dropdowns del form de producto)
export const createCategory = (data) => client.post('/categories', data);
export const updateCategory = (categoryId, data) => client.put(`/categories/${categoryId}`, data);
export const deleteCategory = (categoryId) => client.delete(`/categories/${categoryId}`);
export const createBrand = (data) => client.post('/brands', data);
export const updateBrand = (brandId, data) => client.put(`/brands/${brandId}`, data);
export const deleteBrand = (brandId) => client.delete(`/brands/${brandId}`);
export const getAdminCategories = (params) => client.get('/categories', { params });
export const getAdminBrands = (params) => client.get('/brands', { params });

// Coupons
export const getCoupons = (params) => client.get('/coupons', { params });
export const getCoupon = (couponId) => client.get(`/coupons/${couponId}`);
export const createCoupon = (data) => client.post('/coupons', data);
export const updateCoupon = (couponId, data) => client.put(`/coupons/${couponId}`, data);
export const deleteCoupon = (couponId) => client.delete(`/coupons/${couponId}`);

// Orders admin
export const getAllOrders = (params) => client.get('/orders/admin/all', { params });
export const updateOrderStatus = (orderId, data) => client.put(`/orders/admin/${orderId}`, data);
