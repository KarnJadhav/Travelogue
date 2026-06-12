import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationManager, NOTIFICATION_TYPES } from '../services/notificationService';
import { formatTimeAgo } from '../services/utilityService';

const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return <CheckCircleIcon sx={{ color: '#22c55e' }} />;
    case NOTIFICATION_TYPES.ERROR:
      return <ErrorIcon sx={{ color: '#ef4444' }} />;
    case NOTIFICATION_TYPES.WARNING:
      return <WarningIcon sx={{ color: '#fbbf24' }} />;
    default:
      return <InfoIcon sx={{ color: '#3b82f6' }} />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return '#22c55e';
    case NOTIFICATION_TYPES.ERROR:
      return '#ef4444';
    case NOTIFICATION_TYPES.WARNING:
      return '#fbbf24';
    case NOTIFICATION_TYPES.PENDING_APPROVAL:
      return '#3b82f6';
    case NOTIFICATION_TYPES.FLAGGED_CONTENT:
      return '#ef4444';
    default:
      return '#3b82f6';
  }
};

export default function NotificationBell() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = notificationManager.addListener((notifs, count) => {
      setNotifications(notifs);
      setUnreadCount(count);
    });
    return unsubscribe;
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id) => {
    notificationManager.markAsRead(id);
  };

  const handleRemove = (id) => {
    notificationManager.removeNotification(id);
  };

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationManager.clearAll();
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          position: 'relative',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 24px)', sm: 380 },
            maxHeight: 500,
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'light' 
              ? '0 20px 40px rgba(0, 0, 0, 0.1)'
              : '0 20px 40px rgba(0, 0, 0, 0.5)',
          },
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Mark all read
              </Button>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box
          sx={{
            maxHeight: 380,
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: '3px',
            },
          }}
        >
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <AnimatePresence>
              {notifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <MenuItem
                    onClick={() => {
                      if (!notif.read) handleMarkAsRead(notif.id);
                    }}
                    sx={{
                      bgcolor: !notif.read ? alpha(getNotificationColor(notif.type), 0.05) : 'transparent',
                      borderLeft: `3px solid ${getNotificationColor(notif.type)}`,
                      p: 2,
                      mb: 1,
                      mx: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha(getNotificationColor(notif.type), 0.1),
                        pl: 2.5,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                      <Box sx={{ mt: 0.5 }}>
                        {getNotificationIcon(notif.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notif.read ? 500 : 700,
                              flex: 1,
                            }}
                          >
                            {notif.title || notif.message}
                          </Typography>
                          {!notif.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: getNotificationColor(notif.type),
                                ml: 1,
                                mt: 0.5,
                              }}
                            />
                          )}
                        </Box>
                        {notif.title && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              mt: 0.5,
                              lineHeight: 1.4,
                            }}
                          >
                            {notif.message}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatTimeAgo(notif.timestamp)}
                          </Typography>
                          {notif.severity && (
                            <Chip
                              label={notif.severity}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: alpha(getNotificationColor(notif.type), 0.2),
                                color: getNotificationColor(notif.type),
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(notif.id);
                        }}
                        sx={{
                          opacity: 0.5,
                          '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.error.main, 0.1) },
                        }}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  </MenuItem>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Box>

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                color="error"
                startIcon={<ClearAllIcon />}
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}


