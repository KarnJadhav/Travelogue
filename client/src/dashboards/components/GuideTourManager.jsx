import React from 'react';
import api from '../../api';
import { buildMediaUrl } from '../../utils/media';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const durationOptions = ['2 hours', 'Half day', 'Full day', 'Multi-day'];
const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
const tomorrowDayjs = () => dayjs().add(1, 'day').startOf('day');
const HOLD_WINDOW_MINUTES = 30;
const HOLD_WINDOW_MS = HOLD_WINDOW_MINUTES * 60 * 1000;
const ACTIVE_BOOKING_STATUSES = new Set(['confirmed']);

const formatDateLabel = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const createEmptyForm = () => ({
  tourName: '',
  destination: '',
  summary: '',
  itineraryText: '',
  meetingPoint: '',
  durationType: 'Half day',
  startDate: '',
  endDate: '',
  timeSlot: 'Morning',
  minPeople: 1,
  maxPeople: 10,
  pricePerPerson: '',
  groupPricing: '',
  coverImage: null,
  coverPreview: '',
  mediaFiles: [],
  itineraryPdf: null,
  removeExistingCover: false,
  removeExistingImages: false,
  removeExistingVideos: false,
  removeExistingItineraryPdf: false
});

const mapTourToForm = (tour) => {
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  const startDate = customDates[0];
  const endDate = customDates[customDates.length - 1] || customDates[0];
  const isRangeTour = customDates.length > 1;

  return {
    tourName: tour?.title || '',
    destination: tour?.destination || '',
    summary: tour?.shortDescription || '',
    itineraryText: tour?.fullDescription || '',
    meetingPoint: tour?.meetingPoint || '',
    durationType: isRangeTour
      ? 'Multi-day'
      : durationOptions.includes(tour?.durationType)
        ? tour.durationType
        : 'Half day',
    startDate: toDateInput(startDate),
    endDate: toDateInput(endDate),
    timeSlot: timeSlots.includes(tour?.schedule?.timeSlots?.[0]) ? tour.schedule.timeSlots[0] : 'Morning',
    minPeople: Number(tour?.schedule?.minTravelers || 1),
    maxPeople: Number(tour?.schedule?.maxTravelers || 10),
    pricePerPerson: String(tour?.pricing?.pricePerPerson ?? ''),
    groupPricing: String(tour?.pricing?.groupPricing ?? ''),
    coverImage: null,
    coverPreview: '',
    mediaFiles: [],
    itineraryPdf: null,
    removeExistingCover: false,
    removeExistingImages: false,
    removeExistingVideos: false,
    removeExistingItineraryPdf: false
  };
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const isFutureDateString = (value) => {
  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) return false;
  return parsed.isAfter(dayjs(), 'day');
};

const buildDateRange = (startDate, endDate) => {
  if (!startDate) return [];
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return [];
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (start.getTime() < tomorrow.getTime()) return [];

  if (!endDate) return [start];

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) return [start];

  const list = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    list.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (list.length >= 60) break;
  }
  return list;
};

const splitMediaFiles = (files = []) => {
  const images = [];
  const videos = [];
  files.forEach((file) => {
    if (String(file?.type || '').startsWith('video/')) videos.push(file);
    else images.push(file);
  });
  return { images, videos };
};

const spansMultipleDays = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid()) return false;
  return end.isAfter(start, 'day');
};

const mediaStats = (tour) => ({
  images: Array.isArray(tour?.media?.images) ? tour.media.images.length : 0,
  videos: Array.isArray(tour?.media?.videos) ? tour.media.videos.length : 0
});

const isMultiDayTour = (tour) => {
  if (String(tour?.durationType || '').toLowerCase() === 'multi-day') return true;
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  return new Set(customDates.map((date) => toDateInput(date)).filter(Boolean)).size > 1;
};

const getTourDateKeys = (tour) => {
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  return Array.from(
    new Set(customDates.map((date) => {
      const key = toDateInput(date);
      return key || '';
    }).filter(Boolean))
  ).sort();
};

