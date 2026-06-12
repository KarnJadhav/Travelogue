// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
  PENDING_APPROVAL: 'pending_approval',
  FLAGGED_CONTENT: 'flagged_content',
  USER_ACTIVITY: 'user_activity',
};

export const NOTIFICATION_PRIORITIES = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.unreadCount = 0;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(listeners) {
    this.listeners.forEach(listener => listener(this.notifications, this.unreadCount));
  }

  addNotification(notification) {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    this.notifications.unshift(newNotification);
    if (!newNotification.read) this.unreadCount++;
    this.notify();
    return newNotification;
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notify();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => {
      if (!n.read) n.read = true;
    });
    this.unreadCount = 0;
    this.notify();
  }

  removeNotification(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notify();
  }

  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    this.notify();
  }

  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  success(message, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      priority: NOTIFICATION_PRIORITIES.LOW,
      ...options,
    });
  }

  error(message, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      ...options,
    });
  }

  warning(message, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      ...options,
    });
  }

  info(message, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      priority: NOTIFICATION_PRIORITIES.LOW,
      ...options,
    });
  }

  pendingApproval(title, description, action, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.PENDING_APPROVAL,
      title,
      message: description,
      action,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      ...options,
    });
  }

  flaggedContent(title, description, severity = 'medium', options = {}) {
    const priorityMap = {
      low: NOTIFICATION_PRIORITIES.MEDIUM,
      medium: NOTIFICATION_PRIORITIES.HIGH,
      high: NOTIFICATION_PRIORITIES.CRITICAL,
    };
    return this.addNotification({
      type: NOTIFICATION_TYPES.FLAGGED_CONTENT,
      title,
      message: description,
      severity,
      priority: priorityMap[severity] || NOTIFICATION_PRIORITIES.HIGH,
      ...options,
    });
  }

  userActivity(action, user, options = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPES.USER_ACTIVITY,
      title: `User Activity: ${action}`,
      message: `${user} has ${action.toLowerCase()}`,
      priority: NOTIFICATION_PRIORITIES.LOW,
      ...options,
    });
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

export default notificationManager;
