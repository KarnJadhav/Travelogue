import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VerifiedIcon from '@mui/icons-material/Verified';
import SecurityIcon from '@mui/icons-material/Security';
import GuideAvailabilityCalendar from './GuideAvailabilityCalendar';
import SlotPicker from './SlotPicker';
import api from '../../api';
import { buildMediaUrl } from '../../utils/media';

const HOLD_WINDOW_MINUTES = 30;
const ACTIVE_BOOKING_STATUSES = new Set(['confirmed']);
const TOUR_DAY_STYLES = {
  backgroundColor: '#dbeafe',
  color: '#1e3a8a',
  borderColor: '#60a5fa',
};

const formatCurrency = (value) => `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;

const isBusyBooking = (booking) => {
  const status = String(booking?.status || '').toLowerCase();
  if (ACTIVE_BOOKING_STATUSES.has(status)) return true;
  if (status !== 'pending') return false;

  const advanceStatus = String(booking?.advancePaymentStatus || '').toLowerCase();
  if (advanceStatus === 'submitted') return true;
  if (advanceStatus === 'awaiting_payment' || advanceStatus === 'rejected') {
    const createdAt = booking?.createdAt ? dayjs(booking.createdAt) : null;
    return Boolean(createdAt?.isValid() && createdAt.isAfter(dayjs().subtract(HOLD_WINDOW_MINUTES, 'minute')));
  }
  return false;
};

const getGuideUserId = (guide) => {
  const rawId =
    guide?.userId?._id ||
    guide?.userId ||
    guide?.guideId?._id ||
    guide?.guideId ||
    guide?.id ||
    guide?._id ||
    '';

  return rawId ? String(rawId) : '';
};

const normalizeDestinationLabel = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeDestinationKey = (value) => normalizeDestinationLabel(value).toLowerCase();

const normalizeGuideServiceDestinations = (guide) => {
  const rawEntries = Array.isArray(guide?.serviceDestinations) ? guide.serviceDestinations : [];

  return rawEntries
    .map((item) => {
      const destination = normalizeDestinationLabel(item?.destination || item?.name || '');
      const price = Number(item?.price || 0);
      if (!destination || !Number.isFinite(price) || price <= 0) return null;
      return {
        _id: String(item?._id || ''),
        destination,
        destinationKey: normalizeDestinationKey(destination),
        price: Math.round(price),
      };
    })
    .filter(Boolean);
};

const toDateKey = (value) => {
  const date = dayjs(value);
  if (!date.isValid()) return '';
  return date.format('YYYY-MM-DD');
};

const getDateKeysBetween = (startValue, endValue) => {
  const start = dayjs(startValue);
  const end = dayjs(endValue);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return [];

  const keys = [];
  let cursor = start.startOf('day');
  const last = end.startOf('day');
  while (cursor.isBefore(last) || cursor.isSame(last, 'day')) {
    keys.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
    if (keys.length > 370) break;
  }
  return keys;
};

const extractGuideTourDateKeys = (tours = []) => {
  const values = (Array.isArray(tours) ? tours : []).flatMap((tour) => {
    const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
    return customDates.map((dateValue) => toDateKey(dateValue)).filter(Boolean);
  });
  return Array.from(new Set(values)).sort();
};

const buildUpiLink = ({ upiId, payeeName, amount, bookingId, destination }) => {
  const params = new URLSearchParams({
    pa: String(upiId || '').trim(),
    pn: String(payeeName || '').trim(),
    am: String(Number(amount || 0).toFixed(2)),
    cu: 'INR',
    tn: `Advance for ${destination || 'guide booking'}${bookingId ? ` (${String(bookingId).slice(-6).toUpperCase()})` : ''}`,
  });
  return `upi://pay?${params.toString()}`;
};