const getTourRange = (tour) => {
  const keys = getTourDateKeys(tour);
  return {
    startKey: keys[0] || '',
    endKey: keys[keys.length - 1] || '',
    days: keys.length
  };
};

const formatDateKeyLabel = (dateKey) => {
  if (!dateKey) return 'selected date';
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDateKeysBetweenDateTimes = (startValue, endValue) => {
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

const isBookingHoldingSlot = (booking, nowEpoch = Date.now()) => {
  const status = String(booking?.status || '').toLowerCase();
  if (ACTIVE_BOOKING_STATUSES.has(status)) return true;
  if (status !== 'pending') return false;

  const advanceStatus = String(booking?.advancePaymentStatus || '').toLowerCase();
  if (advanceStatus === 'submitted') return true;
  if (advanceStatus === 'awaiting_payment' || advanceStatus === 'rejected') {
    const createdAt = booking?.createdAt ? new Date(booking.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
    return createdAt.getTime() >= nowEpoch - HOLD_WINDOW_MS;
  }
  return false;
};

const buildGuideParticipantRows = (tour, participants = []) => {
  const confirmed = (Array.isArray(participants) ? participants : []).filter(
    (item) => (item?.status || 'confirmed') === 'confirmed'
  );
  const sorted = [...confirmed].sort(
    (a, b) => new Date(b?.joinedAt || 0).getTime() - new Date(a?.joinedAt || 0).getTime()
  );

  if (!isMultiDayTour(tour)) {
    return sorted.map((item) => {
      const tourist = item?.touristId || {};
      return {
        id: String(item?._id || ''),
        touristName: tourist?.name || tourist?.email || 'Tourist',
        touristEmail: tourist?.email || '',
        seats: Math.max(1, toNumber(item?.seats, 1)),
        joinedAt: item?.joinedAt || null,
        startDate: item?.tourDate || null,
        endDate: item?.tourDate || null,
        notes: item?.note ? [String(item.note)] : []
      };
    });
  }

  const range = getTourRange(tour);
  const grouped = new Map();
  sorted.forEach((item) => {
    const tourist = item?.touristId || {};
    const touristId = String(tourist?._id || item?.touristId || '');
    const key = touristId || String(item?._id || '');
    const existing = grouped.get(key);
    const seats = Math.max(1, toNumber(item?.seats, 1));
    const nextJoinedAt = item?.joinedAt || existing?.joinedAt || null;
    const nextNotes = item?.note ? [...(existing?.notes || []), String(item.note)] : existing?.notes || [];

    grouped.set(key, {
      id: key,
      touristName: tourist?.name || tourist?.email || existing?.touristName || 'Tourist',
      touristEmail: tourist?.email || existing?.touristEmail || '',
      seats: (existing?.seats || 0) + seats,
      joinedAt: nextJoinedAt,
      startDate: range.startKey ? new Date(`${range.startKey}T00:00:00.000Z`) : item?.tourDate || null,
      endDate: range.endKey ? new Date(`${range.endKey}T00:00:00.000Z`) : item?.tourDate || null,
      notes: nextNotes,
      packageDays: Math.max(1, range.days || 1)
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b?.joinedAt || 0).getTime() - new Date(a?.joinedAt || 0).getTime()
  );
};

export default function GuideTourManager({ tours = [], bookings = [], onToursChange, onRefreshTours }) {
  const [open, setOpen] = React.useState(false);
  const [editingTourId, setEditingTourId] = React.useState('');
  const [form, setForm] = React.useState(createEmptyForm());
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState({ type: '', text: '' });

  const editingTour = React.useMemo(
    () => tours.find((tour) => String(tour?._id) === String(editingTourId)) || null,
    [tours, editingTourId]
  );

  const unavailableDateSet = React.useMemo(() => {
    const nowEpoch = Date.now();
    const editingId = String(editingTourId || '');
    const blockedDateKeys = [];

    (Array.isArray(tours) ? tours : []).forEach((tour) => {
      if (editingId && String(tour?._id || '') === editingId) return;
      blockedDateKeys.push(...getTourDateKeys(tour));
    });

    (Array.isArray(bookings) ? bookings : []).forEach((booking) => {
      if (!isBookingHoldingSlot(booking, nowEpoch)) return;

      const sourceType = String(booking?.sourceType || '').toLowerCase();
      const sourceTourId = String(booking?.sourceTourId || '');
      if (editingId && sourceType === 'tour' && sourceTourId === editingId) return;

      blockedDateKeys.push(
        ...getDateKeysBetweenDateTimes(booking?.startDateTime, booking?.endDateTime)
      );
    });

    return new Set(blockedDateKeys.filter(Boolean));
  }, [tours, bookings, editingTourId]);

  const isUnavailableDate = React.useCallback(
    (value) => {
      const parsed = dayjs(value);
      if (!parsed.isValid()) return false;
      return unavailableDateSet.has(parsed.format('YYYY-MM-DD'));
    },
    [unavailableDateSet]
  );

  const findUnavailableDateInRange = React.useCallback(
    (startDate, endDate) => {
      const selectedRange = buildDateRange(startDate, endDate || startDate);
      return selectedRange
        .map((value) => toDateInput(value))
        .find((dateKey) => dateKey && unavailableDateSet.has(dateKey)) || '';
    },
    [unavailableDateSet]
  );

  const BookingConflictDay = (props) => {
    const { day, outsideCurrentMonth, selected, disabled, ...other } = props;
    const blocked = !outsideCurrentMonth && isUnavailableDate(day);

    return (
      <PickersDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        selected={selected}
        disabled={disabled || blocked}
        sx={{
          borderRadius: 1.5,
          border: blocked ? '1px solid #ef4444' : '1px solid transparent',
          fontWeight: blocked ? 800 : 500,
          ...(blocked && {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            textDecoration: 'line-through',
            '&:hover': { backgroundColor: '#fecaca' },
            '&.Mui-disabled': {
              opacity: 1,
              backgroundColor: '#fee2e2',
              color: '#991b1b'
            }
          })
        }}
      />
    );
  };

  const openCreateDialog = () => {
    setEditingTourId('');
    setForm(createEmptyForm());
    setOpen(true);
  };

  const openEditDialog = (tour) => {
    setEditingTourId(String(tour?._id || ''));
    setForm(mapTourToForm(tour));
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingTourId('');
    setForm(createEmptyForm());
  };

  const patchTours = (updater) => {
    if (typeof onToursChange !== 'function') return;
    onToursChange((prevTours) => {
      const safeTours = Array.isArray(prevTours) ? prevTours : [];
      return updater(safeTours);
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name) => (event) => {
    const { checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleCoverImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      coverImage: file,
      coverPreview: URL.createObjectURL(file),
      removeExistingCover: false
    }));
    event.target.value = '';
  };

  const handleMediaFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setForm((prev) => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files]
    }));
    event.target.value = '';
  };

  const handleItineraryPdf = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      itineraryPdf: file,
      removeExistingItineraryPdf: false
    }));
    event.target.value = '';
  };

  const removeSelectedMedia = (index) => {
    setForm((prev) => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, idx) => idx !== index)
    }));
  };

  const validate = () => {
    if (!form.tourName.trim()) return 'Tour name is required.';
    if (!form.destination.trim()) return 'Destination is required.';
    if (!form.startDate) return 'Start date is required.';
    if (!isFutureDateString(form.startDate)) return 'Start date must be a future day (tomorrow or later).';
    if (form.endDate && new Date(form.endDate).getTime() < new Date(form.startDate).getTime()) {
      return 'End date cannot be before start date.';
    }
    if (form.endDate && !isFutureDateString(form.endDate)) {
      return 'End date must be a future day (tomorrow or later).';
    }
    const blockedDateKey = findUnavailableDateInRange(form.startDate, form.endDate);
    if (blockedDateKey) {
      return `Guide is unavailable on ${formatDateKeyLabel(blockedDateKey)}. Please choose free dates.`;
    }
    if (!String(form.pricePerPerson).trim()) return 'Price per person is required.';
    if (Number(form.minPeople) < 1 || Number(form.maxPeople) < 1) return 'Group size should be at least 1.';
    if (Number(form.maxPeople) < Number(form.minPeople)) return 'Max people should be greater than or equal to min people.';
    return '';
  };

  const buildPayload = () => {
    const formData = new FormData();
    const dateRange = buildDateRange(form.startDate, form.endDate);
    const inferredDurationType = dateRange.length > 1 ? 'Multi-day' : form.durationType;
    const { images, videos } = splitMediaFiles(form.mediaFiles);

    const summary = form.summary.trim() || `Guided tour in ${form.destination.trim()}`;
    const fullDescription =
      form.itineraryText.trim() ||
      `${summary}. Meeting point: ${form.meetingPoint.trim() || form.destination.trim()}.`;

    formData.append('title', form.tourName.trim());
    formData.append('shortDescription', summary);
    formData.append('fullDescription', fullDescription);
    formData.append('category', 'Guided Tour');
    formData.append('destination', form.destination.trim());
    formData.append('meetingPoint', (form.meetingPoint || form.destination).trim());
    formData.append('durationType', inferredDurationType);
    formData.append('tourType', 'Group Tour');
    formData.append('difficultyLevel', 'Easy');
    formData.append('ageRestriction', 'Family-friendly');
    formData.append('status', 'published');

    formData.append(
      'pricing',
      JSON.stringify({
        currency: 'INR',
        pricePerPerson: toNumber(form.pricePerPerson, 0),
        groupPricing: toNumber(form.groupPricing, 0),
        couplePricing: 0,
        childPricing: 0,
        weekendPricing: 0,
        seasonalPricing: [],
        additionalCharges: {
          taxes: 0,
          equipmentFees: 0,
          entryTickets: 0,
          foodCharges: 0
        },
        discounts: {
          earlyBird: { enabled: false, type: 'percent', value: 0 },
          festivalOffer: { enabled: false, type: 'percent', value: 0 },
          couponCode: '',
          couponDiscount: 0,
          referralDiscount: 0
        }
      })
    );

    formData.append(
      'schedule',
      JSON.stringify({
        availabilityType: 'custom',
        weeklyDays: [],
        customDates: dateRange,
        recurring: {
          frequency: 'weekly',
          interval: 1,
          startDate: form.startDate,
          endDate: form.endDate || form.startDate
        },
        timeSlots: [form.timeSlot],
        customTimeSlots: [],
        minTravelers: Math.max(1, toNumber(form.minPeople, 1)),
        maxTravelers: Math.max(1, toNumber(form.maxPeople, 10)),
        blockedDates: [],
        autoCloseWhenFull: true,
        googleCalendarSync: {
          enabled: false,
          calendarEmail: ''
        }
      })
    );

    formData.append(
      'smartFeatures',
      JSON.stringify({
        autoImageCompression: true,
        aiImageEnhancement: false
      })
    );

    formData.append(
      'socialSettings',
      JSON.stringify({
        allowLikes: true,
        allowFollowing: true
      })
    );

    if (form.coverImage) {
      formData.append('coverImage', form.coverImage);
    }
    images.forEach((image) => formData.append('galleryImages', image));
    videos.forEach((video) => formData.append('videos', video));
    if (form.itineraryPdf) {
      formData.append('itineraryPdf', form.itineraryPdf);
    }

    if (editingTourId && editingTour) {
      if (form.removeExistingCover) formData.append('removeCoverImage', 'true');
      if (form.removeExistingItineraryPdf) formData.append('removeItineraryPdf', 'true');
      if (form.removeExistingImages) {
        const removeIds = (editingTour.media?.images || []).map((item) => String(item?._id)).filter(Boolean);
        formData.append('removeGalleryImageIds', JSON.stringify(removeIds));
      }
      if (form.removeExistingVideos) {
        const removeIds = (editingTour.media?.videos || []).map((item) => String(item?._id)).filter(Boolean);
        formData.append('removeVideoIds', JSON.stringify(removeIds));
      }
    }

    return formData;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice({ type: '', text: '' });

    const validationMessage = validate();
    if (validationMessage) {
      setNotice({ type: 'error', text: validationMessage });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const response = editingTourId
        ? await api.put(`/tour/${editingTourId}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/tour', payload, { headers: { 'Content-Type': 'multipart/form-data' } });

      const updatedTour = response?.data?.tour;
      if (updatedTour) {
        if (editingTourId) {
          patchTours((prev) => prev.map((tour) => (String(tour._id) === String(updatedTour._id) ? updatedTour : tour)));
        } else {
          patchTours((prev) => [updatedTour, ...prev]);
        }
      }

      if (typeof onRefreshTours === 'function') {
        await onRefreshTours();
      }

      setNotice({
        type: 'success',
        text: editingTourId ? 'Tour updated successfully.' : 'Tour created successfully.'
      });
      closeDialog();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to save tour.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tourId) => {
    const confirmed = window.confirm('Delete this tour?');
    if (!confirmed) return;
    try {
      await api.delete(`/tour/${tourId}`);
      patchTours((prev) => prev.filter((tour) => String(tour._id) !== String(tourId)));
      if (typeof onRefreshTours === 'function') {
        await onRefreshTours();
      }
      setNotice({ type: 'success', text: 'Tour deleted.' });
    } catch (err) {
      setNotice({ type: 'error', text: err?.response?.data?.message || 'Failed to delete tour.' });
    }
  };

  const coverFromEdit = editingTour?.media?.coverImage?.url ? buildMediaUrl(editingTour.media.coverImage.url) : '';
  const coverPreview = form.coverPreview || (form.removeExistingCover ? '' : coverFromEdit);
  const mediaCount = form.mediaFiles.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Create Tour</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep it simple: name, destination, media, price, itinerary, dates, and group size.
          </Typography>
        </Box>
        <Button variant="contained" size="large" onClick={openCreateDialog} sx={{ fontWeight: 800 }}>
          + New Tour
        </Button>
      </Box>

      {notice.text ? (
        <Alert severity={notice.type === 'error' ? 'error' : 'success'} onClose={() => setNotice({ type: '', text: '' })}>
          {notice.text}
        </Alert>
      ) : null}

      {tours.length === 0 ? (
        <Box sx={{ p: 5, borderRadius: 3, border: '2px dashed #d8dee8', bgcolor: '#fbfdff', textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700}>No tours yet</Typography>
          <Typography variant="body2" color="text.secondary" mt={1} mb={2}>
            Add your first tour so tourists can quickly understand your offer and book confidently.
          </Typography>
          <Button variant="contained" onClick={openCreateDialog}>Create First Tour</Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))'
            }
          }}
        >
          {tours.map((tour) => {
            const cover = tour?.media?.coverImage?.url ? buildMediaUrl(tour.media.coverImage.url) : '';
            const stats = mediaStats(tour);
            const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
            const fromDate = customDates[0];
            const toDate = customDates[customDates.length - 1] || customDates[0];
            const availability = Array.isArray(tour?.seatSummary?.availability) ? tour.seatSummary.availability : [];
            const nextAvailable = availability.find((slot) => Number(slot?.remainingSeats || 0) > 0) || null;
            const totalBookedSeats = Number(tour?.seatSummary?.totalBookedSeats || 0);
            const maxSeats = Number(tour?.seatSummary?.maxSeats || tour?.schedule?.maxTravelers || 0);
            const participants = Array.isArray(tour?.participants)
              ? tour.participants.filter((item) => (item?.status || 'confirmed') === 'confirmed')
              : [];
            const bookingRows = buildGuideParticipantRows(tour, participants);
            const packageRange = getTourRange(tour);
            const multiDay = isMultiDayTour(tour);
            return (
              <Card key={String(tour._id)} sx={{ borderRadius: 3, border: '1px solid #dde5f2', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)' }}>
                {cover ? (
                  <CardMedia component="img" height="190" image={cover} alt={tour.title || 'Tour'} />
                ) : (
                  <Box sx={{ height: 190, bgcolor: '#eef3f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No cover image</Typography>
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6" fontWeight={800} noWrap>{tour.title || 'Untitled Tour'}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    {tour.destination || 'Destination not set'}
                  </Typography>

                  <Stack spacing={0.9} mb={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonthIcon fontSize="small" />
                      <Typography variant="caption">{formatDateLabel(fromDate)} - {formatDateLabel(toDate)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GroupsIcon fontSize="small" />
                      <Typography variant="caption">{tour.schedule?.minTravelers || 1} to {tour.schedule?.maxTravelers || 10} people</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CurrencyRupeeIcon fontSize="small" />
                      <Typography variant="caption">INR {toNumber(tour.pricing?.pricePerPerson, 0).toLocaleString('en-IN')} per person</Typography>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} mb={2}>
                    <Chip icon={<ImageIcon />} size="small" label={stats.images} />
                    <Chip icon={<VideoLibraryIcon />} size="small" label={stats.videos} />
                    <Chip size="small" color="primary" label={`Booked ${totalBookedSeats}/${maxSeats || 0}`} />
                    <Chip
                      size="small"
                      color={nextAvailable ? 'success' : 'warning'}
                      label={
                        nextAvailable
                          ? `${nextAvailable.remainingSeats} seat${nextAvailable.remainingSeats === 1 ? '' : 's'} left${multiDay ? ' (package)' : ''}`
                          : 'No seats left'
                      }
                    />
                  </Stack>

                  <Box sx={{ mb: 1.8 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Joined Tourists
                    </Typography>
                    {bookingRows.length === 0 ? (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.4 }}>
                        No tourist has joined yet.
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          mt: 0.75,
                          border: '1px solid #dde5f2',
                          borderRadius: 1.6,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 0.6fr 1fr',
                            bgcolor: '#f6f8fc',
                            borderBottom: '1px solid #dde5f2',
                            px: 1.2,
                            py: 0.8
                          }}
                        >
                          <Typography variant="caption" fontWeight={800}>Tourist</Typography>
                          <Typography variant="caption" fontWeight={800}>Seats</Typography>
                          <Typography variant="caption" fontWeight={800}>Trip Window</Typography>
                        </Box>
                        <Box sx={{ maxHeight: 168, overflowY: 'auto' }}>
                          {bookingRows.map((row) => (
                            <Box
                              key={row.id}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 0.6fr 1fr',
                                px: 1.2,
                                py: 0.9,
                                gap: 0.7,
                                borderBottom: '1px solid #edf2fb',
                                '&:last-child': { borderBottom: 'none' }
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" fontWeight={700} noWrap>
                                  {row.touristName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                  {row.touristEmail || 'Email not shared'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Booked on {formatDateLabel(row.joinedAt)}
                                </Typography>
                              </Box>
                              <Box>
                                <Chip
                                  size="small"
                                  label={`${row.seats} seat${row.seats > 1 ? 's' : ''}`}
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 22 }}
                                />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  {formatDateLabel(row.startDate)} - {formatDateLabel(row.endDate)}
                                </Typography>
                                {multiDay ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {row.packageDays || packageRange.days || 1} day package
                                  </Typography>
                                ) : null}
                                {row.notes?.length ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    Note: {row.notes[row.notes.length - 1]}
                                  </Typography>
                                ) : null}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={() => openEditDialog(tour)} sx={{ fontWeight: 700 }}>
                      Edit
                    </Button>
                    <Button startIcon={<DeleteOutlineIcon />} variant="outlined" size="small" color="error" onClick={() => handleDelete(tour._id)} sx={{ fontWeight: 700 }}>
                      Delete
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingTourId ? 'Edit Tour' : 'Create New Tour'}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 2, border: '1px solid #dce4f0', borderRadius: 2 }}>
              <Typography fontWeight={800} mb={1.5}>Tour Basics</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField label="Tour Name *" name="tourName" value={form.tourName} onChange={handleInputChange} required />
                <TextField label="Destination *" name="destination" value={form.destination} onChange={handleInputChange} required />
                <TextField label="Meeting Point" name="meetingPoint" value={form.meetingPoint} onChange={handleInputChange} />
                <TextField select label="Duration" name="durationType" value={form.durationType} onChange={handleInputChange}>
                  {durationOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
                <TextField select label="Tour Time" name="timeSlot" value={form.timeSlot} onChange={handleInputChange}>
                  {timeSlots.map((slot) => <MenuItem key={slot} value={slot}>{slot}</MenuItem>)}
                </TextField>
                <TextField type="number" inputProps={{ min: 1 }} label="Min People" name="minPeople" value={form.minPeople} onChange={handleInputChange} />
                <TextField type="number" inputProps={{ min: 1 }} label="Max People" name="maxPeople" value={form.maxPeople} onChange={handleInputChange} />
              </Box>

              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid #d4deef',
                  bgcolor: 'linear-gradient(180deg,#f8fbff 0%,#eef5ff 100%)',
                  background: 'linear-gradient(180deg,#f8fbff 0%,#eef5ff 100%)'
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1e3a8a', mb: 1 }}>
                  Tour Calendar
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.2, color: '#b91c1c', fontWeight: 700 }}>
                  Red dates are unavailable (already booked or assigned to another tour).
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                    <DatePicker
                      label="Start Date *"
                      value={form.startDate ? dayjs(form.startDate) : null}
                      minDate={tomorrowDayjs()}
                      disablePast
                      shouldDisableDate={isUnavailableDate}
                      slots={{ day: BookingConflictDay }}
                      onChange={(dateValue) => {
                        const nextStart = dateValue && dateValue.isValid() ? dateValue.format('YYYY-MM-DD') : '';
                        if (nextStart && unavailableDateSet.has(nextStart)) {
                          setNotice({
                            type: 'error',
                            text: `Guide is unavailable on ${formatDateKeyLabel(nextStart)}. Please choose a free date.`
                          });
                          return;
                        }
                        setForm((prev) => {
                          const nextState = { ...prev, startDate: nextStart };
                          if (nextStart && prev.endDate && dayjs(prev.endDate).isBefore(dayjs(nextStart), 'day')) {
                            nextState.endDate = nextStart;
                          }
                          if (spansMultipleDays(nextState.startDate, nextState.endDate)) {
                            nextState.durationType = 'Multi-day';
                          }
                          return nextState;
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          helperText: unavailableDateSet.size > 0
                            ? 'Only future free dates (red = unavailable).'
                            : 'Only future dates (from tomorrow).'
                        }
                      }}
                    />
                    <DatePicker
                      label="End Date"
                      value={form.endDate ? dayjs(form.endDate) : null}
                      minDate={form.startDate ? dayjs(form.startDate) : tomorrowDayjs()}
                      disablePast
                      shouldDisableDate={isUnavailableDate}
                      slots={{ day: BookingConflictDay }}
                      onChange={(dateValue) => {
                        const nextEnd = dateValue && dateValue.isValid() ? dateValue.format('YYYY-MM-DD') : '';
                        if (nextEnd && unavailableDateSet.has(nextEnd)) {
                          setNotice({
                            type: 'error',
                            text: `Guide is unavailable on ${formatDateKeyLabel(nextEnd)}. Please choose a free date.`
                          });
                          return;
                        }
                        setForm((prev) => {
                          const nextState = { ...prev, endDate: nextEnd };
                          if (spansMultipleDays(nextState.startDate, nextState.endDate)) {
                            nextState.durationType = 'Multi-day';
                          }
                          return nextState;
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: form.startDate
                            ? 'Same day or after start date. Red dates are unavailable.'
                            : 'Choose start date first'
                        }
                      }}
                    />
                  </Box>
                </LocalizationProvider>
              </Box>

              <TextField
                label="Short Tour Intro"
                name="summary"
                value={form.summary}
                onChange={handleInputChange}
                multiline
                rows={2}
                fullWidth
                sx={{ mt: 1.5 }}
                placeholder="A quick one-line idea tourists can understand instantly."
              />
            </Box>

            <Box sx={{ p: 2, border: '1px solid #dce4f0', borderRadius: 2 }}>
              <Typography fontWeight={800} mb={1.5}>Pricing</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  type="number"
                  label="Price per Person (INR) *"
                  name="pricePerPerson"
                  value={form.pricePerPerson}
                  onChange={handleInputChange}
                  required
                />
                <TextField
                  type="number"
                  label="Group Price (INR)"
                  name="groupPricing"
                  value={form.groupPricing}
                  onChange={handleInputChange}
                />
              </Box>
            </Box>

            <Box sx={{ p: 2, border: '1px solid #dce4f0', borderRadius: 2 }}>
              <Typography fontWeight={800} mb={1.5}>Media & Itinerary</Typography>
              <Stack spacing={1.2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                  <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                    Cover Image
                    <input hidden type="file" accept="image/*" onChange={handleCoverImage} />
                  </Button>
                  <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                    Tour Photos & Videos
                    <input hidden type="file" accept="image/*,video/*" multiple onChange={handleMediaFiles} />
                  </Button>
                  <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                    Itinerary PDF
                    <input hidden type="file" accept="application/pdf" onChange={handleItineraryPdf} />
                  </Button>
                </Stack>

                {coverPreview ? (
                  <Box component="img" src={coverPreview} alt="Cover preview" sx={{ width: 210, borderRadius: 1.5, border: '1px solid #d3dcea' }} />
                ) : null}

                {mediaCount > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                    {form.mediaFiles.map((file, index) => (
                      <Chip
                        key={`${file.name}_${index}`}
                        label={file.name}
                        onDelete={() => removeSelectedMedia(index)}
                        size="small"
                        color={String(file.type).startsWith('video/') ? 'secondary' : 'default'}
                      />
                    ))}
                  </Box>
                ) : null}

                {form.itineraryPdf ? (
                  <Chip label={form.itineraryPdf.name} size="small" color="success" />
                ) : null}

                {editingTourId ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <FormControlLabel
                      control={<Switch checked={form.removeExistingCover} onChange={handleSwitchChange('removeExistingCover')} />}
                      label="Remove old cover"
                    />
                    <FormControlLabel
                      control={<Switch checked={form.removeExistingImages} onChange={handleSwitchChange('removeExistingImages')} />}
                      label="Remove old images"
                    />
                    <FormControlLabel
                      control={<Switch checked={form.removeExistingVideos} onChange={handleSwitchChange('removeExistingVideos')} />}
                      label="Remove old videos"
                    />
                    <FormControlLabel
                      control={<Switch checked={form.removeExistingItineraryPdf} onChange={handleSwitchChange('removeExistingItineraryPdf')} />}
                      label="Remove old PDF"
                    />
                  </Stack>
                ) : null}
              </Stack>

              <TextField
                label="Itinerary / Highlights"
                name="itineraryText"
                value={form.itineraryText}
                onChange={handleInputChange}
                multiline
                rows={4}
                fullWidth
                sx={{ mt: 1.5 }}
                placeholder="Share key stops, experiences, inclusions, and what tourists should expect."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 135, fontWeight: 800 }}>
              {saving ? 'Saving...' : editingTourId ? 'Update Tour' : 'Create Tour'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
