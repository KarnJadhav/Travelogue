import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Divider,
  Avatar,
  Rating,
  LinearProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  DateRange as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  MessageOutlined as MessageIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  Check as CheckIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckmarkIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: '#FFA500',
    bgColor: '#FFF3E0',
    icon: <ClockIcon sx={{ fontSize: 16 }} />,
    description: 'Awaiting confirmation'
  },
  confirmed: {
    label: 'Confirmed',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    icon: <CheckIcon sx={{ fontSize: 16 }} />,
    description: 'Ready for your tour'
  },
  completed: {
    label: 'Completed',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    icon: <CheckmarkIcon sx={{ fontSize: 16 }} />,
    description: 'Tour finished'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#F44336',
    bgColor: '#FFEBEE',
    icon: <></>,
    description: 'Booking cancelled'
  }
};

const PremiumBookingCard = ({
  booking,
  onChat,
  onEdit,
  onDelete,
  onPayAdvance,
  isEditable,
  loading = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[booking.status] || statusConfig.pending;

  // Get currency symbol and rate type info
  const getCurrencyInfo = () => {
    const rateType = booking.guideId?.rateType || 'daily';
    const currency = 'INR';
    const symbol = '₹';
    const rateTypeLabel = rateType === 'hourly' ? '/hour' : '/day';
    return { symbol, rateTypeLabel, currency, rateType };
  };

  const currencyInfo = getCurrencyInfo();

  // Calculate days until tour
  const daysUntil = booking.startDateTime
    ? Math.ceil((new Date(booking.startDateTime) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const isDaysUntilPositive = daysUntil !== null && daysUntil > 0;

  // Format dates
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startFormatted = booking.startDateTime ? formatDateTime(booking.startDateTime) : null;
  const endFormatted = booking.endDateTime ? formatDateTime(booking.endDateTime) : null;
  const advanceStatus = booking.advancePaymentStatus || 'awaiting_payment';
  const remainingStatus = booking.remainingPaymentStatus || 'pending';
  const showAdvanceAction = booking.status === 'pending' && ['awaiting_payment', 'rejected'].includes(advanceStatus);
  const advanceLabel = advanceStatus === 'submitted'
    ? 'Advance submitted'
    : advanceStatus === 'verified'
      ? 'Advance verified'
      : advanceStatus === 'rejected'
        ? 'Advance rejected'
        : 'Advance pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        sx={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid rgba(79, 138, 139, 0.1)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(79, 138, 139, 0.15)',
            borderColor: 'rgba(79, 138, 139, 0.25)'
          }
        }}
      >
        {/* Card Header with Status Badge */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${config.bgColor} 0%, rgba(79, 138, 139, 0.03) 100%)`,
            p: 3,
            borderBottom: '1px solid rgba(79, 138, 139, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Box sx={{ flex: 1 }}>
            {/* Status Badge and Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip
                label={config.label}
                size="small"
                icon={config.icon}
                sx={{
                  backgroundColor: config.color,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}
              />
              {isDaysUntilPositive && (
                <Chip
                  label={`${daysUntil} days away`}
                  size="small"
                  sx={{
                    backgroundColor: '#E8F5E9',
                    color: '#2E7D32',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
              )}
            </Box>

            {/* Title and Location */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#1a1a1a',
                mb: 1,
                fontSize: '1.3rem'
              }}
            >
              {booking.destination || 'Tour Booking'}
            </Typography>

            {/* Guide Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.9rem' }}>
              <PersonIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                Guide: <strong>{booking.guideId?.name || booking.guideId}</strong>
              </Typography>
            </Box>
          </Box>

          {/* Price and More Menu */}
          <Box sx={{ textAlign: 'right' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 0.5, mb: 1 }}>
              <Typography
                sx={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {currencyInfo.symbol}{booking.price || 0}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#4F8A8B', mb: 0.25 }}>
                {currencyInfo.rateTypeLabel}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Total Price
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: advanceStatus === 'verified' ? '#166534' : '#b45309', fontWeight: 700, mt: 0.5 }}>
              {advanceLabel}
            </Typography>
          </Box>
        </Box>

        {/* Card Body - Collapsible Details */}
        <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 3 }}>
            <Divider sx={{ mb: 2.5, borderColor: 'rgba(79, 138, 139, 0.1)' }} />

            {/* Booking Details Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
              {/* Start Date/Time */}
              {startFormatted && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Start Date & Time
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <CalendarIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {startFormatted.date} at {startFormatted.time}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* End Date/Time */}
              {endFormatted && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    End Date & Time
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <CalendarIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {endFormatted.date} at {endFormatted.time}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Booking ID */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Booking ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {booking._id?.slice(-8).toUpperCase() || 'N/A'}
                </Typography>
              </Box>

              {/* Duration */}
              {booking.startDateTime && booking.endDateTime && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Duration
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {Math.ceil((new Date(booking.endDateTime) - new Date(booking.startDateTime)) / (1000 * 60 * 60 * 24))} Days
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Advance
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: advanceStatus === 'verified' ? '#166534' : '#92400e' }}>
                  {currencyInfo.symbol}{booking.advanceAmount || 0} - {advanceLabel}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Remaining Balance
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: remainingStatus === 'paid' ? '#166534' : '#92400e' }}>
                  {currencyInfo.symbol}{booking.remainingAmount || 0} - {remainingStatus === 'paid' ? 'Received by guide' : 'Pay during tour'}
                </Typography>
              </Box>
            </Box>

            {booking.advanceRejectedReason && (
              <Box
                sx={{
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: '10px',
                  p: 2,
                  mb: 2.5,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#9a3412', mb: 0.5 }}>
                  Advance payment needs attention
                </Typography>
                <Typography variant="body2" sx={{ color: '#7c2d12' }}>
                  {booking.advanceRejectedReason}
                </Typography>
              </Box>
            )}

            {/* Review Request Section */}
            {booking.status === 'completed' && booking.reviewRequestSent && !booking.reviewRequestStatus && (
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%)',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(33, 150, 243, 0.2)',
                  p: 2.5,
                  mb: 2.5
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
                  🌟 Message from your guide:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6, whiteSpace: 'pre-line', color: '#555' }}>
                  {booking.reviewRequestMessage}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Box
                    component="button"
                    onClick={() => onEdit?.(booking)}
                    sx={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#1976D2',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
                      }
                    }}
                  >
                    Accept & Leave Review
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Card Footer - Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2.5,
            borderTop: '1px solid rgba(79, 138, 139, 0.1)',
            backgroundColor: 'rgba(79, 138, 139, 0.02)'
          }}
        >
          {/* Expand Button */}
          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{
              color: '#4F8A8B',
              '&:hover': { backgroundColor: 'rgba(79, 138, 139, 0.1)' }
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            {/* Chat Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChat?.(booking._id)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => (e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)')}
              onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
            >
              <MessageIcon sx={{ fontSize: 16 }} /> Chat
            </motion.button>

            {/* Edit Button - Only for pending/cancelled */}
            {isEditable && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit?.(booking)}
                style={{
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => (e.target.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)')}
                onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
              >
                <EditIcon sx={{ fontSize: 16 }} /> Edit
              </motion.button>
            )}

            {/* Delete Button - Only for pending/cancelled */}
            {isEditable && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete?.(booking._id)}
                style={{
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => (e.target.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.3)')}
                onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
              >
                <DeleteIcon sx={{ fontSize: 16 }} /> Delete
              </motion.button>
            )}

            {showAdvanceAction && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPayAdvance?.(booking)}
                style={{
                  backgroundColor: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s ease',
                }}
              >
                {advanceStatus === 'rejected' ? 'Resubmit Advance' : 'Pay Advance'}
              </motion.button>
            )}
          </Stack>
        </Box>
      </Card>
    </motion.div>
  );
};

export default PremiumBookingCard;
