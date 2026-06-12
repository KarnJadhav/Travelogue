import api from '../../src/api';

// Dashboard Stats
export const getDashboardStats = async () => {
  return api.get('/adminDashboard/dashboard-stats');
};

// Users
export const getAllUsers = async () => {
  return api.get('/admin/users');
};

export const bulkUpdateUsers = async (userIds, updates) => {
  return api.post('/admin/users/bulk-update', { userIds, updates });
};

export const bulkDeleteUsers = async (userIds) => {
  return api.post('/admin/users/bulk-delete', { userIds });
};

// Reviews
export const getAllReviews = async (params) => {
  return api.get('/adminReview/all-reviews', { params });
};

export const getReviewStats = async () => {
  return api.get('/adminReview/stats');
};

export const bulkActionReviews = async (reviewIds, action, reason = '') => {
  return api.post('/admin/reviews/bulk-action', { reviewIds, action, reason });
};

// Travelogues
export const getAllTravelogues = async () => {
  return api.get('/adminTravelogue');
};

export const bulkActionTravelogues = async (travelogueIds, action) => {
  return api.post('/admin/travelogues/bulk-action', { travelogueIds, action });
};

// Guides
export const getPendingGuides = async () => {
  return api.get('/adminGuide/pending');
};

// Activity Log
export const getActivityLog = async (params) => {
  return api.get('/admin/activity-log', { params });
};

export const logActivity = async (activity) => {
  return api.post('/admin/activity-log', activity);
};

// Notifications
export const getNotifications = async () => {
  return api.get('/admin/notifications');
};

export const markNotificationAsRead = async (notificationId) => {
  return api.put(`/admin/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async () => {
  return api.put('/admin/notifications/mark-all-read');
};

export const deleteNotification = async (notificationId) => {
  return api.delete(`/admin/notifications/${notificationId}`);
};

// Destinations
export const getAllDestinations = async () => {
  return api.get('/destination');
};

export const createDestination = async (data) => {
  return api.post('/destination', data);
};

export const updateDestination = async (id, data) => {
  return api.put(`/destination/${id}`, data);
};

export const deleteDestination = async (id) => {
  return api.delete(`/destination/${id}`);
};

// System Health
export const getSystemHealth = async () => {
  return api.get('/admin/system-health');
};

// Analytics
export const getAnalytics = async (params) => {
  return api.get('/admin/analytics', { params });
};
