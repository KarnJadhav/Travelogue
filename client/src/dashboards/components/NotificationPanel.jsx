import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import Divider from '@mui/material/Divider';
import api from '../../api';

export default function NotificationPanel({ onActionComplete, chatNotifications = {}, onChatClick = () => {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [replyValue, setReplyValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/tourist');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('[NotificationPanel] Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const chatNotificationEntries = Object.entries(chatNotifications).sort(([, a], [, b]) => {
    const aTime = Number(a?.timestamp || 0);
    const bTime = Number(b?.timestamp || 0);
    return bTime - aTime;
  });
  const chatUnreadCount = chatNotificationEntries.reduce(
    (sum, [, notif]) => sum + Number(notif?.unreadCount || 0),
    0
  );

  // Calculate total notification count (tour notifications + chat unread messages)
  const totalNotificationCount = notifications.length + chatUnreadCount;

  const handleReplyClick = (notif, action) => {
    setSelectedNotif({ ...notif, action });
    setReplyValue('');
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    setLoading(true);
    try {
      console.log('[NotificationPanel] Sending reply:', {
        notificationId: selectedNotif.id,
        action: selectedNotif.action,
        message: replyValue
      });
      
      await api.post('/notifications/tourist/respond', {
        notificationId: selectedNotif.id,
        action: selectedNotif.action,
        message: replyValue
      });
      
      setNotifications((prev) => prev.filter((n) => n.id !== selectedNotif.id));
      setReplyDialogOpen(false);
      
      const actionText = selectedNotif.action === 'accept' ? 'confirmed' : 'declined';
      setSnackbar({ 
        open: true, 
        message: `You have ${actionText} the tour completion.`, 
        severity: selectedNotif.action === 'accept' ? 'success' : 'info' 
      });
      
      // Trigger parent refresh to update ReviewsPanel
      if (onActionComplete) {
        console.log('[NotificationPanel] Calling onActionComplete callback');
        onActionComplete();
      }
      if (selectedNotif.action === 'accept') {
        window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Reviews' } }));
      }
    } catch (err) {
      console.error('[NotificationPanel] Failed to send reply:', err);
      setSnackbar({ 
        open: true, 
        message: 'Failed to respond to notification: ' + (err.response?.data?.error || err.message), 
        severity: 'error' 
      });
    }
    setLoading(false);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      {/* Notification Icon Button */}
      <IconButton
        onClick={handleOpen}
        size="large"
        color="inherit"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          }
        }}
      >
        <Badge badgeContent={totalNotificationCount} color="error" overlap="circular">
          {totalNotificationCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      {/* Notification Popover Panel */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 24px)', sm: 420 },
            maxWidth: '100vw',
            maxHeight: { xs: 'calc(100vh - 96px)', sm: 600 },
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            mt: 1,
          }
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon sx={{ color: 'primary.main' }} />
              Notifications
            </Typography>
            {totalNotificationCount > 0 && (
              <Chip 
                label={`${totalNotificationCount} New`}
                size="small"
                sx={{ 
                  bgcolor: '#fee2e2',
                  color: '#991b1b',
                  fontWeight: 700
                }}
              />
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* Notifications List */}
          <Stack spacing={2} sx={{ maxHeight: isMobile ? 'calc(100vh - 190px)' : 500, overflowY: 'auto' }}>
            {totalNotificationCount === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  ✨ No notifications
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  You're all caught up!
                </Typography>
              </Box>
            ) : (
              <>
                {/* Chat Notifications Section */}
                {chatNotificationEntries.length > 0 && (
                  <>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 0.5, mt: 1 }}>
                      💬 MESSAGES
                    </Typography>
                    {chatNotificationEntries.map(([guideId, notif]) => (
                      <Box key={`chat-${guideId}`}>
                        <Paper 
                          onClick={() => {
                            onChatClick();
                            handleClose();
                          }}
                          sx={{ 
                            p: 2.5, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 1.5,
                            bgcolor: '#f0f9ff',
                            border: '1px solid #06b6d4',
                            borderRadius: 2.5,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: '0 6px 15px rgba(6,182,212,0.2)',
                              borderColor: '#0891b2',
                              bgcolor: '#e0f7ff',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          {/* Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1.5, flex: 1 }}>
                              <Avatar 
                                src={notif.avatar}
                                sx={{ 
                                  bgcolor: '#cffafe', 
                                  color: '#06b6d4', 
                                  fontWeight: 700, 
                                  width: 40, 
                                  height: 40,
                                  fontSize: '0.95rem'
                                }}
                              >
                                {notif.name?.charAt(0)?.toUpperCase() || '?'}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                  💬 {notif.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  {notif.unreadCount} unread message{notif.unreadCount !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            </Box>
                            <Chip 
                              label={notif.unreadCount} 
                              size="small"
                              sx={{ 
                                bgcolor: '#06b6d4', 
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }} 
                            />
                          </Box>

                          {/* Message Preview */}
                          <Box sx={{ 
                            p: 1.5, 
                            bgcolor: '#e0f7ff', 
                            borderRadius: 1.5, 
                            borderLeft: '3px solid #06b6d4'
                          }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#164e63', 
                                fontSize: '0.85rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notif.preview}
                            </Typography>
                          </Box>
                        </Paper>
                      </Box>
                    ))}
                    {notifications.length > 0 && <Divider sx={{ my: 1 }} />}
                  </>
                )}
                
                {/* Tour Notifications Section */}
                {notifications.map((notif, index) => (
                  <Box key={notif.id}>
                  <Paper 
                    sx={{ 
                      p: 2.5, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 1.5,
                      bgcolor: '#fafafa',
                      border: '1px solid #e5e7eb',
                      borderRadius: 2.5,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        borderColor: '#1976d2',
                        bgcolor: '#ffffff'
                      }
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, flex: 1 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: '#dbeafe', 
                            color: '#1976d2', 
                            fontWeight: 700, 
                            width: 40, 
                            height: 40,
                            fontSize: '0.95rem'
                          }}
                        >
                          {notif.guideName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                            📍 {notif.tourName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            From: {notif.guideName}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label="Pending" 
                        size="small"
                        sx={{ 
                          bgcolor: '#fef3c7', 
                          color: '#92400e',
                          fontWeight: 700,
                          fontSize: '0.7rem'
                        }} 
                      />
                    </Box>

                    {/* Message */}
                    <Box sx={{ 
                      p: 1.5, 
                      bgcolor: '#f3f4f6', 
                      borderRadius: 1.5, 
                      borderLeft: '3px solid #1976d2'
                    }}>
                      <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.85rem' }}>
                        💬 {notif.message}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Stack 
                      direction="row" 
                      spacing={1}
                      sx={{ gap: 1, mt: 0.5 }}
                    >
                      <Button 
                        variant="contained"
                        size="small"
                        sx={{
                          flex: 1,
                          bgcolor: '#10b981',
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 1.5,
                          fontSize: '0.8rem',
                          py: 0.8,
                          '&:hover': {
                            bgcolor: '#059669'
                          }
                        }}
                        onClick={() => handleReplyClick(notif, 'accept')}
                      >
                        ✅ Confirm
                      </Button>

                      <Button 
                        variant="outlined"
                        size="small"
                        sx={{
                          flex: 1,
                          borderColor: '#06b6d4',
                          color: '#06b6d4',
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 1.5,
                          fontSize: '0.8rem',
                          py: 0.8,
                          '&:hover': {
                            bgcolor: '#cffafe',
                            borderColor: '#06b6d4'
                          }
                        }}
                        onClick={() => handleReplyClick(notif, 'decline')}
                      >
                        ❌ Decline
                      </Button>
                    </Stack>
                  </Paper>
                  {index < notifications.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </Box>
              ))}
              </>
            )}
          </Stack>
        </Box>
      </Popover>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          {selectedNotif?.action === 'accept' ? '✅ Confirm Tour Completion' : '❌ Explain Status'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Tour: <strong>{selectedNotif?.tourName}</strong>
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
            Guide: <strong>{selectedNotif?.guideName}</strong>
          </Typography>
          
          {selectedNotif?.action === 'accept' ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Please confirm that you have completed this tour and are ready to leave a review.
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#dcfce7', 
                borderRadius: 2, 
                border: '1px solid #bbf7d0'
              }}>
                <Typography variant="body2" color="#065f46" fontWeight={600}>
                  ✅ Review section will be available after confirmation
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Let the guide know your status: (Optional)
              </Typography>
              <Box
                component="textarea"
                sx={{
                  width: '100%',
                  p: 2,
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  minHeight: 100,
                  '&:focus': {
                    outline: 'none',
                    borderColor: '#1976d2',
                    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                  }
                }}
                placeholder="Let the guide know what you need..."
                value={replyValue}
                onChange={(e) => setReplyValue(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setReplyDialogOpen(false)} 
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendReply}
            variant="contained"
            disabled={loading}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700,
              minWidth: 120,
              bgcolor: selectedNotif?.action === 'accept' ? '#10b981' : '#ef4444',
              '&:hover': {
                bgcolor: selectedNotif?.action === 'accept' ? '#059669' : '#dc2626'
              }
            }}
          >
            {loading ? 'Sending...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
