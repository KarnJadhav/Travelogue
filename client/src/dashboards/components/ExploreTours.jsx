import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { buildMediaUrl } from '../../utils/media';
import { API_BASE_URL } from '../../config/runtime';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';

const DEFAULT_HOLD_WINDOW_MINUTES = 30;

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (value) =>
  `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildJoinedMap = (joinedTours = []) => {
  const map = new Map();
  joinedTours.forEach((tour) => {
    const key = String(tour?._id || '');
    if (!key) return;
    map.set(key, Array.isArray(tour.myParticipation) ? tour.myParticipation : []);
  });
  return map;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const matchesTourFilters = (tour, keyword, location, guideName) => {
  const keywordQuery = normalizeText(keyword);
  const locationQuery = normalizeText(location);
  const guideQuery = normalizeText(guideName);

  if (keywordQuery) {
    const haystack = [
      tour?.title,
      tour?.shortDescription,
      tour?.fullDescription,
      tour?.destination,
      tour?.meetingPoint,
      tour?.guideId?.name
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(keywordQuery)) return false;
  }

  if (locationQuery) {
    const destination = normalizeText(tour?.destination);
    if (!destination.includes(locationQuery)) return false;
  }

  if (guideQuery) {
    const guide = normalizeText(tour?.guideId?.name);
    if (!guide.includes(guideQuery)) return false;
  }

  return true;
};

const getAvailableDates = (tour) => {
  const availability = Array.isArray(tour?.seatSummary?.availability) ? tour.seatSummary.availability : [];
  return availability.filter((slot) => Number(slot?.remainingSeats || 0) > 0);
};

const isMultiDayTour = (tour) => {
  if (String(tour?.durationType || '').toLowerCase() === 'multi-day') return true;
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  const uniqueDateCount = new Set(customDates.map((date) => toDateKey(date)).filter(Boolean)).size;
  if (uniqueDateCount > 1) return true;
  const availability = Array.isArray(tour?.seatSummary?.availability) ? tour.seatSummary.availability : [];
  return availability.some((slot) => Boolean(slot?.isPackage));
};

const getTourDateKeys = (tour) => {
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  return Array.from(
    new Set(
      customDates.map((date) => toDateKey(date)).filter(Boolean)
    )
  ).sort();
};

const getTourRangeInfo = (tour) => {
  const keys = getTourDateKeys(tour);
  return {
    startKey: keys[0] || '',
    endKey: keys[keys.length - 1] || '',
    days: keys.length
  };
};

const formatAvailabilitySlotLabel = (tour, slot) => {
  if (!slot) return 'Currently full';
  if (isMultiDayTour(tour) && slot?.isPackage) {
    const start = formatDateLabel(slot.date);
    const end = formatDateLabel(slot.endDate || slot.date);
    const days = Number(slot.packageDays || getTourRangeInfo(tour).days || 1);
    return `${start} - ${end} (${days} day${days > 1 ? 's' : ''}, ${slot.remainingSeats} seats left)`;
  }
  return `${formatDateLabel(slot.date)} (${slot.remainingSeats} seats left)`;
};

const buildDisplayParticipationEntries = (tour, entries = []) => {
  const confirmedEntries = (Array.isArray(entries) ? entries : []).filter(
    (entry) => (entry?.status || 'confirmed') === 'confirmed'
  );

  if (!isMultiDayTour(tour)) return confirmedEntries;
  if (confirmedEntries.length === 0) return [];

  const range = getTourRangeInfo(tour);
  const startKey = range.startKey || toDateKey(confirmedEntries[0]?.tourDate);
  const endKey = range.endKey || startKey;
  const totalSeats = confirmedEntries.reduce((sum, entry) => sum + Math.max(1, toNumber(entry?.seats, 1)), 0);

  return [
    {
      _id: `package_${tour?._id || 'tour'}`,
      tourDate: startKey ? new Date(`${startKey}T00:00:00.000Z`) : confirmedEntries[0]?.tourDate,
      endDate: endKey ? new Date(`${endKey}T00:00:00.000Z`) : null,
      seats: totalSeats,
      status: 'confirmed',
      participantIds: confirmedEntries.map((entry) => String(entry?._id || '')).filter(Boolean),
      isPackage: true,
      packageDays: Math.max(1, range.days || confirmedEntries.length)
    }
  ];
};

const isParticipationEntryActive = (tour, entry, todayKey) => {
  if (!entry || (entry?.status || 'confirmed') !== 'confirmed') return false;

  if (isMultiDayTour(tour)) {
    const endKey = toDateKey(entry?.endDate || entry?.tourDate || '');
    if (!endKey) return false;
    return endKey >= todayKey;
  }

  const dateKey = toDateKey(entry?.tourDate);
  if (!dateKey) return false;
  return dateKey >= todayKey;
};

const buildGuideChatTarget = (tour) => {
  const guideUserId = String(tour?.guideId?._id || tour?.guideId || '');
  if (!guideUserId) return null;
  return {
    userId: guideUserId,
    type: 'guide',
    name: tour?.guideId?.name || 'Guide',
    avatar: tour?.guideId?.avatar || '',
    email: tour?.guideId?.email || '',
    subtitle: tour?.destination ? `Tour guide - ${tour.destination}` : 'Tour guide'
  };
};

const getTourCardCover = (tour) =>
  tour?.media?.coverImage?.url ? buildMediaUrl(tour.media.coverImage.url) : '';

const getUpcomingCount = (tour) => {
  const availability = Array.isArray(tour?.seatSummary?.availability) ? tour.seatSummary.availability : [];
  if (isMultiDayTour(tour)) return availability.length > 0 ? 1 : 0;
  return availability.length;
};

const getTourItineraryPdfUrl = (tourId) => (tourId ? `${API_BASE_URL}/tour/${tourId}/itinerary-pdf` : '');

const buildUpiLink = ({ upiId, payeeName, amount, bookingId, destination }) => {
  const params = new URLSearchParams({
    pa: String(upiId || '').trim(),
    pn: String(payeeName || '').trim(),
    am: String(Number(amount || 0).toFixed(2)),
    cu: 'INR',
    tn: `Advance for ${destination || 'tour booking'}${bookingId ? ` (${String(bookingId).slice(-6).toUpperCase()})` : ''}`,
  });
  return `upi://pay?${params.toString()}`;
};

