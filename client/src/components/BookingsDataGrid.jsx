import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Grid,
  Avatar,
  MenuItem,
} from '@mui/material';
import api from '../api';

const getStatusConfig = (status) => {
  const configs = {
    pending: { color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳', label: 'Pending' },
    confirmed: { color: '#10b981', bgColor: '#d1fae5', icon: '✅', label: 'Confirmed' },
    accepted: { color: '#10b981', bgColor: '#d1fae5', icon: '✅', label: 'Accepted' },
    completed: { color: '#06b6d4', bgColor: '#cffafe', icon: '✓', label: 'Completed' },
    rejected: { color: '#ef4444', bgColor: '#fee2e2', icon: '❌', label: 'Rejected' },
    cancelled: { color: '#ef4444', bgColor: '#fee2e2', icon: '✕', label: 'Cancelled' },
  };
  return configs[status?.toLowerCase()] || configs.pending;
};

const getAdvanceLabel = (advanceStatus) => {
  if (advanceStatus === 'submitted') return 'Proof submitted';
  if (advanceStatus === 'verified') return 'Verified';
  if (advanceStatus === 'rejected') return 'Rejected - waiting for tourist resubmission';
  return 'Waiting for tourist payment';
};

const BookingCard = ({
  booking,
  nowMs,
  isLoading,
  onVerifyAdvance,
  onOpenRejectAdvance,
  onRejectBooking,
  onChat,
  onCompleteTour,
  onOpenRemainingDialog,
}) => {
  const status = booking.status?.toLowerCase() || 'pending';
  const statusConfig = getStatusConfig(status);
  const advanceStatus = booking.advancePaymentStatus || 'awaiting_payment';
  const remainingStatus = booking.remainingPaymentStatus || 'pending';

  let dateRange = '';
  if (booking.startDateTime && booking.endDateTime) {
    const start = new Date(booking.startDateTime);
    const end = new Date(booking.endDateTime);
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      dateRange = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  }

  const canVerifyAdvance = status === 'pending' && advanceStatus === 'submitted';
  const waitingForAdvance = status === 'pending' && ['awaiting_payment', 'rejected'].includes(advanceStatus);
  const canCompleteTour = status === 'confirmed' || status === 'accepted';
  const canRejectBooking = status === 'pending';
  const canMarkBalanceReceived = ['confirmed', 'completed'].includes(status) && Number(booking.remainingAmount || 0) > 0 && remainingStatus !== 'paid';

  const endTime = booking?.endDateTime ? new Date(booking.endDateTime) : null;
  const hasValidEndTime = endTime && !Number.isNaN(endTime.getTime());
  const canCompleteNow = canCompleteTour && hasValidEndTime && nowMs >= endTime.getTime();
  const completeHint = canCompleteTour && !canCompleteNow && hasValidEndTime
    ? `You can complete this tour after ${endTime.toLocaleString()}.`
    : '';

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          transform: 'translateY(-4px)',
          borderColor: '#1976d2'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2.5, gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ bgcolor: '#dbeafe', color: '#1976d2', fontWeight: 700 }}>
              {booking.touristId?.name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                {booking.touristId?.name || 'Unknown Tourist'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {booking.touristId?.email || 'No email'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: statusConfig.bgColor,
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 16 }}>{statusConfig.icon}</span>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: statusConfig.color }}>
            {statusConfig.label}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              DESTINATION
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {booking.destination || 'Not specified'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              DATE & TIME
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {dateRange || 'Not set'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              TOTAL BOOKING VALUE
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#1976d2' }}>
              ₹{booking.price || 0}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              BOOKED ON
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {new Date(booking.createdAt || booking.startDateTime).toLocaleDateString()}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #dbe3ef', mb: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          PAYMENT STATUS
        </Typography>
        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
          Advance: ₹{booking.advanceAmount || 0} - {getAdvanceLabel(advanceStatus)}
        </Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color: remainingStatus === 'paid' ? '#166534' : '#92400e' }}>
          Remaining balance: ₹{booking.remainingAmount || 0} - {remainingStatus === 'paid' ? 'Received by guide' : 'Collect during / after tour'}
        </Typography>
        {booking.advanceTxnRef && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            UTR / Ref: <strong>{booking.advanceTxnRef}</strong>
          </Typography>
        )}
        {booking.advanceRejectedReason && (
          <Typography variant="body2" sx={{ mt: 0.75, color: '#b45309' }}>
            Rejection note: {booking.advanceRejectedReason}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        {canVerifyAdvance && (
          <Button
            variant="contained"
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#10b981', padding: '10px 20px' }}
            onClick={onVerifyAdvance}
            disabled={isLoading}
          >
            Verify Advance & Confirm
          </Button>
        )}

        {canVerifyAdvance && (
          <Button
            variant="outlined"
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#f59e0b', color: '#b45309', borderWidth: 2, padding: '10px 20px' }}
            onClick={onOpenRejectAdvance}
            disabled={isLoading}
          >
            Reject Proof
          </Button>
        )}

        {waitingForAdvance && (
          <Button
            variant="outlined"
            fullWidth
            disabled
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#f59e0b', color: '#b45309', padding: '10px 20px' }}
          >
            Waiting For Tourist Advance
          </Button>
        )}

        {canRejectBooking && (
          <Button
            variant="outlined"
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#ef4444', color: '#ef4444', borderWidth: 2, padding: '10px 20px' }}
            onClick={onRejectBooking}
            disabled={isLoading}
          >
            Cancel Booking
          </Button>
        )}

        {canCompleteTour && (
          <Button
            variant="contained"
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#06b6d4', padding: '10px 20px' }}
            onClick={onCompleteTour}
            disabled={isLoading || !canCompleteNow}
          >
            Complete Tour
          </Button>
        )}

        {canMarkBalanceReceived && (
          <Button
            variant="contained"
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#7c3aed', padding: '10px 20px' }}
            onClick={onOpenRemainingDialog}
            disabled={isLoading}
          >
            Mark Balance Received
          </Button>
        )}

        <Button
          variant="outlined"
          fullWidth
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#1976d2', color: '#1976d2', borderWidth: 2, padding: '10px 20px' }}
          onClick={onChat}
        >
          Chat
        </Button>
      </Box>

      {completeHint && (
        <Typography variant="caption" sx={{ mt: 1.5, color: '#b45309', display: 'block' }}>
          {completeHint}
        </Typography>
      )}
    </Box>
  );
};

