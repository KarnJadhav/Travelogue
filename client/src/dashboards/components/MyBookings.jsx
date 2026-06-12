
import React, { useEffect, useState, useRef, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import api from '../../api';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../../config/runtime';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Modal from '@mui/material/Modal';
import ChatPanel from './ChatPanel';
import TextField from '@mui/material/TextField';
import Button from '../../common/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Stack, Paper, Skeleton, FormControlLabel, Switch } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import BookingFiltersBar from './BookingFiltersBar';
import PremiumBookingCard from './PremiumBookingCard';
import { buildMediaUrl } from '../../utils/media';
import {
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export default function MyBookings() {
  const [openChat, setOpenChat] = useState(false);
  const [chatBookingId, setChatBookingId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editFields, setEditFields] = useState({ destination: '', date: '', price: 0 });
  const [deleteBookingId, setDeleteBookingId] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [reviewDialog, setReviewDialog] = useState({ open: false, booking: null });
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [advanceDialog, setAdvanceDialog] = useState({ open: false, booking: null });
  const [advanceTxnRef, setAdvanceTxnRef] = useState('');
  const [advanceProofFile, setAdvanceProofFile] = useState(null);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    searchQuery: '',
    statuses: [],
    priceRange: [0, 10000],
    startDate: '',
    endDate: '',
    sortBy: 'date-desc',
    guideIds: [] // Filter by specific guides
  });

  // Open edit booking modal
  const handleOpenEdit = (booking) => {
    setSelectedBooking(booking);
    setEditFields({
      destination: booking.destination || '',
      date: booking.date ? new Date(booking.date).toISOString().slice(0, 10) : '',
      price: booking.price || 0
    });
    setOpenEdit(true);
  };

  // Submit booking edit
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/booking/${selectedBooking._id}`, {
        destination: editFields.destination,
        date: editFields.date,
        price: editFields.price
      });
      setSnackbar({ open: true, message: 'Booking updated successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update booking.', severity: 'error' });
    } finally {
      setOpenEdit(false);
      setSelectedBooking(null);
      // Refresh bookings
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/booking/tourist/${user._id}`);
      setBookings(res.data.bookings || []);
    }
  };

  // Open delete confirmation
  const handleOpenDelete = (bookingId) => {
    setDeleteBookingId(bookingId);
    setOpenDelete(true);
  };

  // Confirm delete booking
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/booking/${deleteBookingId}`);
      setSnackbar({ open: true, message: 'Booking deleted successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete booking.', severity: 'error' });
    } finally {
      setOpenDelete(false);
      setDeleteBookingId(null);
      // Refresh bookings
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/booking/tourist/${user._id}`);
      setBookings(res.data.bookings || []);
    }
  };


  useEffect(() => {
    let socket;
    async function fetchBookings() {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user._id) return;
        const res = await api.get(`/booking/tourist/${user._id}`);
        setBookings(res.data.bookings || []);
        setLoading(false);
        // Setup socket connection for real-time updates
        if (!socket) {
          socket = io(SOCKET_BASE_URL);
          socket.emit('joinTouristRoom', { touristId: user._id });
          socket.on('bookingUpdate', (data) => {
            if (data && data.touristId === user._id) {
              fetchBookings();
            }
          });
        }
      } catch (err) {
        setBookings([]);
        setLoading(false);
      }
    }
    fetchBookings();
    return () => {
      if (socket) {
        socket.off('bookingUpdate');
        socket.disconnect();
      }
    };
  }, []);

  const buildUpiLink = (booking) => {
    const payment = booking?.guidePaymentSnapshot || {};
    const params = new URLSearchParams({
      pa: String(payment?.upiId || '').trim(),
      pn: String(payment?.payeeName || '').trim(),
      am: String(Number(booking?.advanceAmount || 0).toFixed(2)),
      cu: 'INR',
      tn: `Advance for ${booking?.destination || 'guide booking'} (${String(booking?._id || '').slice(-6).toUpperCase()})`,
    });
    return `upi://pay?${params.toString()}`;
  };

  const handleOpenAdvancePayment = (booking) => {
    setAdvanceDialog({ open: true, booking });
    setAdvanceTxnRef(booking?.advanceTxnRef || '');
    setAdvanceProofFile(null);
  };

  const handleSubmitAdvancePayment = async () => {
    if (!advanceDialog.booking?._id) return;
    if (!advanceTxnRef.trim()) {
      setSnackbar({ open: true, message: 'Enter the UPI reference / UTR number.', severity: 'error' });
      return;
    }

    setAdvanceSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('txnRef', advanceTxnRef.trim());
      if (advanceProofFile) formData.append('screenshot', advanceProofFile);
      await api.post(`/booking/${advanceDialog.booking._id}/advance-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/booking/tourist/${user._id}`);
      setBookings(res.data.bookings || []);
      setAdvanceDialog({ open: false, booking: null });
      setAdvanceTxnRef('');
      setAdvanceProofFile(null);
      setSnackbar({ open: true, message: 'Advance payment proof submitted for guide verification.', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to submit advance payment proof.',
        severity: 'error'
      });
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  /**
   * Advanced filtering and sorting logic
   */
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = [...bookings];

    // 1. Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.destination?.toLowerCase().includes(query) ||
        b.guideId?.name?.toLowerCase().includes(query) ||
        b._id?.toLowerCase().includes(query)
      );
    }

    // 2. Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(b => filters.statuses.includes(b.status));
    }

    // 3. Guide filter
    if (filters.guideIds.length > 0) {
      filtered = filtered.filter(b =>
        filters.guideIds.includes(b.guideId?._id?.toString() || b.guideId?.toString())
      );
    }

    // 4. Price range filter
    filtered = filtered.filter(b =>
      b.price >= filters.priceRange[0] && b.price <= filters.priceRange[1]
    );

    // 5. Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(b =>
        new Date(b.startDateTime) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(b =>
        new Date(b.startDateTime) <= new Date(filters.endDate)
      );
    }

    // 6. Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc':
          return new Date(b.startDateTime) - new Date(a.startDateTime);
        case 'date-asc':
          return new Date(a.startDateTime) - new Date(b.startDateTime);
        case 'price-desc':
          return b.price - a.price;
        case 'price-asc':
          return a.price - b.price;
        case 'status':
          const statusOrder = { pending: 1, confirmed: 2, completed: 3, cancelled: 4 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookings, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const calculateActualPaid = (booking) => {
      const advancePaid = ['submitted', 'verified'].includes(String(booking.advancePaymentStatus || ''))
        ? Number(booking.advanceAmount || 0)
        : 0;
      const remainingPaid = booking.remainingPaymentStatus === 'paid'
        ? Number(booking.remainingAmount || 0)
        : 0;
      return advancePaid + remainingPaid;
    };

    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalSpent: bookings.reduce((sum, booking) => sum + calculateActualPaid(booking), 0)
    };
  }, [bookings]);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      statuses: [],
      priceRange: [0, 10000],
      startDate: '',
      endDate: '',
      sortBy: 'date-desc',
      guideIds: []
    });
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pb: 5 }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            My Bookings
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: '1rem' }}>
            Track, manage, and review all your tour bookings in one place
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {!loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
            <motion.div whileHover={{ y: -4 }} key="total">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(79, 138, 139, 0.1)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(79, 138, 139, 0.1)',
                    borderColor: 'rgba(79, 138, 139, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase' }}>Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
              </Paper>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} key="pending">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #FFF3E0 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(255, 152, 0, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.1)',
                    borderColor: 'rgba(255, 152, 0, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#FF9800', textTransform: 'uppercase' }}>Pending</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF9800' }}>{stats.pending}</Typography>
              </Paper>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} key="confirmed">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #E8F5E9 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.1)',
                    borderColor: 'rgba(76, 175, 80, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4CAF50', textTransform: 'uppercase' }}>Confirmed</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>{stats.confirmed}</Typography>
              </Paper>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} key="completed">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(33, 150, 243, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.1)',
                    borderColor: 'rgba(33, 150, 243, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#2196F3', textTransform: 'uppercase' }}>Completed</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196F3' }}>{stats.completed}</Typography>
              </Paper>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} key="cancelled">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #FFEBEE 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(244, 67, 54, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.1)',
                    borderColor: 'rgba(244, 67, 54, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#F44336', textTransform: 'uppercase' }}>Cancelled</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F44336' }}>{stats.cancelled}</Typography>
              </Paper>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} key="spent">
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, #F3E5F5 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid rgba(156, 39, 176, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(156, 39, 176, 0.1)',
                    borderColor: 'rgba(156, 39, 176, 0.3)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#9C27B0', textTransform: 'uppercase' }}>Total Spent</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#9C27B0' }}>₹{stats.totalSpent}</Typography>
              </Paper>
            </motion.div>
          </Box>
        )}
      </motion.div>

      {/* Filters Bar */}
      <BookingFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        totalBookings={bookings.length}
        filteredCount={filteredAndSortedBookings.length}
        bookings={bookings}
      />

      {/* View Mode Toggle */}
      {!loading && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 1 }}>
          <Paper elevation={0} sx={{ background: 'rgba(79, 138, 139, 0.05)', borderRadius: '12px', p: 1, display: 'flex', gap: 0.5 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              style={{
                backgroundColor: viewMode === 'grid' ? '#4F8A8B' : 'transparent',
                color: viewMode === 'grid' ? 'white' : '#4F8A8B',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <GridViewIcon sx={{ fontSize: 16 }} /> Grid
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? '#4F8A8B' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#4F8A8B',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ListViewIcon sx={{ fontSize: 16 }} /> List
            </motion.button>
          </Paper>
        </Box>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={300} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
      )}

      {/* No Bookings State */}
      {!loading && filteredAndSortedBookings.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%)',
              borderRadius: '16px',
              border: '2px dashed rgba(79, 138, 139, 0.2)',
              p: 6,
              textAlign: 'center'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#666' }}>
              {bookings.length === 0 ? '📭 No bookings yet' : '🔍 No bookings match your filters'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {bookings.length === 0
                ? 'Start exploring guides and create your first booking to begin your adventure!'
                : 'Try adjusting your filter criteria to see more bookings'}
            </Typography>
            {filteredAndSortedBookings.length === 0 && bookings.length > 0 && (
              <Button onClick={handleClearFilters} className="bg-blue-600 hover:bg-blue-700">
                Clear Filters
              </Button>
            )}
          </Paper>
        </motion.div>
      )}

      {/* Bookings Grid/List View */}
      {!loading && filteredAndSortedBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid'
                ? { xs: '1fr', sm: '1fr', md: '1fr 1fr' }
                : '1fr',
              gap: 3
            }}
          >
            <AnimatePresence>
              {filteredAndSortedBookings.map((booking) => (
                <PremiumBookingCard
                  key={booking._id}
                  booking={booking}
                  onChat={(bookingId) => {
                    setChatBookingId(bookingId);
                    setOpenChat(true);
                  }}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                  onPayAdvance={handleOpenAdvancePayment}
                  isEditable={
                    booking.sourceType !== 'tour' &&
                    (booking.status === 'pending' || booking.status === 'cancelled') &&
                    !['submitted', 'verified'].includes(String(booking.advancePaymentStatus || ''))
                  }
                />
              ))}
            </AnimatePresence>
          </Box>
        </motion.div>
      )}

      {/* Chat Modal */}
      {/* Chat Modal */}
      <Modal open={openChat} onClose={() => setOpenChat(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: '#f8fdf7',
          borderRadius: 2,
          boxShadow: 4,
          p: 0,
          minWidth: { xs: '90vw', sm: 700 },
          minHeight: 500,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          {openChat && chatBookingId && (
            <ChatPanel bookingId={chatBookingId} />
          )}
        </Box>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#fff',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            p: 4,
            minWidth: { xs: '90%', sm: 400 },
            maxWidth: 450
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#1a1a1a' }}>
              Edit Booking
            </Typography>
            <form onSubmit={handleSubmitEdit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Destination"
                  fullWidth
                  value={editFields.destination}
                  onChange={e => setEditFields(f => ({ ...f, destination: e.target.value }))}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&.Mui-focused fieldset': {
                        borderColor: '#4F8A8B'
                      }
                    }
                  }}
                />
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={editFields.date}
                  onChange={e => setEditFields(f => ({ ...f, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&.Mui-focused fieldset': {
                        borderColor: '#4F8A8B'
                      }
                    }
                  }}
                />
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  value={editFields.price}
                  onChange={e => setEditFields(f => ({ ...f, price: e.target.value }))}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&.Mui-focused fieldset': {
                        borderColor: '#4F8A8B'
                      }
                    }
                  }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 2 }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitEdit}
                    style={{
                      background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      flex: 1
                    }}
                  >
                    Save Changes
                  </motion.button>
                  <Button
                    onClick={() => setOpenEdit(false)}
                    className="bg-gray-400 hover:bg-gray-500"
                    sx={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </motion.div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={openDelete} onClose={() => setOpenDelete(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#fff',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            p: 4,
            minWidth: { xs: '90%', sm: 380 },
            maxWidth: 420
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              Delete Booking
            </Typography>
            <Typography variant="body2" sx={{ mb: 4, color: '#666' }}>
              Are you sure you want to delete this booking? This action cannot be undone.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700" sx={{ flex: 1 }}>
                Delete
              </Button>
              <Button onClick={() => setOpenDelete(false)} className="bg-gray-400 hover:bg-gray-500" sx={{ flex: 1 }}>
                Cancel
              </Button>
            </Stack>
          </Box>
        </motion.div>
      </Modal>

      {/* Review Acceptance Dialog */}
      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, booking: null })}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#1a1a1a' }}>
          Accept & Leave Review
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Thank you for agreeing to leave a review! You can now review your guide in the Reviews section.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setReviewDialog({ open: false, booking: null })}>
            Close
          </Button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              setReviewActionLoading(true);
              try {
                await api.put(`/booking/review-request/${reviewDialog.booking._id}/accept`);
                setSnackbar({ open: true, message: 'You can now leave a review for this tour.', severity: 'success' });
                setReviewDialog({ open: false, booking: null });
                // Refresh bookings
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const res = await api.get(`/booking/tourist/${user._id}`);
                setBookings(res.data.bookings || []);
              } catch (err) {
                setSnackbar({ open: true, message: 'Failed to accept review.', severity: 'error' });
              } finally {
                setReviewActionLoading(false);
              }
            }}
            disabled={reviewActionLoading}
            style={{
              background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 20px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}
          >
            Accept & Continue
          </motion.button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={advanceDialog.open}
        onClose={() => setAdvanceDialog({ open: false, booking: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#1a1a1a' }}>
          Complete Advance Payment
        </DialogTitle>
        <DialogContent>
          {advanceDialog.booking && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #dbe3ef' }}>
                <Typography variant="subtitle2" fontWeight={700}>Booking: {advanceDialog.booking.destination || 'Guide Tour'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Pay now: INR {advanceDialog.booking.advanceAmount || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pay later during tour: INR {advanceDialog.booking.remainingAmount || 0}
                </Typography>
              </Box>

              {advanceDialog.booking.guidePaymentSnapshot?.qrImage && (
                <Box
                  component="img"
                  src={buildMediaUrl(advanceDialog.booking.guidePaymentSnapshot.qrImage)}
                  alt="Guide payment QR"
                  sx={{ width: '100%', maxWidth: 240, aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 2, border: '1px solid #dbe3ef', mx: 'auto' }}
                />
              )}

              <Box sx={{ bgcolor: '#fff', p: 2, borderRadius: 2, border: '1px solid #dbe3ef' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>UPI Payee Name</Typography>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{advanceDialog.booking.guidePaymentSnapshot?.payeeName || 'Not provided'}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>UPI ID</Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <Typography sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{advanceDialog.booking.guidePaymentSnapshot?.upiId || 'Not provided'}</Typography>
                  {advanceDialog.booking.guidePaymentSnapshot?.upiId && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(advanceDialog.booking.guidePaymentSnapshot.upiId);
                          setSnackbar({ open: true, message: 'UPI ID copied.', severity: 'success' });
                        } catch {
                          setSnackbar({ open: true, message: 'Could not copy UPI ID.', severity: 'error' });
                        }
                      }}
                    >
                      Copy
                    </Button>
                  )}
                </Stack>
                {advanceDialog.booking.guidePaymentSnapshot?.advancePaymentNotes && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    {advanceDialog.booking.guidePaymentSnapshot.advancePaymentNotes}
                  </Alert>
                )}
              </Box>

              {advanceDialog.booking.guidePaymentSnapshot?.upiId && (
                <Button
                  variant="contained"
                  onClick={() => { window.location.href = buildUpiLink(advanceDialog.booking); }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Open In UPI App
                </Button>
              )}

              <TextField
                label="UPI Reference / UTR Number"
                fullWidth
                value={advanceTxnRef}
                onChange={(event) => setAdvanceTxnRef(event.target.value)}
                placeholder="Example: 412345678901"
              />

              <Button component="label" variant="outlined" sx={{ textTransform: 'none', fontWeight: 700, width: 'fit-content' }}>
                {advanceProofFile ? 'Change Screenshot' : 'Upload Screenshot (Optional)'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => setAdvanceProofFile(event.target.files?.[0] || null)}
                />
              </Button>
              {advanceProofFile && (
                <Typography variant="caption" color="text.secondary">
                  Selected: {advanceProofFile.name}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setAdvanceDialog({ open: false, booking: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAdvancePayment}
            disabled={advanceSubmitting}
            variant="contained"
          >
            {advanceSubmitting ? 'Submitting...' : 'Submit Advance Proof'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notifications */}
      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