export default function ExploreTours({ onOpenGuideProfile, onOpenChat }) {
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const touristId = user?._id || user?.userId || '';
  const todayKey = useMemo(() => getTodayKey(), []);

  const [tours, setTours] = useState([]);
  const [joinedTours, setJoinedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [guideSearch, setGuideSearch] = useState('');
  const [activeView, setActiveView] = useState('all');

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [joinNote, setJoinNote] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [paymentWindowMinutes, setPaymentWindowMinutes] = useState(DEFAULT_HOLD_WINDOW_MINUTES);
  const [txnRef, setTxnRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentCopyMessage, setPaymentCopyMessage] = useState('');

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailTour, setDetailTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const fetchTours = useCallback(async () => {
    const response = await api.get('/tour/explore');
    return response?.data?.tours || [];
  }, []);

  const fetchJoinedTours = useCallback(async () => {
    if (!touristId) return [];
    const response = await api.get(`/tour/tourist/${touristId}/joined`);
    return response?.data?.tours || [];
  }, [touristId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [toursData, joinedData] = await Promise.all([fetchTours(), fetchJoinedTours()]);
      setTours(toursData);
      setJoinedTours(joinedData);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load tours', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchTours, fetchJoinedTours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const joinedMap = useMemo(() => buildJoinedMap(joinedTours), [joinedTours]);

  const filteredTours = useMemo(
    () =>
      tours.filter((tour) =>
        matchesTourFilters(tour, keywordSearch, locationSearch, guideSearch)
      ),
    [tours, keywordSearch, locationSearch, guideSearch]
  );

  const joinedToursWithStatus = useMemo(() => {
    return joinedTours
      .filter((tour) => matchesTourFilters(tour, keywordSearch, locationSearch, guideSearch))
      .map((tour) => {
        const rawEntries = Array.isArray(tour?.myParticipation) ? tour.myParticipation : [];
        const allEntries = buildDisplayParticipationEntries(tour, rawEntries);
        const activeEntries = allEntries.filter((entry) => isParticipationEntryActive(tour, entry, todayKey));
        return {
          tour,
          activeEntries,
          allEntries
        };
      });
  }, [joinedTours, keywordSearch, locationSearch, guideSearch, todayKey]);

  const chatReadyTours = useMemo(
    () => joinedToursWithStatus.filter((item) => item.activeEntries.length > 0),
    [joinedToursWithStatus]
  );

  const openGuideProfile = (tour) => {
    if (typeof onOpenGuideProfile !== 'function') return;
    onOpenGuideProfile({
      guideUserId: tour?.guideId?._id || tour?.guideId,
      guideName: tour?.guideId?.name || ''
    });
  };

  const openGuideChat = (tour) => {
    const chatTarget = buildGuideChatTarget(tour);
    if (!chatTarget) {
      showToast('Guide information is unavailable for this tour.', 'warning');
      return;
    }
    if (typeof onOpenChat === 'function') {
      onOpenChat(chatTarget);
      return;
    }
    showToast('Chat is not connected on this screen yet.', 'info');
  };

  const handleOpenJoinDialog = (tour) => {
    const availableDates = getAvailableDates(tour);
    if (availableDates.length === 0) {
      showToast('No seats available for this tour right now.', 'warning');
      return;
    }
    setActiveTour(tour);
    setSelectedDate(availableDates[0].date);
    setSelectedSeats(1);
    setJoinNote('');
    setJoinDialogOpen(true);
  };

  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
    setActiveTour(null);
    setSelectedDate('');
    setSelectedSeats(1);
    setJoinNote('');
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setCreatedBooking(null);
    setPaymentWindowMinutes(DEFAULT_HOLD_WINDOW_MINUTES);
    setTxnRef('');
    setProofFile(null);
    setPaymentCopyMessage('');
  };

  const handleOpenDetailDialog = async (tour) => {
    setDetailTour(tour);
    setDetailDialogOpen(true);
    if (!tour?._id) return;

    try {
      setDetailLoading(true);
      const response = await api.get(`/tour/${tour._id}`);
      if (response?.data?.tour) {
        setDetailTour(response.data.tour);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Unable to fetch full tour details.', 'warning');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailTour(null);
    setDetailLoading(false);
  };

  const selectedDateAvailability = useMemo(() => {
    if (!activeTour || !selectedDate) return null;
    return (activeTour?.seatSummary?.availability || []).find((slot) => slot.date === selectedDate) || null;
  }, [activeTour, selectedDate]);

  const maxBookableSeats = Math.max(1, toNumber(selectedDateAvailability?.remainingSeats, 1));

  useEffect(() => {
    if (selectedSeats > maxBookableSeats) {
      setSelectedSeats(maxBookableSeats);
    }
  }, [maxBookableSeats, selectedSeats]);

  const handleJoinTour = async () => {
    if (!activeTour || !selectedDate) {
      showToast('Please select a valid date.', 'error');
      return;
    }
    try {
      setBookingLoading(true);
      const response = await api.post(`/tour/${activeTour._id}/join`, {
        tourDate: selectedDate,
        seats: selectedSeats,
        note: joinNote
      });

      const requiresAdvancePayment = Boolean(response?.data?.requiresAdvancePayment);
      if (requiresAdvancePayment) {
        const nextBooking = response?.data?.booking || null;
        if (!nextBooking?._id) {
          showToast('Booking was created but payment details are unavailable. Please pay from My Bookings.', 'warning');
          handleCloseJoinDialog();
          await loadData();
          return;
        }
        setCreatedBooking(nextBooking);
        setPaymentWindowMinutes(Math.max(1, toNumber(response?.data?.paymentWindowMinutes, DEFAULT_HOLD_WINDOW_MINUTES)));
        setTxnRef('');
        setProofFile(null);
        setPaymentCopyMessage('');
        setPaymentDialogOpen(true);
        showToast(response?.data?.message || 'Booking created. Complete the advance payment below.', 'info');
      } else {
        showToast(
          response?.data?.message ||
            (isMultiDayTour(activeTour)
              ? 'Multi-day package booked successfully. You can now chat with this guide from My Booked Tours.'
              : 'Tour booked successfully. You can now chat with this guide from My Booked Tours.'),
          'success'
        );
      }
      handleCloseJoinDialog();
      if (!requiresAdvancePayment) {
        setActiveView('booked');
      }
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to join tour.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCopy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setPaymentCopyMessage(`${label} copied.`);
    } catch {
      setPaymentCopyMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const handleSubmitAdvanceProof = async () => {
    if (!createdBooking?._id) return;
    if (!txnRef.trim()) {
      showToast('Enter the UPI reference / UTR number after payment.', 'error');
      return;
    }

    try {
      setPaymentLoading(true);
      const formData = new FormData();
      formData.append('txnRef', txnRef.trim());
      if (proofFile) formData.append('screenshot', proofFile);

      const response = await api.post(`/booking/${createdBooking._id}/advance-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast(response?.data?.message || 'Advance payment proof submitted successfully.');
      handleClosePaymentDialog();
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to submit advance payment proof.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelJoin = async (tourId, participationId) => {
    const participantIds = Array.isArray(participationId) ? participationId : [participationId];
    const validIds = participantIds.map((id) => String(id || '')).filter(Boolean);
    if (!tourId || validIds.length === 0) {
      showToast('Unable to cancel this booking entry.', 'error');
      return;
    }

    try {
      await Promise.all(validIds.map((id) => api.delete(`/tour/${tourId}/join/${id}`)));
      showToast('Tour booking cancelled.');
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to cancel booking.', 'error');
    }
  };

  const detailJoinedEntries = useMemo(() => {
    if (!detailTour?._id) return [];
    const rawEntries = joinedMap.get(String(detailTour._id)) || [];
    return buildDisplayParticipationEntries(detailTour, rawEntries);
  }, [detailTour, joinedMap]);

  const detailActiveEntries = useMemo(
    () => detailJoinedEntries.filter((entry) => isParticipationEntryActive(detailTour, entry, todayKey)),
    [detailTour, detailJoinedEntries, todayKey]
  );

  const detailAvailableDates = useMemo(() => getAvailableDates(detailTour), [detailTour]);
  const detailNextAvailableDate = useMemo(() => detailAvailableDates[0] || null, [detailAvailableDates]);
  const detailTourDateKeys = useMemo(() => getTourDateKeys(detailTour), [detailTour]);
  const detailTourRangeInfo = useMemo(() => getTourRangeInfo(detailTour), [detailTour]);
  const currentAdvanceAmount = Number(createdBooking?.advanceAmount || 0);
  const currentRemainingAmount = Number(createdBooking?.remainingAmount || 0);
  const currentTotalAmount = Number(createdBooking?.totalAmount || 0);
  const paymentSnapshot = createdBooking?.guidePaymentSnapshot || {};
  const paymentQrUrl = buildMediaUrl(paymentSnapshot?.qrImage || '');
  const upiPaymentLink = buildUpiLink({
    upiId: paymentSnapshot?.upiId || '',
    payeeName: paymentSnapshot?.payeeName || '',
    amount: currentAdvanceAmount,
    bookingId: createdBooking?._id,
    destination: createdBooking?.destination || activeTour?.destination || 'Tour booking',
  });

  const renderEmptyState = (title, subtitle) => (
    <Box sx={{ p: 4.5, borderRadius: 3, border: '2px dashed #d8dee8', bgcolor: '#fbfdff', textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {subtitle}
      </Typography>
    </Box>
  );

  const renderTourGrid = (items = []) => {
    if (items.length === 0) {
      return renderEmptyState(
        'No tours found',
        'Try a different location or guide search.'
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gap: 1.6,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))'
          }
        }}
      >
        {items.map((tour) => {
          const cover = getTourCardCover(tour);
          const nextSlot = getAvailableDates(tour)[0] || null;
          const rawJoinedEntries = joinedMap.get(String(tour._id)) || [];
          const joinedEntries = buildDisplayParticipationEntries(tour, rawJoinedEntries);
          const hasActiveJoin = joinedEntries.some((entry) => isParticipationEntryActive(tour, entry, todayKey));

          return (
            <Card
              key={String(tour._id)}
              sx={{
                borderRadius: 2.5,
                border: '1px solid #dce4f0',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {cover ? (
                <CardMedia component="img" height="138" image={cover} alt={tour.title || 'Tour'} />
              ) : (
                <Box sx={{ height: 138, bgcolor: '#edf3f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No cover image</Typography>
                </Box>
              )}
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle1" fontWeight={800} noWrap>
                  {tour.title || 'Untitled Tour'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    minHeight: 34,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {tour.shortDescription || 'No short description'}
                </Typography>

                <Stack spacing={0.55} mt={1.1}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <PlaceOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption">{tour.destination || 'Destination not set'}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <PersonOutlineIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption">{tour?.guideId?.name || 'Guide'}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <CalendarMonthIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      {formatAvailabilitySlotLabel(tour, nextSlot)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <GroupsIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      Group: {tour?.schedule?.minTravelers || 1} - {tour?.schedule?.maxTravelers || 1}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={0.7} flexWrap="wrap" mt={1.2} mb={1.2}>
                  <Chip size="small" label={`INR ${toNumber(tour?.pricing?.pricePerPerson, 0).toLocaleString('en-IN')}`} />
                  <Chip
                    size="small"
                    label={
                      isMultiDayTour(tour)
                        ? `${getUpcomingCount(tour)} package`
                        : `${getUpcomingCount(tour)} date(s)`
                    }
                  />
                  {joinedEntries.length > 0 ? <Chip size="small" color="success" label="Booked" /> : null}
                  {hasActiveJoin ? <Chip size="small" color="info" label="Chat Ready" /> : null}
                </Stack>

                <Stack direction="row" spacing={0.8} flexWrap="wrap">
                  <Button size="small" variant="outlined" onClick={() => handleOpenDetailDialog(tour)}>
                    View Details
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!nextSlot}
                    onClick={() => handleOpenJoinDialog(tour)}
                  >
                    Book
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const renderBookedTours = (items, title, subtitle) => {
    if (items.length === 0) {
      return renderEmptyState(title, subtitle);
    }

    return (
      <Stack spacing={1.2}>
        {items.map(({ tour, activeEntries, allEntries }) => (
          <Box
            key={`joined_${tour._id}`}
            sx={{
              p: 1.4,
              borderRadius: 2,
              border: '1px solid #dbe5f5',
              bgcolor: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 1.1,
              flexDirection: { xs: 'column', md: 'row' }
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800}>{tour.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {tour.destination || 'Destination'} | Guide: {tour?.guideId?.name || 'Guide'}
              </Typography>
              <Stack direction="row" spacing={0.7} mt={0.9} flexWrap="wrap">
                {allEntries.map((entry) => {
                  const isActive = activeEntries.some((active) => String(active._id) === String(entry._id));
                  const isPackageEntry = Boolean(entry?.isPackage) || isMultiDayTour(tour);
                  const packageDays = Number(entry?.packageDays || getTourRangeInfo(tour).days || 1);
                  const label = isPackageEntry
                    ? `${formatDateLabel(entry.tourDate)} - ${formatDateLabel(entry.endDate || entry.tourDate)} | ${entry.seats} seat${entry.seats > 1 ? 's' : ''} | ${packageDays} day${packageDays > 1 ? 's' : ''}`
                    : `${formatDateLabel(entry.tourDate)} | ${entry.seats} seat${entry.seats > 1 ? 's' : ''}`;
                  return (
                    <Chip
                      key={String(entry._id)}
                      size="small"
                      color={isActive ? 'success' : 'default'}
                      label={isActive ? `${label} | Active` : `${label} | Completed`}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.8} flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={() => handleOpenDetailDialog(tour)}>
                Full Details
              </Button>
              <Button size="small" variant="outlined" onClick={() => openGuideProfile(tour)}>
                Guide Profile
              </Button>
              {activeEntries.length > 0 ? (
                <Button size="small" variant="contained" onClick={() => openGuideChat(tour)}>
                  Chat with Guide
                </Button>
              ) : (
                <Chip size="small" label="Tour completed" />
              )}
              {activeEntries.map((entry) => (
                <Button
                  key={`cancel_${entry._id}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => handleCancelJoin(tour._id, entry?.participantIds?.length ? entry.participantIds : entry._id)}
                >
                  {entry?.isPackage ? 'Cancel Package' : `Cancel ${formatDateLabel(entry.tourDate)}`}
                </Button>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.1 }}>
      <Box
        sx={{
          borderRadius: 3,
          border: '1px solid #dce4f0',
          p: { xs: 1.6, md: 2 },
          bgcolor: '#f9fcff'
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={1.2}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>Explore Tours</Typography>
            <Typography variant="body2" color="text.secondary">
              Find tours, open full itinerary details, book quickly, and chat with your guide after booking.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant={activeView === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setActiveView('all')}
            >
              All Tours ({filteredTours.length})
            </Button>
            <Button
              variant={activeView === 'booked' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setActiveView('booked')}
            >
              My Booked Tours ({joinedToursWithStatus.length})
            </Button>
            <Button
              variant={activeView === 'chat' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setActiveView('chat')}
            >
              Chat Ready ({chatReadyTours.length})
            </Button>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          mt={1.6}
        >
          <TextField
            size="small"
            fullWidth
            label="Search Tours"
            placeholder="Title, keyword, itinerary..."
            value={keywordSearch}
            onChange={(event) => setKeywordSearch(event.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            label="Location"
            placeholder="Ex: Jaipur"
            value={locationSearch}
            onChange={(event) => setLocationSearch(event.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            label="Guide Name"
            placeholder="Ex: Aditi"
            value={guideSearch}
            onChange={(event) => setGuideSearch(event.target.value)}
          />
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeView === 'all' ? renderTourGrid(filteredTours) : null}
          {activeView === 'booked'
            ? renderBookedTours(
                joinedToursWithStatus,
                'No booked tours found',
                'Book a tour to see your itinerary, booking status, and chat access here.'
              )
            : null}
          {activeView === 'chat'
            ? renderBookedTours(
                chatReadyTours,
                'No active tours ready for chat',
                'When you have upcoming or ongoing bookings, chat with guide will appear here.'
              )
            : null}
        </Box>
      )}

      <Dialog open={detailDialogOpen} onClose={handleCloseDetailDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {detailTour?.title || 'Tour Details'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailTour?.destination || 'Destination'} | Guide: {detailTour?.guideId?.name || 'Guide'}
              </Typography>
            </Box>
            {detailLoading ? <CircularProgress size={18} /> : null}
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(0, 1fr)' }
            }}
          >
            <Box>
              {getTourCardCover(detailTour) ? (
                <CardMedia
                  component="img"
                  image={getTourCardCover(detailTour)}
                  alt={detailTour?.title || 'Tour'}
                  sx={{ borderRadius: 2, height: { xs: 200, md: 240 }, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ borderRadius: 2, height: { xs: 200, md: 240 }, bgcolor: '#eef3f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No cover image</Typography>
                </Box>
              )}
            </Box>
            <Stack spacing={1}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <PlaceOutlinedIcon fontSize="small" />
                <Typography variant="body2">{detailTour?.destination || 'Destination not set'}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <RouteOutlinedIcon fontSize="small" />
                <Typography variant="body2">
                  Meeting Point: {detailTour?.meetingPoint || detailTour?.destination || 'Not set'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <ScheduleOutlinedIcon fontSize="small" />
                <Typography variant="body2">
                  Duration: {detailTour?.durationType || 'Not set'} | Type: {detailTour?.tourType || 'Tour'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <GroupsIcon fontSize="small" />
                <Typography variant="body2">
                  Group Size: {detailTour?.schedule?.minTravelers || 1} - {detailTour?.schedule?.maxTravelers || 1}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <CalendarMonthIcon fontSize="small" />
                <Typography variant="body2">
                  Next Slot: {formatAvailabilitySlotLabel(detailTour, detailNextAvailableDate)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                <Chip size="small" label={`INR ${toNumber(detailTour?.pricing?.pricePerPerson, 0).toLocaleString('en-IN')} / person`} />
                <Chip
                  size="small"
                  label={
                    isMultiDayTour(detailTour)
                      ? `${getUpcomingCount(detailTour)} package slot`
                      : `${getUpcomingCount(detailTour)} upcoming date(s)`
                  }
                />
                {detailJoinedEntries.length > 0 ? <Chip size="small" color="success" label="Booked by you" /> : null}
                {detailActiveEntries.length > 0 ? <Chip size="small" color="info" label="Chat available" /> : null}
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ my: 1.8 }} />

          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Trip Dates
          </Typography>
          {detailTourDateKeys.length > 0 ? (
            <>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" mb={1}>
                <Chip size="small" label={`Start: ${formatDateLabel(detailTourRangeInfo.startKey)}`} />
                <Chip size="small" label={`End: ${formatDateLabel(detailTourRangeInfo.endKey)}`} />
                <Chip
                  size="small"
                  color="primary"
                  label={`${detailTourRangeInfo.days || detailTourDateKeys.length} day itinerary`}
                />
              </Stack>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" mb={1.2}>
                {detailTourDateKeys.map((dateKey, index) => (
                  <Chip
                    key={`${detailTour?._id || 'tour'}_trip_day_${dateKey}`}
                    size="small"
                    variant="outlined"
                    label={`Day ${index + 1}: ${formatDateLabel(dateKey)}`}
                  />
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" mb={1}>
              Guide has not added trip dates yet.
            </Typography>
          )}

          <Divider sx={{ my: 1.2 }} />

          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Itinerary and Full Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {detailTour?.fullDescription || detailTour?.shortDescription || 'No detailed itinerary added by guide yet.'}
          </Typography>

          <Typography variant="subtitle2" fontWeight={700} mt={1.5} mb={0.7}>
            Available Seats by Date
          </Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            {detailAvailableDates.length > 0 ? (
              detailAvailableDates.map((slot) => (
                <Chip
                  key={`${detailTour?._id || 'tour'}_${slot.date}`}
                  size="small"
                  label={
                    isMultiDayTour(detailTour) && slot?.isPackage
                      ? `${formatDateLabel(slot.date)} - ${formatDateLabel(slot.endDate || slot.date)} | ${slot.remainingSeats} seats`
                      : `${formatDateLabel(slot.date)} | ${slot.remainingSeats} seats`
                  }
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No open seats right now.
              </Typography>
            )}
          </Stack>

          {detailTour?.media?.itineraryPdf?.url || detailTour?.media?.itineraryPdf?.publicId ? (
            <Button
              sx={{ mt: 1.5 }}
              size="small"
              variant="outlined"
              component="a"
              href={getTourItineraryPdfUrl(detailTour?._id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Itinerary PDF
            </Button>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDetailDialog}>Close</Button>
          <Button onClick={() => openGuideProfile(detailTour)} variant="outlined">
            View Guide Profile
          </Button>
          {detailActiveEntries.length > 0 ? (
            <Button onClick={() => openGuideChat(detailTour)} variant="outlined">
              Chat with Guide
            </Button>
          ) : null}
          <Button
            onClick={() => {
              const selectedTour = detailTour;
              handleCloseDetailDialog();
              handleOpenJoinDialog(selectedTour);
            }}
            variant="contained"
            disabled={!detailNextAvailableDate}
          >
            Book This Tour
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={joinDialogOpen} onClose={handleCloseJoinDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Book Tour</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {activeTour?.title || 'Tour'}
          </Typography>
          <TextField
            select
            label={isMultiDayTour(activeTour) ? 'Choose Package Start Date' : 'Choose Date'}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            fullWidth
          >
            {getAvailableDates(activeTour).map((slot) => (
              <MenuItem key={slot.date} value={slot.date}>
                {isMultiDayTour(activeTour) && slot?.isPackage
                  ? `${formatDateLabel(slot.date)} - ${formatDateLabel(slot.endDate || slot.date)} (${slot.packageDays || 1} day${Number(slot.packageDays || 1) > 1 ? 's' : ''}) - ${slot.remainingSeats} seats left`
                  : `${formatDateLabel(slot.date)} - ${slot.remainingSeats} seats left`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label="Seats"
            value={selectedSeats}
            onChange={(event) => setSelectedSeats(Math.max(1, Math.min(maxBookableSeats, toNumber(event.target.value, 1))))}
            inputProps={{ min: 1, max: maxBookableSeats }}
            helperText={`You can book up to ${maxBookableSeats} seat(s) for selected date.`}
            fullWidth
          />
          <TextField
            label="Note to Guide (optional)"
            multiline
            rows={3}
            value={joinNote}
            onChange={(event) => setJoinNote(event.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseJoinDialog} disabled={bookingLoading}>Cancel</Button>
          <Button onClick={handleJoinTour} variant="contained" disabled={bookingLoading || !selectedDate}>
            {bookingLoading ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Advance Payment Required</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {paymentCopyMessage ? (
            <Alert severity="success">{paymentCopyMessage}</Alert>
          ) : null}

          <Card sx={{ border: '1px solid #86efac', background: 'linear-gradient(135deg, #ecfdf3 0%, #f8fafc 100%)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Pay Advance To Reserve This Tour</Typography>
              <Stack spacing={0.9}>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  Booking ID: <strong>{createdBooking?._id?.slice(-8).toUpperCase() || 'N/A'}</strong>
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: '#475569', fontWeight: 600 }}>Total booking amount</Typography>
                  <Typography sx={{ color: '#0f172a', fontWeight: 800 }}>{formatCurrency(currentTotalAmount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: '#166534', fontWeight: 700 }}>Pay now as advance</Typography>
                  <Typography sx={{ color: '#166534', fontWeight: 900 }}>{formatCurrency(currentAdvanceAmount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: '#92400e', fontWeight: 700 }}>Pay later during tour</Typography>
                  <Typography sx={{ color: '#92400e', fontWeight: 900 }}>{formatCurrency(currentRemainingAmount)}</Typography>
                </Stack>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Your slot is held for about {paymentWindowMinutes} minutes while you complete the advance payment.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' } }}>
            <Box sx={{ p: 1.5, border: '1px solid #dbe3ef', borderRadius: 2, bgcolor: '#fff' }}>
              {paymentQrUrl ? (
                <Box
                  component="img"
                  src={paymentQrUrl}
                  alt="Guide UPI QR"
                  sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1.5 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  QR image not available. Use the UPI ID shown here.
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 1.5, border: '1px solid #dbe3ef', borderRadius: 2, bgcolor: '#fff' }}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>UPI Payee Name</Typography>
                  <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{paymentSnapshot?.payeeName || 'Not provided'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>UPI ID</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography sx={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{paymentSnapshot?.upiId || 'Not provided'}</Typography>
                    {paymentSnapshot?.upiId ? (
                      <Button size="small" variant="outlined" onClick={() => handleCopy(paymentSnapshot.upiId, 'UPI ID')}>
                        Copy
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
                {paymentSnapshot?.advancePaymentNotes ? (
                  <Alert severity="info" sx={{ border: '1px solid #bfdbfe', bgcolor: '#eff6ff' }}>
                    {paymentSnapshot.advancePaymentNotes}
                  </Alert>
                ) : null}
                {paymentSnapshot?.upiId ? (
                  <Button variant="contained" onClick={() => { window.location.href = upiPaymentLink; }}>
                    Open In UPI App
                  </Button>
                ) : null}
              </Stack>
            </Box>
          </Box>

          <Card sx={{ border: '1px solid #dbe3ef' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Submit Payment Proof</Typography>
              <Stack spacing={1.2}>
                <TextField
                  label="UPI Reference / UTR Number"
                  value={txnRef}
                  onChange={(event) => setTxnRef(event.target.value)}
                  placeholder="Example: 412345678901"
                  fullWidth
                  size="small"
                />
                <Button component="label" variant="outlined" sx={{ width: 'fit-content' }}>
                  {proofFile ? 'Change Screenshot' : 'Upload Screenshot (Optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                  />
                </Button>
                {proofFile ? (
                  <Typography variant="caption" color="text.secondary">
                    Selected: {proofFile.name}
                  </Typography>
                ) : null}
                <Alert severity="warning" sx={{ border: '1px solid #fde68a', bgcolor: '#fffbeb' }}>
                  Never share your UPI PIN. Complete payment in your UPI app, then submit the UTR here.
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePaymentDialog} disabled={paymentLoading}>Close</Button>
          <Button onClick={handleSubmitAdvanceProof} variant="contained" disabled={paymentLoading}>
            {paymentLoading ? 'Submitting...' : 'Submit Advance Proof'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