export default function BookingsDataGrid({ bookings = [], onStatusChange, onChat }) {
  const [msgSuccess, setMsgSuccess] = React.useState(false);
  const [msgBooking, setMsgBooking] = React.useState(null);
  const [completeTourDialogOpen, setCompleteTourDialogOpen] = React.useState(false);
  const [completionMessage, setCompletionMessage] = React.useState('');
  const [completionLoading, setCompletionLoading] = React.useState(false);
  const [completionError, setCompletionError] = React.useState('');
  const [loadingIds, setLoadingIds] = React.useState([]);
  const [filterTab, setFilterTab] = React.useState('all');
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [toast, setToast] = React.useState({ open: false, message: '', severity: 'success' });
  const [advanceReview, setAdvanceReview] = React.useState({ open: false, booking: null, action: 'approve' });
  const [advanceReviewReason, setAdvanceReviewReason] = React.useState('');
  const [advanceReviewLoading, setAdvanceReviewLoading] = React.useState(false);
  const [remainingDialog, setRemainingDialog] = React.useState({ open: false, booking: null });
  const [remainingPaymentMethod, setRemainingPaymentMethod] = React.useState('cash');
  const [remainingPaymentNotes, setRemainingPaymentNotes] = React.useState('');
  const [remainingPaymentLoading, setRemainingPaymentLoading] = React.useState(false);

  React.useEffect(() => {
    const timerId = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timerId);
  }, []);

  const handleStatus = async (id, status) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      await api.patch(`/booking/status/${id}`, { status });
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (onStatusChange) onStatusChange();
      setToast({ open: true, message: status === 'rejected' ? 'Booking cancelled.' : 'Booking updated.', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to update booking status: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
    setLoadingIds((prev) => prev.filter((x) => x !== id));
  };

  const handleOpenCompleteTourDialog = (booking) => {
    setMsgBooking(booking);
    setCompletionMessage('Thank you for booking my tour! I hope you enjoyed the experience. Please leave a review.');
    setCompletionError('');
    setCompleteTourDialogOpen(true);
  };

  const handleCompleteTour = async () => {
    if (!completionMessage.trim()) {
      setCompletionError('Please write a completion message for the tourist.');
      return;
    }
    const bookingEndTime = msgBooking?.endDateTime ? new Date(msgBooking.endDateTime) : null;
    if (!bookingEndTime || Number.isNaN(bookingEndTime.getTime())) {
      setCompletionError('This booking has an invalid end date/time.');
      return;
    }
    if (Date.now() < bookingEndTime.getTime()) {
      setCompletionError(`Tour can be completed only after ${bookingEndTime.toLocaleString()}.`);
      return;
    }
    setCompletionLoading(true);
    setCompletionError('');
    try {
      await api.post(`/booking/complete/${msgBooking._id}`, { message: completionMessage });
      setMsgSuccess(true);
      setCompleteTourDialogOpen(false);
      setCompletionMessage('');
      setMsgBooking(null);
      if (onStatusChange) onStatusChange();
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message;
      setCompletionError('Failed to complete tour: ' + errorMsg);
    }
    setCompletionLoading(false);
  };

  const handleOpenAdvanceReview = (booking, action) => {
    setAdvanceReview({ open: true, booking, action });
    setAdvanceReviewReason(action === 'reject' ? 'Payment proof was not sufficient. Please upload a clearer proof.' : '');
  };

  const submitAdvanceReview = async () => {
    const bookingId = advanceReview.booking?._id;
    if (!bookingId) return;
    setAdvanceReviewLoading(true);
    try {
      await api.patch(`/booking/${bookingId}/verify-advance`, {
        action: advanceReview.action,
        rejectionReason: advanceReviewReason,
      });
      setAdvanceReview({ open: false, booking: null, action: 'approve' });
      setAdvanceReviewReason('');
      if (onStatusChange) onStatusChange();
      setToast({
        open: true,
        message: advanceReview.action === 'approve' ? 'Advance verified and booking confirmed.' : 'Advance proof rejected. Tourist can resubmit.',
        severity: 'success'
      });
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'Failed to review advance payment.', severity: 'error' });
    } finally {
      setAdvanceReviewLoading(false);
    }
  };

  const handleOpenRemainingDialog = (booking) => {
    setRemainingDialog({ open: true, booking });
    setRemainingPaymentMethod('cash');
    setRemainingPaymentNotes('');
  };

  const submitRemainingPayment = async () => {
    const bookingId = remainingDialog.booking?._id;
    if (!bookingId) return;
    setRemainingPaymentLoading(true);
    try {
      await api.patch(`/booking/${bookingId}/remaining-payment`, {
        paymentMethod: remainingPaymentMethod,
        notes: remainingPaymentNotes,
      });
      setRemainingDialog({ open: false, booking: null });
      setRemainingPaymentMethod('cash');
      setRemainingPaymentNotes('');
      if (onStatusChange) onStatusChange();
      setToast({ open: true, message: 'Remaining balance marked as received.', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'Failed to record remaining balance.', severity: 'error' });
    } finally {
      setRemainingPaymentLoading(false);
    }
  };

  const filteredBookings = filterTab === 'all'
    ? bookings
    : bookings.filter((booking) => booking.status?.toLowerCase() === filterTab);

  const counts = {
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status?.toLowerCase() === 'pending').length,
    confirmed: bookings.filter((booking) => booking.status?.toLowerCase() === 'confirmed').length,
    completed: bookings.filter((booking) => booking.status?.toLowerCase() === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status?.toLowerCase() === 'cancelled').length,
  };

  if (!bookings) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <CircularProgress size={40} color="primary" />
      </Box>
    );
  }

  if (bookings.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, p: 4, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#9ca3af' }}>
          No Bookings Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          When tourists book your tours, they&apos;ll appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e5e7eb', p: 2 }}>
        <Tabs
          value={filterTab}
          onChange={(e, value) => setFilterTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              color: '#6b7280',
              '&.Mui-selected': {
                color: '#1976d2',
              }
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#1976d2',
              height: 3
            }
          }}
        >
          <Tab label={`All (${counts.all})`} value="all" />
          <Tab label={`Pending (${counts.pending})`} value="pending" />
          <Tab label={`Confirmed (${counts.confirmed})`} value="confirmed" />
          <Tab label={`Completed (${counts.completed})`} value="completed" />
          <Tab label={`Cancelled (${counts.cancelled})`} value="cancelled" />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {filteredBookings.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">No bookings in this category yet</Typography>
            </Box>
          </Grid>
        ) : (
          filteredBookings.map((booking, idx) => (
            <Grid item xs={12} md={6} lg={4} key={booking._id || idx}>
              <BookingCard
                booking={booking}
                nowMs={nowMs}
                isLoading={loadingIds.includes(booking._id)}
                onVerifyAdvance={() => handleOpenAdvanceReview(booking, 'approve')}
                onOpenRejectAdvance={() => handleOpenAdvanceReview(booking, 'reject')}
                onRejectBooking={() => handleStatus(booking._id, 'rejected')}
                onChat={() => onChat && onChat(booking)}
                onCompleteTour={() => handleOpenCompleteTourDialog(booking)}
                onOpenRemainingDialog={() => handleOpenRemainingDialog(booking)}
              />
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={completeTourDialogOpen} onClose={() => setCompleteTourDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          Complete Tour
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
            Tourist: {msgBooking?.touristId?.name || 'Tourist'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Write a message to send with the tour completion request. The tourist will receive this notification and can then leave a review.
          </Typography>
          <TextField
            autoFocus
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            placeholder="Thank you for booking my tour! I hope you enjoyed the experience. Please leave a review."
            value={completionMessage}
            onChange={(e) => setCompletionMessage(e.target.value)}
            disabled={completionLoading}
            error={!!completionError}
            helperText={completionError}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCompleteTourDialogOpen(false)} disabled={completionLoading}>
            Cancel
          </Button>
          <Button onClick={handleCompleteTour} variant="contained" disabled={completionLoading} sx={{ minWidth: 100, bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}>
            {completionLoading ? <CircularProgress size={18} color="inherit" /> : 'Complete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={advanceReview.open} onClose={() => setAdvanceReview({ open: false, booking: null, action: 'approve' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {advanceReview.action === 'approve' ? 'Verify Advance Payment' : 'Reject Advance Proof'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2 }}>
            {advanceReview.action === 'approve'
              ? 'Approve this tourist’s advance payment proof and confirm the booking.'
              : 'Add a short note so the tourist knows what to fix before resubmitting the payment proof.'}
          </Typography>
          {advanceReview.action === 'reject' && (
            <TextField
              multiline
              minRows={3}
              fullWidth
              label="Rejection Note"
              value={advanceReviewReason}
              onChange={(e) => setAdvanceReviewReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvanceReview({ open: false, booking: null, action: 'approve' })} disabled={advanceReviewLoading}>
            Cancel
          </Button>
          <Button onClick={submitAdvanceReview} variant="contained" disabled={advanceReviewLoading}>
            {advanceReviewLoading ? <CircularProgress size={18} color="inherit" /> : advanceReview.action === 'approve' ? 'Approve & Confirm' : 'Reject Proof'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={remainingDialog.open} onClose={() => setRemainingDialog({ open: false, booking: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Record Remaining Balance
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2 }}>
            Record how you received the remaining amount so your dashboard reflects the real collected revenue.
          </Typography>
          <TextField
            select
            fullWidth
            label="Payment Method"
            value={remainingPaymentMethod}
            onChange={(e) => setRemainingPaymentMethod(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="direct_upi">Direct UPI</MenuItem>
            <MenuItem value="bank_transfer">Bank transfer</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField
            multiline
            minRows={3}
            fullWidth
            label="Notes (optional)"
            value={remainingPaymentNotes}
            onChange={(e) => setRemainingPaymentNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemainingDialog({ open: false, booking: null })} disabled={remainingPaymentLoading}>
            Cancel
          </Button>
          <Button onClick={submitRemainingPayment} variant="contained" disabled={remainingPaymentLoading}>
            {remainingPaymentLoading ? <CircularProgress size={18} color="inherit" /> : 'Mark Received'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={msgSuccess} autoHideDuration={3000} onClose={() => setMsgSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setMsgSuccess(false)} severity="success" variant="filled" sx={{ fontWeight: 600 }}>
          Tour completed and notification sent successfully!
        </Alert>
      </Snackbar>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setToast((prev) => ({ ...prev, open: false }))} severity={toast.severity} variant="filled" sx={{ fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