const calculateAdvancePreview = (totalAmount, guide) => {
  const safeTotal = Math.max(0, Math.round(Number(totalAmount || 0)));
  if (safeTotal <= 0) return 0;
  const advanceType = guide?.advancePaymentType === 'fixed' ? 'fixed' : 'percentage';
  const rawValue = Number(guide?.advancePaymentValue || 0);
  const safeValue = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 20;
  if (advanceType === 'fixed') {
    return Math.min(safeTotal, Math.round(safeValue));
  }
  return Math.min(safeTotal, Math.max(1, Math.round((safeTotal * safeValue) / 100)));
};

export default function BookGuideDialog({ open, guide, onClose, onConfirm, onViewReviews }) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slotPickerDate, setSlotPickerDate] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [guideTourDateKeys, setGuideTourDateKeys] = useState([]);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const guideUserId = getGuideUserId(guide);
  const guideTourDaySet = React.useMemo(() => new Set(guideTourDateKeys), [guideTourDateKeys]);
  const serviceDestinations = React.useMemo(() => normalizeGuideServiceDestinations(guide), [guide]);
  const selectedDestinationPricing = React.useMemo(() => {
    const selectedKey = normalizeDestinationKey(destination);
    if (!selectedKey) return null;
    return serviceDestinations.find((item) => item.destinationKey === selectedKey) || null;
  }, [destination, serviceDestinations]);
  const destinationPriceFloor = React.useMemo(() => {
    if (serviceDestinations.length === 0) return Math.max(0, Math.round(Number(guide?.price || 0)));
    return Math.min(...serviceDestinations.map((item) => Number(item.price || 0)).filter((value) => value > 0));
  }, [serviceDestinations, guide?.price]);
  const activeGuideRate = Number(selectedDestinationPricing?.price || destinationPriceFloor || guide?.price || 0);
  const activeRateType = guide?.rateType === 'hourly' ? 'hourly' : 'daily';

  const guideAcceptsAdvance = Boolean(guide?.acceptManualUpi);
  const advanceSetupReady = Boolean(guideAcceptsAdvance && guide?.upiId && guide?.upiPayeeName && guide?.upiQrImage);

  React.useEffect(() => {
    if (!open || !guideUserId) {
      setBookings([]);
      setGuideTourDateKeys([]);
      return undefined;
    }

    let cancelled = false;
    setBookings([]);
    setGuideTourDateKeys([]);

    Promise.all([
      api.get(`/booking/guide/${guideUserId}`),
      api.get('/tour/explore', { params: { guideId: guideUserId } }),
    ])
      .then(([bookingResponse, tourResponse]) => {
        if (!cancelled) {
          setBookings((bookingResponse?.data?.bookings || []).filter(isBusyBooking));
          setGuideTourDateKeys(extractGuideTourDateKeys(tourResponse?.data?.tours || []));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error fetching guide booking availability:', err);
          setBookings([]);
          setGuideTourDateKeys([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guideUserId, open]);

  React.useEffect(() => {
    if (open) {
      setDestination(serviceDestinations[0]?.destination || '');
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setGuestCount(1);
      setSpecialRequests('');
      setShowCalendar(false);
      setShowSlotPicker(false);
      setSlotPickerDate(null);
      setShowConfirmation(false);
      setCreatedBooking(null);
      setTxnRef('');
      setProofFile(null);
      setCopyMessage('');
      setErrorMessage('');
      setActionLoading(false);
    }
  }, [open, serviceDestinations]);

  React.useEffect(() => {
    if (!open) return;
    if (serviceDestinations.length === 0) {
      if (destination) setDestination('');
      return;
    }
    const selectedKey = normalizeDestinationKey(destination);
    const exists = selectedKey && serviceDestinations.some((item) => item.destinationKey === selectedKey);
    if (!exists) {
      setDestination(serviceDestinations[0].destination);
    }
  }, [open, destination, serviceDestinations]);

  let subtotal = 0;
  let duration = 0;
  let durationLabel = activeRateType === 'hourly' ? 'hours' : 'days';

  if (guide && startDate && endDate && startTime && endTime) {
    const start = dayjs(startDate).hour(dayjs(startTime).hour()).minute(dayjs(startTime).minute());
    const end = dayjs(endDate).hour(dayjs(endTime).hour()).minute(dayjs(endTime).minute());
    if (end.isAfter(start)) {
      if (activeRateType === 'hourly') {
        duration = Math.max(1, Math.ceil(end.diff(start, 'hour', true)));
        subtotal = duration * Number(activeGuideRate || 0);
        durationLabel = 'hours';
      } else {
        const diffDays = end.startOf('day').diff(start.startOf('day'), 'day');
        duration = Math.max(1, diffDays + 1);
        subtotal = duration * Number(activeGuideRate || 0);
        durationLabel = 'days';
      }
    }
  }

  const finalTotal = subtotal;
  const previewAdvanceAmount = calculateAdvancePreview(finalTotal, guide);
  const previewRemainingAmount = Math.max(finalTotal - previewAdvanceAmount, 0);
  const today = dayjs().startOf('day');

  const isEndDateValid = !startDate || !endDate || dayjs(endDate).isAfter(dayjs(startDate)) || dayjs(endDate).isSame(dayjs(startDate));
  const isEndTimeValid = !startDate || !endDate || !startTime || !endTime || dayjs(endDate).isAfter(dayjs(startDate)) || (dayjs(endDate).isSame(dayjs(startDate)) ? dayjs(endTime).isAfter(dayjs(startTime)) : true);

  const toDateTime = (date, time) => {
    if (!date || !time) return null;
    return dayjs(date)
      .hour(dayjs(time).hour())
      .minute(dayjs(time).minute())
      .second(0)
      .millisecond(0);
  };

  const getDayStatus = (date) => {
    if (!date) return 'free';
    const dayStart = dayjs(date).startOf('day');
    const dayEnd = dayjs(date).endOf('day');
    const busyHours = Array(24).fill(false);

    bookings.forEach((booking) => {
      const bookingStart = dayjs(booking.startDateTime);
      const bookingEnd = dayjs(booking.endDateTime);
      if (bookingEnd.isBefore(dayStart) || bookingStart.isAfter(dayEnd)) return;

      const startHour = Math.max(0, bookingStart.isBefore(dayStart) ? 0 : bookingStart.hour());
      const endHour = Math.min(23, bookingEnd.isAfter(dayEnd) ? 23 : bookingEnd.hour() - (bookingEnd.minute() === 0 && bookingEnd.second() === 0 ? 1 : 0));
      for (let hour = startHour; hour <= endHour; hour += 1) {
        busyHours[hour] = true;
      }
    });

    const busyCount = busyHours.filter(Boolean).length;
    if (guide?.rateType !== 'hourly' && busyCount > 0) return 'full';
    if (busyCount === 24) return 'full';
    if (busyCount > 0) return 'partial';
    return 'free';
  };

  const isGuideTourDay = (date) => {
    const dateKey = toDateKey(date);
    return Boolean(dateKey) && guideTourDaySet.has(dateKey);
  };

  const isDateBusy = (date) => getDayStatus(date) === 'full' || isGuideTourDay(date);
  const selectedStartDateTime = toDateTime(startDate, startTime);
  const selectedEndDateTime = toDateTime(endDate, endTime);
  const hasBookingConflict =
    Boolean(selectedStartDateTime && selectedEndDateTime && selectedEndDateTime.isAfter(selectedStartDateTime)) &&
    bookings.some((booking) => {
      const bookedStart = dayjs(booking.startDateTime);
      const bookedEnd = dayjs(booking.endDateTime);
      return selectedStartDateTime.isBefore(bookedEnd) && selectedEndDateTime.isAfter(bookedStart);
    });
  const hasTourDayConflict =
    Boolean(startDate && endDate) &&
    getDateKeysBetween(startDate, endDate).some((dateKey) => guideTourDaySet.has(dateKey));

  const getDaySx = (date, outsideCurrentMonth, selected) => {
    const status = getDayStatus(date);
    const isTourDay = isGuideTourDay(date);

    if (outsideCurrentMonth) return {};
    if (selected) {
      return {
        backgroundColor: '#2563eb',
        color: '#fff',
        borderColor: '#2563eb',
        '&:hover': { backgroundColor: '#1d4ed8' },
      };
    }
    if (status === 'full') {
      return {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderColor: '#ef4444',
        textDecoration: 'line-through',
        '&:hover': { backgroundColor: '#fee2e2' },
        '&.Mui-disabled': {
          opacity: 1,
          backgroundColor: '#fee2e2',
          color: '#991b1b',
        },
      };
    }
    if (status === 'partial') {
      return {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderColor: '#f59e0b',
        '&:hover': { backgroundColor: '#fde68a' },
      };
    }
    if (isTourDay) {
      return {
        ...TOUR_DAY_STYLES,
        '&:hover': { backgroundColor: '#bfdbfe' },
      };
    }
    return {};
  };

  const BookingStatusDay = (props) => {
    const { day, outsideCurrentMonth, selected, disabled, ...other } = props;
    const status = getDayStatus(day);
    const isTourDay = isGuideTourDay(day);

    return (
      <PickersDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        selected={selected}
        disabled={disabled || status === 'full'}
        sx={{
          borderRadius: 1.5,
          border: outsideCurrentMonth || (status === 'free' && !isTourDay) ? '1px solid transparent' : '1px solid',
          fontWeight: status === 'free' && !isTourDay ? 500 : 800,
          ...getDaySx(day, outsideCurrentMonth, selected),
        }}
      />
    );
  };

  const handleStartDateChange = (date) => {
    if (isDateBusy(date)) return;
    setStartDate(date);
    if (endDate && date && dayjs(endDate).isBefore(date)) setEndDate(null);
    if (getDayStatus(date) === 'partial') {
      setSlotPickerDate(date);
      setShowSlotPicker(true);
    }
  };

  const handleEndDateChange = (date) => {
    if (isDateBusy(date)) return;
    setEndDate(date);
    if (startDate && date && dayjs(date).isBefore(startDate)) setStartDate(null);
  };

  const isFormComplete = Boolean(
    selectedDestinationPricing &&
    startDate &&
    endDate &&
    startTime &&
    endTime &&
    isEndDateValid &&
    isEndTimeValid &&
    !hasBookingConflict &&
    !hasTourDayConflict &&
    guestCount > 0
  );

  const currentBooking = createdBooking || null;
  const currentAdvanceAmount = Number(currentBooking?.advanceAmount ?? previewAdvanceAmount);
  const currentRemainingAmount = Number(currentBooking?.remainingAmount ?? previewRemainingAmount);
  const currentTotalAmount = Number(currentBooking?.totalAmount ?? finalTotal);
  const paymentSnapshot = currentBooking?.guidePaymentSnapshot || {
    payeeName: guide?.upiPayeeName || '',
    upiId: guide?.upiId || '',
    qrImage: guide?.upiQrImage || '',
    advancePaymentType: guide?.advancePaymentType || 'percentage',
    advancePaymentValue: Number(guide?.advancePaymentValue || 0),
    advancePaymentNotes: guide?.advancePaymentNotes || '',
  };
  const paymentQrUrl = buildMediaUrl(paymentSnapshot.qrImage || '');
  const upiPaymentLink = buildUpiLink({
    upiId: paymentSnapshot.upiId,
    payeeName: paymentSnapshot.payeeName,
    amount: currentAdvanceAmount,
    bookingId: currentBooking?._id,
    destination: currentBooking?.destination || destination,
  });

  const handleCopy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const handleCreateBooking = async () => {
    if (!isFormComplete || !guideUserId) return;

    setActionLoading(true);
    setErrorMessage('');
    setCopyMessage('');

    try {
      const startDateTime = dayjs(startDate)
        .hour(dayjs(startTime).hour())
        .minute(dayjs(startTime).minute())
        .second(0)
        .toISOString();
      const endDateTime = dayjs(endDate)
        .hour(dayjs(endTime).hour())
        .minute(dayjs(endTime).minute())
        .second(0)
        .toISOString();

      const response = await api.post('/booking/book', {
        guideId: guideUserId,
        startDateTime,
        endDateTime,
        destination: selectedDestinationPricing?.destination || destination,
        destinationPricingId: selectedDestinationPricing?._id || '',
        guestCount,
        specialRequests,
      });

      setCreatedBooking(response.data?.booking || null);
      setCopyMessage('Booking created. Complete the advance payment and submit the UTR below.');
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Booking failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAdvanceProof = async () => {
    if (!currentBooking?._id) return;
    if (!txnRef.trim()) {
      setErrorMessage('Enter the UPI reference / UTR number after you complete the payment.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('txnRef', txnRef.trim());
      if (proofFile) formData.append('screenshot', proofFile);

      const response = await api.post(`/booking/${currentBooking._id}/advance-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onConfirm) {
        onConfirm({
          message: response.data?.message || 'Advance payment proof submitted successfully.',
          severity: 'success',
          booking: response.data?.booking,
        });
      }
      onClose?.();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to submit advance payment proof.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderPaymentStage = () => (
    <Box sx={{ py: 2, px: 0 }}>
      <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #ecfdf3 0%, #f8fafc 100%)', border: '1px solid #86efac' }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#1F2937' }}>
            Pay Advance To Reserve This Guide
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Booking ID</Typography>
              <Typography sx={{ fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>
                {currentBooking?._id?.slice(-8).toUpperCase()}
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ color: '#475569', fontWeight: 600 }}>Total booking amount</Typography>
              <Typography sx={{ color: '#0f172a', fontWeight: 800 }}>{formatCurrency(currentTotalAmount)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ color: '#166534', fontWeight: 700 }}>Pay now as advance</Typography>
              <Typography sx={{ color: '#166534', fontWeight: 900 }}>{formatCurrency(currentAdvanceAmount)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ color: '#92400e', fontWeight: 700 }}>Pay later directly to guide</Typography>
              <Typography sx={{ color: '#92400e', fontWeight: 900 }}>{formatCurrency(currentRemainingAmount)}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Your slot is held for about {HOLD_WINDOW_MINUTES} minutes while you complete the advance payment.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' }, mb: 2 }}>
        <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #dbe3ef' }}>
          {paymentQrUrl ? (
            <Box
              component="img"
              src={paymentQrUrl}
              alt="Guide UPI QR"
              sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1.5, mb: 1 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              QR image not available. Use the UPI ID below in Google Pay, PhonePe, or any UPI app.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Scan in Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
          </Typography>
        </Box>

        <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #dbe3ef' }}>
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>UPI Payee Name</Typography>
              <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{paymentSnapshot.payeeName || 'Not provided'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>UPI ID</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography sx={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{paymentSnapshot.upiId || 'Not provided'}</Typography>
                {paymentSnapshot.upiId && (
                  <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => handleCopy(paymentSnapshot.upiId, 'UPI ID')}>
                    Copy
                  </Button>
                )}
              </Stack>
            </Box>
            {paymentSnapshot.advancePaymentNotes && (
              <Alert severity="info" sx={{ border: '1px solid #bfdbfe', bgcolor: '#eff6ff' }}>
                {paymentSnapshot.advancePaymentNotes}
              </Alert>
            )}
            {paymentSnapshot.upiId && (
              <Button
                variant="contained"
                onClick={() => { window.location.href = upiPaymentLink; }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
                }}
              >
                Open In UPI App
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      <Card sx={{ border: '1px solid #dbe3ef' }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Submit Payment Proof</Typography>
          <Stack spacing={1.5}>
            <TextField
              label="UPI Reference / UTR Number"
              value={txnRef}
              onChange={(event) => setTxnRef(event.target.value)}
              placeholder="Example: 412345678901"
              fullWidth
              size="small"
            />
            <Button component="label" variant="outlined" sx={{ textTransform: 'none', fontWeight: 700, width: 'fit-content' }}>
              {proofFile ? 'Change Screenshot' : 'Upload Screenshot (Optional)'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
              />
            </Button>
            {proofFile && (
              <Typography variant="caption" color="text.secondary">
                Selected: {proofFile.name}
              </Typography>
            )}
            <Alert severity="warning" sx={{ border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
              Never share your UPI PIN with anyone. Only complete the payment in your UPI app and then submit the UTR here.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 700, py: 2 }}>
        {createdBooking ? 'Advance Payment Required' : showConfirmation ? 'Review Booking Request' : 'Book Your Experience'}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!createdBooking && (
            <Card sx={{ m: 2, mb: 1, background: 'linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%)', border: '1px solid #e5e7eb' }}>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', pb: 2 }}>
                <Avatar src={guide?.avatar} sx={{ width: 70, height: 70, border: '3px solid #667eea' }} alt={guide?.name} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1F2937' }}>
                      {guide?.name}
                    </Typography>
                    {guide?.verifiedID && <VerifiedIcon sx={{ fontSize: 18, color: '#667eea' }} />}
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                    <Rating value={guide?.rating || 0} readOnly size="small" />
                    <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                      {guide?.reviewCount > 0 ? `${guide?.rating?.toFixed(1)} (${guide?.reviewCount})` : 'No reviews yet'}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#667eea' }}>
                    INR {activeGuideRate}/{activeRateType === 'hourly' ? 'hour' : 'day'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={advanceSetupReady ? 'UPI advance ready' : 'Advance setup incomplete'} color={advanceSetupReady ? 'success' : 'warning'} />
                    {guideAcceptsAdvance && guide?.advancePaymentValue > 0 && (
                      <Chip
                        size="small"
                        label={guide?.advancePaymentType === 'fixed' ? `Advance INR ${guide.advancePaymentValue}` : `Advance ${guide.advancePaymentValue}%`}
                        sx={{ bgcolor: '#e0f2fe', color: '#0c4a6e', fontWeight: 700 }}
                      />
                    )}
                  </Stack>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onViewReviews}
                    sx={{
                      mt: 1,
                      borderRadius: 1.5,
                      borderColor: '#cbd5e1',
                      color: '#334155',
                      fontWeight: 700,
                      textTransform: 'none',
                    }}
                  >
                    View Full Profile
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          <Box sx={{ px: 2 }}>
            {copyMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {copyMessage}
              </Alert>
            )}
            {errorMessage && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorMessage}
              </Alert>
            )}

            {!showConfirmation && !createdBooking && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                {!advanceSetupReady && (
                  <Alert severity="warning" sx={{ border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
                    This guide has not completed advance payment setup yet, so booking is temporarily unavailable.
                  </Alert>
                )}
                {serviceDestinations.length === 0 && (
                  <Alert severity="warning" sx={{ border: '1px solid #fecaca', bgcolor: '#fef2f2' }}>
                    This guide has not configured local destinations yet. Please book another guide for now.
                  </Alert>
                )}

                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <LocationOnIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Where?</Typography>
                  </Stack>
                  {serviceDestinations.length > 0 ? (
                    <TextField
                      select
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      fullWidth
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      helperText="You can book this guide only for their listed local destinations."
                    >
                      {serviceDestinations.map((item) => (
                        <MenuItem key={item._id || item.destination} value={item.destination}>
                          {item.destination} - INR {item.price}/{activeRateType === 'hourly' ? 'hour' : 'day'}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      value="No local destinations configured"
                      fullWidth
                      size="small"
                      disabled
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  )}
                </Box>

                <Button
                  variant="outlined"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  sx={{ textTransform: 'none', borderColor: '#e5e7eb', color: '#667eea', fontWeight: 600 }}
                >
                  {showCalendar ? 'Hide Calendar' : 'View Availability'}
                </Button>

                {showCalendar && guideUserId && (
                  <Box sx={{ mb: 1, p: 1.5, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <GuideAvailabilityCalendar
                      rateType={guide?.rateType}
                      onSelectDate={(date) => {
                        const status = getDayStatus(date);
                        if (status === 'free') setStartDate(date);
                        else if (status === 'partial') {
                          setSlotPickerDate(date);
                          setShowSlotPicker(true);
                        }
                      }}
                      selectedDate={startDate}
                      bookings={bookings}
                      guideTourDateKeys={guideTourDateKeys}
                    />
                  </Box>
                )}

                {showSlotPicker && slotPickerDate && (
                  <Box sx={{ mb: 1, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #d1fae5' }}>
                    <SlotPicker
                      bookings={bookings}
                      date={slotPickerDate}
                      onSelectSlot={(hour) => {
                        const slot = dayjs(slotPickerDate).hour(hour).minute(0).second(0);
                        setStartDate(slot);
                        setStartTime(slot);
                        setShowSlotPicker(false);
                      }}
                    />
                  </Box>
                )}

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <AccessTimeIcon sx={{ color: '#667eea', fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>When?</Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                      <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={handleStartDateChange}
                        shouldDisableDate={isDateBusy}
                        slots={{ day: BookingStatusDay }}
                        format="DD-MM-YYYY"
                        minDate={today}
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                      <TimePicker
                        label="Start Time"
                        value={startTime}
                        onChange={setStartTime}
                        ampm={false}
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                    </Stack>
                  </Box>

                  <Box>
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                      <DatePicker
                        label="End Date"
                        value={endDate}
                        onChange={handleEndDateChange}
                        shouldDisableDate={isDateBusy}
                        slots={{ day: BookingStatusDay }}
                        format="DD-MM-YYYY"
                        minDate={startDate || today}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !isEndDateValid && Boolean(endDate),
                            helperText: !isEndDateValid && Boolean(endDate) ? 'End date invalid' : '',
                          },
                        }}
                      />
                      <TimePicker
                        label="End Time"
                        value={endTime}
                        onChange={setEndTime}
                        ampm={false}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !isEndTimeValid && Boolean(endTime),
                            helperText: !isEndTimeValid && Boolean(endTime) ? 'Invalid time' : '',
                          },
                        }}
                      />
                    </Stack>
                  </Box>
                </LocalizationProvider>

                {hasBookingConflict && (
                  <Alert severity="warning" sx={{ border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
                    This guide is already booked during the selected time. Choose another date or time.
                  </Alert>
                )}
                {hasTourDayConflict && (
                  <Alert severity="warning" sx={{ border: '1px solid #bfdbfe', bgcolor: '#eff6ff' }}>
                    This guide already has a tour on one or more selected days. Please pick different dates.
                  </Alert>
                )}

                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <PeopleIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Guests</Typography>
                  </Stack>
                  <TextField
                    type="number"
                    label="Number of people"
                    value={guestCount}
                    onChange={(event) => setGuestCount(Math.max(1, parseInt(event.target.value, 10) || 1))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <EditNoteIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Special Requests</Typography>
                  </Stack>
                  <TextField
                    placeholder="Any special interests or preferences? (Optional)"
                    value={specialRequests}
                    onChange={(event) => setSpecialRequests(event.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                {isFormComplete && (
                  <Card sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%)', border: '1px solid #e5e7eb', mt: 1 }}>
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#1F2937', fontSize: '0.95rem' }}>
                        Payment Summary
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            INR {activeGuideRate} x {duration} {durationLabel}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937' }}>
                            {formatCurrency(subtotal)}
                          </Typography>
                        </Stack>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontWeight: 700, color: '#1F2937' }}>
                            Booking amount
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: '1rem' }}>
                            {formatCurrency(finalTotal)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontWeight: 700, color: '#166534' }}>
                            Advance to pay now
                          </Typography>
                          <Typography sx={{ fontWeight: 900, color: '#166534', fontSize: '1rem' }}>
                            {formatCurrency(previewAdvanceAmount)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontWeight: 700, color: '#92400e' }}>
                            Remaining on tour day
                          </Typography>
                          <Typography sx={{ fontWeight: 900, color: '#92400e', fontSize: '1rem' }}>
                            {formatCurrency(previewRemainingAmount)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <Alert
                  severity="success"
                  icon={<SecurityIcon />}
                  sx={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #d1fae5',
                    color: '#065f46',
                    '& .MuiAlert-icon': { color: '#10b981' },
                  }}
                >
                  <Stack gap={0.5}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Advance Payment Flow</Typography>
                    <Typography sx={{ fontSize: '0.8rem' }}>
                      Pay only the advance now, submit the UTR, and the guide will verify it before confirming your booking.
                    </Typography>
                  </Stack>
                </Alert>
              </Box>
            )}

            {showConfirmation && !createdBooking && (
              <Box sx={{ py: 2, px: 0 }}>
                <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', border: '1px solid #667eea' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#1F2937' }}>
                      Review Booking Request
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Guide</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{guide?.name}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Destination</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{destination}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Schedule</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>
                          {dayjs(startDate).format('MMM DD')} {dayjs(startTime).format('HH:mm')} - {dayjs(endDate).format('MMM DD')} {dayjs(endTime).format('HH:mm')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Guests</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{guestCount} {guestCount === 1 ? 'person' : 'people'}</Typography>
                      </Box>
                      {specialRequests && (
                        <Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Requests</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{specialRequests}</Typography>
                        </Box>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700, color: '#1F2937' }}>Booking amount</Typography>
                        <Typography sx={{ fontWeight: 800, color: '#334155' }}>{formatCurrency(finalTotal)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700, color: '#166534' }}>Advance due now</Typography>
                        <Typography sx={{ fontWeight: 900, color: '#166534' }}>{formatCurrency(previewAdvanceAmount)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700, color: '#92400e' }}>Remaining during tour</Typography>
                        <Typography sx={{ fontWeight: 900, color: '#92400e' }}>{formatCurrency(previewRemainingAmount)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Alert severity="info" sx={{ mb: 2 }}>
                  After you create this booking request, you will pay the advance directly to the guide using UPI and submit the UTR for verification.
                </Alert>
              </Box>
            )}

            {createdBooking && renderPaymentStage()}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#e5e7eb',
            color: '#6B7280',
          }}
        >
          {createdBooking ? 'Close' : 'Cancel'}
        </Button>

        {showConfirmation && !createdBooking && (
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#e5e7eb',
              color: '#667eea',
            }}
          >
            Back
          </Button>
        )}

        {!showConfirmation && !createdBooking && (
          <Button
            onClick={() => setShowConfirmation(true)}
            variant="contained"
            disabled={!isFormComplete || !advanceSetupReady}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Review Booking
          </Button>
        )}

        {showConfirmation && !createdBooking && (
          <Button
            onClick={handleCreateBooking}
            variant="contained"
            disabled={actionLoading}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            {actionLoading ? 'Creating...' : 'Create Booking & Continue'}
          </Button>
        )}

        {createdBooking && (
          <Button
            onClick={handleSubmitAdvanceProof}
            variant="contained"
            disabled={actionLoading}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
            }}
          >
            {actionLoading ? 'Submitting...' : 'Submit Advance Proof'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
