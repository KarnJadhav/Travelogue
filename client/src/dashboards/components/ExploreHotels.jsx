import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Rating from '@mui/material/Rating';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import HotelIcon from '@mui/icons-material/Hotel';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import api from '../../api';
import { io } from 'socket.io-client';
import { buildMediaUrl } from '../../utils/media';
import { SOCKET_BASE_URL } from '../../config/runtime';

const FALLBACK_IMAGE = '/no-image-fallback.png';

const fallbackRoomTypes = ['Standard', 'Deluxe', 'Suite', 'Family'];
const statusColors = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  checked_in: 'info',
  completed: 'default',
};
const HOTEL_CARD_RADIUS = 28;

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return '';
};

const normalizePositiveInt = (value, fallback = 1) => {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return fallback;
  return Math.max(1, Math.floor(num));
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getStayNights = (checkIn, checkOut) => {
  const start = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);
  if (!start || !end || end <= start) return 0;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getImageSrc = (src) => {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.replace(/\\/g, '/');
  const uploadsIndex = normalizedPath.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return buildMediaUrl(normalizedPath.slice(uploadsIndex));
  }
  if (normalizedPath.toLowerCase().startsWith('uploads/')) {
    return buildMediaUrl(`/${normalizedPath}`);
  }
  return buildMediaUrl(normalizedPath);
};

const toImageArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean);
        }
      } catch {
        // Ignore parse errors and treat as a direct URL/path string.
      }
    }
    return [trimmed];
  }
  return [];
};

const getHotelImageCandidates = (hotel) => {
  const rawCandidates = [
    ...toImageArray(hotel?.images),
    ...toImageArray(hotel?.profile?.images),
    hotel?.ownerAvatar,
    hotel?.user?.avatar,
    hotel?.avatar,
  ];
  const normalizedCandidates = Array.from(
    new Set(rawCandidates.map(getImageSrc).filter(Boolean))
  );

  if (normalizedCandidates.length === 0) {
    return [FALLBACK_IMAGE];
  }

  // Prefer locally uploaded images first because external hotlinked URLs can expire.
  const localUploads = normalizedCandidates.filter((url) => url.includes('/uploads/'));
  const remoteImages = normalizedCandidates.filter((url) => !url.includes('/uploads/'));
  return [...localUploads, ...remoteImages, FALLBACK_IMAGE];
};

const normalizeAmenityItem = (item) => {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
  if (typeof item === 'object') {
    if (item.value) return String(item.value).trim();
    if (item.label) return String(item.label).trim();
    if (item.name) return String(item.name).trim();
  }
  return '';
};

const normalizeAmenities = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeAmenityItem).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.amenities)) {
      return raw.amenities.map(normalizeAmenityItem).filter(Boolean);
    }
    return Object.entries(raw)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => String(key).trim())
      .filter(Boolean);
  }
  return [];
};

export default function ExploreHotels({ onOpenChat }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const touristId = user?._id || user?.userId;
  const [hotels, setHotels] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [hotelRooms, setHotelRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsByHotel, setRoomsByHotel] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [dateConflict, setDateConflict] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    roomCount: 1,
    roomType: fallbackRoomTypes[0],
    notes: '',
  });
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [bookings, setBookings] = useState([]);
  const [reviewsByHotel, setReviewsByHotel] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsViewMode, setBookingsViewMode] = useState('grid');
  const [hotelImageCursor, setHotelImageCursor] = useState({});
  const socketRef = useRef(null);
  const selectedHotelRef = useRef(null);

  useEffect(() => {
    selectedHotelRef.current = selectedHotel;
  }, [selectedHotel]);

  useEffect(() => {
    setHotelImageCursor({});
  }, [hotels]);

  const getHotelOwnerId = (hotel) => hotel?.user || hotel?.ownerId || hotel?.userId;

  useEffect(() => {
    async function fetchHotels() {
      try {
        const res = await api.get('/hotel/list');
        setHotels(res.data.hotels || []);
      } catch {
        setHotels([]);
      }
    }
    fetchHotels();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchReviews() {
      if (hotels.length === 0) {
        if (isMounted) setReviewsByHotel({});
        return;
      }
      try {
        const entries = await Promise.all(
          hotels.map(async (hotel) => {
            const hotelId = getId(hotel?._id);
            if (!hotelId) return [null, []];
            try {
              const res = await api.get(`/hotelReview/hotel/${hotelId}`);
              return [hotelId, res.data.reviews || []];
            } catch {
              return [hotelId, []];
            }
          })
        );
        if (!isMounted) return;
        const next = entries.reduce((acc, [key, value]) => {
          if (key) acc[key] = value;
          return acc;
        }, {});
        setReviewsByHotel(next);
      } catch {
        if (isMounted) setReviewsByHotel({});
      }
    }
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [hotels]);

  useEffect(() => {
    let isMounted = true;
    async function fetchRooms() {
      if (hotels.length === 0) return;
      try {
        const entries = await Promise.all(
          hotels.map(async (hotel) => {
            try {
              const ownerId = getHotelOwnerId(hotel);
              if (!ownerId) return [ownerId, []];
              const res = await api.get(`/room/hotel/${ownerId}`);
              return [ownerId, res.data || []];
            } catch {
              const ownerId = getHotelOwnerId(hotel);
              return [ownerId, []];
            }
          })
        );
        if (!isMounted) return;
        const next = entries.reduce((acc, [key, value]) => {
          if (key) acc[key] = value;
          return acc;
        }, {});
        setRoomsByHotel(next);
      } catch {
        if (isMounted) setRoomsByHotel({});
      }
    }
    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, [hotels]);

  useEffect(() => {
    async function fetchBookings() {
      setBookingsLoading(true);
      try {
        const res = await api.get('/hotelBooking/tourist');
        setBookings(res.data.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    }
    fetchBookings();
    if (touristId) {
      if (!socketRef.current) {
        socketRef.current = io(SOCKET_BASE_URL);
      }
      const socket = socketRef.current;
      socket.emit('joinTouristRoom', { touristId });
      const handleBookingUpdate = (data) => {
        if (data && data.touristId === touristId) {
          fetchBookings();
        }
      };
      const handleRoomUpdate = (payload) => {
        if (!payload?.hotelId) return;
        setRoomsByHotel((prev) => {
          const current = prev[payload.hotelId] || [];
          if (payload.deleted && payload.roomId) {
            return {
              ...prev,
              [payload.hotelId]: current.filter((room) => room._id !== payload.roomId),
            };
          }
          if (payload.room) {
            const exists = current.some((room) => room._id === payload.room._id);
            const next = exists
              ? current.map((room) => (room._id === payload.room._id ? payload.room : room))
              : [payload.room, ...current];
            return { ...prev, [payload.hotelId]: next };
          }
          return prev;
        });

        const selected = selectedHotelRef.current;
        const selectedOwnerId = getHotelOwnerId(selected);
        if (selectedOwnerId && selectedOwnerId === payload.hotelId) {
          setHotelRooms((prev) => {
            if (payload.deleted && payload.roomId) {
              return prev.filter((room) => room._id !== payload.roomId);
            }
            if (payload.room) {
              const exists = prev.some((room) => room._id === payload.room._id);
              return exists
                ? prev.map((room) => (room._id === payload.room._id ? payload.room : room))
                : [payload.room, ...prev];
            }
            return prev;
          });
        }
      };
      socket.on('hotelBookingUpdate', handleBookingUpdate);
      socket.on('bookingUpdate', handleBookingUpdate);
      socket.on('hotelRoomUpdatePublic', handleRoomUpdate);
      return () => {
        socket.off('hotelBookingUpdate', handleBookingUpdate);
        socket.off('bookingUpdate', handleBookingUpdate);
        socket.off('hotelRoomUpdatePublic', handleRoomUpdate);
      };
    }
    return undefined;
  }, [touristId]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const filteredHotels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return hotels;
    return hotels.filter((hotel) => {
      return (
        hotel.name?.toLowerCase().includes(query) ||
        hotel.ownerName?.toLowerCase().includes(query) ||
        hotel.address?.toLowerCase().includes(query) ||
        hotel.cityState?.toLowerCase().includes(query) ||
        hotel.hotelType?.toLowerCase().includes(query) ||
        normalizeAmenities(hotel.amenities).some((amenity) => amenity.toLowerCase().includes(query)) ||
        hotel.email?.toLowerCase().includes(query) ||
        hotel.phone?.toLowerCase().includes(query)
      );
    });
  }, [hotels, search]);

  const getReviewsForHotel = (hotelId) => reviewsByHotel[hotelId] || [];

  const reviewedBookingIds = useMemo(() => {
    const ids = new Set();
    const currentTouristId = getId(touristId);
    if (!currentTouristId) return ids;
    Object.values(reviewsByHotel).forEach((list) => {
      (list || []).forEach((review) => {
        const reviewTouristId = getId(review?.touristId);
        const reviewBookingId = getId(review?.bookingId);
        if (reviewTouristId === currentTouristId && reviewBookingId) {
          ids.add(reviewBookingId);
        }
      });
    });
    return ids;
  }, [reviewsByHotel, touristId]);

  const getAverageRating = (hotelId) => {
    const list = getReviewsForHotel(hotelId);
    if (!list.length) return 0;
    const total = list.reduce((sum, r) => sum + (r.rating || 0), 0);
    return total / list.length;
  };

  const today = new Date().toISOString().slice(0, 10);

  const getAvailableRoomsForHotel = (ownerId) => {
    const list = roomsByHotel[ownerId] || [];
    return list.filter((room) => {
      const available = Number(room.available) || 0;
      return room.status !== 'Unavailable' && available > 0;
    });
  };

  const availableRooms = useMemo(() => {
    return hotelRooms.filter((room) => {
      const available = Number(room.available) || 0;
      return room.status !== 'Unavailable' && available > 0;
    });
  }, [hotelRooms]);

  const selectableRooms = useMemo(
    () => (availableRooms.length ? availableRooms : hotelRooms),
    [availableRooms, hotelRooms]
  );

  const selectedRoom = useMemo(() => {
    const selectedById = selectableRooms.find((room) => getId(room?._id) === getId(selectedRoomId));
    if (selectedById) return selectedById;
    return selectableRooms.find((room) => room.type === bookingForm.roomType) || null;
  }, [selectableRooms, selectedRoomId, bookingForm.roomType]);

  const selectedRoomAvailable = Number(selectedRoom?.available) || 0;
  const selectedRoomTotal = Number(selectedRoom?.total) || 0;
  const selectedRoomPrice = Number(selectedRoom?.price) || 0;
  const bookingRooms = normalizePositiveInt(bookingForm.roomCount, 1);
  const bookingNights = getStayNights(bookingForm.checkIn, bookingForm.checkOut);
  const bookingEstimate = selectedRoomPrice * bookingNights * bookingRooms;
  const selectedHotelId = getId(selectedHotel?._id);

  useEffect(() => {
    if (!bookingDialogOpen || !selectedHotelId || !bookingForm.checkIn || !bookingForm.checkOut || bookingNights <= 0) {
      setDateConflict(null);
      setCheckingAvailability(false);
      return undefined;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const params = new URLSearchParams({
          hotelId: selectedHotelId,
          checkIn: bookingForm.checkIn,
          checkOut: bookingForm.checkOut,
        });
        if (bookingForm.roomType) {
          params.set('roomType', bookingForm.roomType);
        }
        const res = await api.get(`/hotelBooking/availability?${params.toString()}`);
        if (!isActive) return;
        if (res.data?.available === false) {
          const message = res.data?.message || 'Selected dates are already booked. Please choose another date.';
          setDateConflict({ message });
          setSnackbar({ open: true, message, severity: 'warning' });
        } else {
          setDateConflict(null);
        }
      } catch (err) {
        if (!isActive) return;
        setDateConflict(null);
      } finally {
        if (isActive) {
          setCheckingAvailability(false);
        }
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [bookingDialogOpen, selectedHotelId, bookingForm.checkIn, bookingForm.checkOut, bookingForm.roomType, bookingNights]);

  const roomTypeOptions = useMemo(() => {
    const source = availableRooms.length ? availableRooms : hotelRooms;
    const types = source.map((room) => room.type).filter(Boolean);
    return types.length ? Array.from(new Set(types)) : fallbackRoomTypes;
  }, [availableRooms, hotelRooms]);

  useEffect(() => {
    if (!bookingDialogOpen) return;
    if (roomTypeOptions.length === 0) return;
    setBookingForm((prev) => ({
      ...prev,
      roomType: roomTypeOptions.includes(prev.roomType) ? prev.roomType : roomTypeOptions[0],
    }));
  }, [roomTypeOptions, bookingDialogOpen]);

  useEffect(() => {
    if (!bookingDialogOpen) return;
    if (selectableRooms.length === 0) {
      if (selectedRoomId) setSelectedRoomId('');
      return;
    }
    const matchingRoom = selectableRooms.find((room) => room.type === bookingForm.roomType);
    const nextId = matchingRoom?._id || selectableRooms[0]?._id || '';
    if (nextId && nextId !== selectedRoomId) {
      setSelectedRoomId(nextId);
    }
  }, [bookingDialogOpen, selectableRooms, bookingForm.roomType, selectedRoomId]);

  useEffect(() => {
    if (!bookingDialogOpen || !selectedRoom) return;
    setBookingForm((prev) => {
      const nextCount = normalizePositiveInt(prev.roomCount, 1);
      if (!selectedRoomAvailable) return prev;
      const clampedCount = Math.min(nextCount, selectedRoomAvailable);
      if (clampedCount === prev.roomCount) return prev;
      return { ...prev, roomCount: clampedCount };
    });
  }, [bookingDialogOpen, selectedRoom, selectedRoomAvailable]);

  const fetchHotelRooms = async (ownerId) => {
    if (!ownerId) return null;
    setRoomsLoading(true);
    try {
      const res = await api.get(`/room/hotel/${ownerId}`);
      const nextRooms = res.data || [];
      setHotelRooms(nextRooms);
      setRoomsByHotel((prev) => ({ ...prev, [ownerId]: nextRooms }));
      return nextRooms;
    } catch {
      setHotelRooms([]);
      setRoomsByHotel((prev) => ({ ...prev, [ownerId]: [] }));
      return null;
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleOpenBooking = (hotel) => {
    setSelectedHotel(hotel);
    const ownerId = getHotelOwnerId(hotel);
    setHotelRooms(ownerId ? roomsByHotel[ownerId] || [] : []);
    if (ownerId) {
      fetchHotelRooms(ownerId);
    }
    setBookingForm({
      checkIn: '',
      checkOut: '',
      guests: 1,
      roomCount: 1,
      roomType: fallbackRoomTypes[0],
      notes: '',
    });
    setSelectedRoomId('');
    setDateConflict(null);
    setCheckingAvailability(false);
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedHotel || !bookingForm.checkIn || !bookingForm.checkOut) {
      setSnackbar({ open: true, message: 'Please select check-in and check-out dates.', severity: 'warning' });
      return;
    }
    if (getStayNights(bookingForm.checkIn, bookingForm.checkOut) <= 0) {
      setSnackbar({ open: true, message: 'Check-out date must be after check-in date.', severity: 'warning' });
      return;
    }
    if (checkingAvailability) {
      setSnackbar({ open: true, message: 'Checking selected dates. Please wait.', severity: 'info' });
      return;
    }
    if (dateConflict) {
      setSnackbar({ open: true, message: dateConflict.message, severity: 'warning' });
      return;
    }
    if (roomsLoading) {
      setSnackbar({ open: true, message: 'Rooms are still loading. Please wait.', severity: 'info' });
      return;
    }
    if (hotelRooms.length === 0 || availableRooms.length === 0) {
      setSnackbar({ open: true, message: 'No rooms available for booking right now.', severity: 'warning' });
      return;
    }
    const selectedTypeRoom = selectableRooms.find((room) => room.type === bookingForm.roomType) || selectedRoom;
    const availableForType = Number(selectedTypeRoom?.available) || 0;
    const requestedRooms = normalizePositiveInt(bookingForm.roomCount, 1);
    if (!selectedTypeRoom || !selectedTypeRoom.type) {
      setSnackbar({ open: true, message: 'Please select a valid room type.', severity: 'warning' });
      return;
    }
    if (availableForType <= 0) {
      setSnackbar({ open: true, message: 'Selected room type is sold out.', severity: 'warning' });
      return;
    }
    if (requestedRooms > availableForType) {
      setSnackbar({
        open: true,
        message: `Only ${availableForType} rooms are vacant for ${selectedTypeRoom.type}.`,
        severity: 'warning',
      });
      return;
    }
    try {
      await api.post('/hotelBooking', {
        hotelId: selectedHotel._id,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        guests: bookingForm.guests,
        roomCount: requestedRooms,
        roomType: selectedTypeRoom.type,
        notes: bookingForm.notes,
      });
      const res = await api.get('/hotelBooking/tourist');
      setBookings(res.data.bookings || []);
      setBookingDialogOpen(false);
      setSnackbar({ open: true, message: 'Booking created successfully.', severity: 'success' });
    } catch (err) {
      const message = err?.response?.data?.message || 'Booking failed. Please try again.';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const handleOpenReview = (hotel, bookingId) => {
    const hotelId = getId(hotel?._id);
    setSelectedHotel({ ...hotel, _id: hotelId || hotel?._id, bookingId: bookingId ? getId(bookingId) : undefined });
    setReviewForm({ rating: 0, comment: '' });
    setReviewDialogOpen(true);
    if (hotelId) {
      api
        .get(`/hotelReview/hotel/${hotelId}`)
        .then((res) => {
          setReviewsByHotel((prev) => ({ ...prev, [hotelId]: res.data.reviews || [] }));
        })
        .catch(() => {});
    }
  };

  const handleOpenChat = (hotel) => {
    if (!onOpenChat) return;
    const ownerId = hotel.user || hotel.ownerId || hotel.userId;
    if (!ownerId) {
      setSnackbar({ open: true, message: 'Hotel owner not available for chat.', severity: 'warning' });
      return;
    }
    const imageCandidates = getHotelImageCandidates(hotel);
    onOpenChat({
      userId: ownerId,
      name: hotel.name || hotel.ownerName || 'Hotel',
      subtitle: hotel.ownerName ? `Owner: ${hotel.ownerName}` : 'Hotel admin',
      avatar: imageCandidates[0] || FALLBACK_IMAGE,
      email: hotel.ownerEmail || hotel.email || '',
      type: 'hotel'
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedHotel || !reviewForm.rating || !reviewForm.comment.trim()) {
      setSnackbar({ open: true, message: 'Please provide a rating and comment.', severity: 'warning' });
      return;
    }
    try {
      const res = await api.post('/hotelReview', {
        hotelId: selectedHotel._id,
        bookingId: selectedHotel.bookingId,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      const nextReview = res.data.review;
      setReviewsByHotel((prev) => ({
        ...prev,
        [selectedHotel._id]: [
          nextReview,
          ...(prev[selectedHotel._id] || []).filter((review) => getId(review?._id) !== getId(nextReview?._id)),
        ],
      }));

      setReviewDialogOpen(false);
      setSnackbar({ open: true, message: 'Review submitted. Thank you!', severity: 'success' });
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to submit review.';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const totalReviews = useMemo(
    () => Object.values(reviewsByHotel).reduce((sum, list) => sum + (list?.length || 0), 0),
    [reviewsByHotel]
  );

  const totalVacantRooms = useMemo(
    () =>
      Object.values(roomsByHotel).reduce((sum, list) => {
        const availableUnits = (list || []).reduce((innerSum, room) => {
          if (room.status === 'Unavailable') return innerSum;
          return innerSum + Math.max(0, Number(room.available) || 0);
        }, 0);
        return sum + availableUnits;
      }, 0),
    [roomsByHotel]
  );

  const totalBookableRooms = useMemo(
    () =>
      Object.values(roomsByHotel).reduce((sum, list) => {
        const totalUnits = (list || []).reduce((innerSum, room) => {
          if (room.status === 'Unavailable') return innerSum;
          return innerSum + Math.max(0, Number(room.total) || 0);
        }, 0);
        return sum + totalUnits;
      }, 0),
    [roomsByHotel]
  );

  const renderBookingCard = (booking, isGridMode) => {
    const bookedRooms = normalizePositiveInt(booking.roomCount, 1);
    const stayNights = getStayNights(booking.checkIn, booking.checkOut);
    const pricePerNight = Number(booking.pricePerNight) || 0;
    const totalAmount = Number(booking.totalAmount) || pricePerNight * stayNights * bookedRooms;
    const bookingHotel = booking.hotelId && typeof booking.hotelId === 'object'
      ? booking.hotelId
      : hotels.find((hotel) => getId(hotel._id) === getId(booking.hotelId));
    const bookingAmenities = normalizeAmenities(bookingHotel?.amenities);
    const bookingHotelAddress = bookingHotel?.address || 'Address not provided';
    const bookingCityState = bookingHotel?.cityState || '';
    const bookingHotelType = bookingHotel?.hotelType || '';

    return (
      <Card
        key={booking._id}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: 3,
          border: '1px solid #dce8e2',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfffd 100%)',
          boxShadow: '0 10px 24px rgba(15, 70, 55, 0.10)',
        }}
      >
        <Stack
          direction={isGridMode ? 'column' : { xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {bookingHotel?.name || booking.hotelName || 'Hotel'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Owner: {booking.hotelOwnerId?.name || 'Unknown'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
              {bookingHotelType && <Chip size="small" label={bookingHotelType} />}
              {bookingCityState && <Chip size="small" label={bookingCityState} />}
            </Stack>
            <Stack direction="row" spacing={2} mt={1} alignItems="flex-start">
              <LocationOnIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {bookingHotelAddress}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} mt={1} alignItems="center">
              <CalendarMonthIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {booking.checkIn?.slice(0, 10)} to {booking.checkOut?.slice(0, 10)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} mt={1} alignItems="center">
              <GroupIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {booking.guests} guests, {booking.roomType || 'Standard'} x {bookedRooms} room{bookedRooms > 1 ? 's' : ''}
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.25 }}>
              <Typography variant="body2" sx={{ color: '#0f5132', fontWeight: 800 }}>
                Total: {formatCurrency(totalAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pricePerNight ? `${formatCurrency(pricePerNight)} per night` : 'Price not set'} - {stayNights || 0} night{stayNights === 1 ? '' : 's'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={1.25}>
              {bookingAmenities.length === 0 ? (
                <Chip size="small" label="No amenities listed" />
              ) : (
                bookingAmenities.slice(0, 4).map((amenity) => (
                  <Chip key={amenity} size="small" label={amenity} />
                ))
              )}
            </Stack>
          </Box>
          <Stack spacing={1} alignItems={isGridMode ? 'flex-start' : { xs: 'flex-start', md: 'flex-end' }}>
            <Chip label={booking.status} color={statusColors[booking.status] || 'default'} />
            {(() => {
              const isReviewed = reviewedBookingIds.has(getId(booking._id));
              const canReview = booking.status === 'completed';
              return (
                <Button
                  variant={isReviewed ? 'outlined' : 'contained'}
                  disabled={!canReview || isReviewed}
                  onClick={() => {
                    if (!canReview) {
                      setSnackbar({
                        open: true,
                        message: 'Complete the stay to leave a review.',
                        severity: 'info',
                      });
                      return;
                    }
                    const hotel = booking.hotelId || hotels.find((h) => h._id === booking.hotelId);
                    if (hotel && hotel._id) {
                      handleOpenReview(hotel, booking._id);
                    } else {
                      setSnackbar({
                        open: true,
                        message: 'Hotel details not available yet. Please try again later.',
                        severity: 'warning',
                      });
                    }
                  }}
                >
                  {isReviewed ? 'Reviewed' : canReview ? 'Leave Review' : 'Awaiting Checkout'}
                </Button>
              );
            })()}
          </Stack>
        </Stack>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #f5fff9 0%, #edf9ff 52%, #f9f6ff 100%)',
          border: '1px solid #d7e9df',
          boxShadow: '0 16px 38px rgba(12, 87, 68, 0.12)',
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          mb={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} mb={0.75} sx={{ color: '#0b3b2e' }}>
              Hotels
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#3e6d5f', maxWidth: 620 }}>
              Discover verified stays, compare room availability, and connect with owners instantly.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${filteredHotels.length} listed`} sx={{ bgcolor: '#ffffff', border: '1px solid #dbe8e0', fontWeight: 700 }} />
            <Chip label={`${totalReviews} reviews`} sx={{ bgcolor: '#ffffff', border: '1px solid #dbe8e0', fontWeight: 700 }} />
            <Chip label={`${totalVacantRooms}/${totalBookableRooms} vacant rooms`} sx={{ bgcolor: '#ffffff', border: '1px solid #dbe8e0', fontWeight: 700 }} />
          </Stack>
        </Stack>

        <Box sx={{ maxWidth: 560 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by hotel, owner, address, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#638779' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#d7e6de' },
                '&:hover fieldset': { borderColor: '#bed7cb' },
                '&.Mui-focused fieldset': { borderColor: '#0ea67f' },
              },
            }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {filteredHotels.length === 0 ? (
          <Grid item xs={12}>
            <Card
              sx={{
                p: 4,
                borderRadius: 4,
                border: '1px solid #dce8e2',
                background: 'linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%)',
              }}
            >
              <Typography color="text.secondary">No hotels available right now.</Typography>
            </Card>
          </Grid>
        ) : (
          filteredHotels.map((hotel) => {
            const hotelName = hotel.name || hotel.ownerName || 'Hotel';
            const hotelEmail = hotel.email || hotel.ownerEmail || 'No hotel email';
            const hotelPhone = hotel.phone || hotel.ownerPhone || 'No hotel phone';
            const hotelAddress = hotel.address || 'Address not provided';
            const hotelCityState = hotel.cityState || '';
            const hotelType = hotel.hotelType || '';
            const hotelKey = getId(hotel?._id) || getId(hotel?.user) || hotelName;
            const imageCandidates = getHotelImageCandidates(hotel);
            const currentImageIndex = Math.min(
              hotelImageCursor[hotelKey] || 0,
              Math.max(imageCandidates.length - 1, 0)
            );
            const hotelImageSrc = imageCandidates[currentImageIndex] || FALLBACK_IMAGE;
            const reviews = getReviewsForHotel(hotel._id);
            const avgRating = getAverageRating(hotel._id);
            const ownerId = getHotelOwnerId(hotel);
            const rooms = ownerId ? roomsByHotel[ownerId] || [] : [];
            const availableList = ownerId ? getAvailableRoomsForHotel(ownerId) : [];
            const bookableRooms = (rooms || []).filter((room) => room.status !== 'Unavailable');
            const availableRoomUnits = availableList.reduce((sum, room) => sum + (Number(room.available) || 0), 0);
            const totalRoomUnits = bookableRooms.reduce((sum, room) => sum + (Number(room.total) || 0), 0);
            const pricedRooms = availableList.length ? availableList : bookableRooms;
            const roomPrices = pricedRooms
              .map((room) => Number(room.price) || 0)
              .filter((price) => price > 0);
            const startingPrice = roomPrices.length ? Math.min(...roomPrices) : 0;
            const canBook = availableRoomUnits > 0;
            const roomStatusLabel =
              rooms.length === 0
                ? 'No rooms listed'
                : totalRoomUnits <= 0
                ? 'No bookable rooms'
                : `${availableRoomUnits}/${totalRoomUnits} vacant`;
            const amenitySources = [
              hotel.amenities,
              hotel.hotelAmenities,
              hotel.ownerAmenities,
              hotel.userAmenities,
              hotel.user?.amenities,
              hotel.profile?.amenities,
            ];
            const amenitiesList = Array.from(
              new Set(amenitySources.flatMap((source) => normalizeAmenities(source)))
            ).filter(Boolean);
              return (
                <Grid item xs={12} sm={6} md={4} key={hotel._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: `${HOTEL_CARD_RADIUS}px`,
                    overflow: 'hidden',
                    border: '1px solid #dce8e2',
                    background: 'linear-gradient(180deg, #ffffff 0%, #fbfffd 100%)',
                    boxShadow: '0 12px 30px rgba(15, 70, 55, 0.12)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 20px 42px rgba(15, 70, 55, 0.2)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderTopLeftRadius: `${HOTEL_CARD_RADIUS}px`,
                      borderTopRightRadius: `${HOTEL_CARD_RADIUS}px`,
                      bgcolor: '#eef5f1',
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="190"
                      image={hotelImageSrc}
                      alt={hotelName}
                      onError={() => {
                        setHotelImageCursor((prev) => {
                          const current = prev[hotelKey] || 0;
                          if (current >= imageCandidates.length - 1) {
                            return prev;
                          }
                          return {
                            ...prev,
                            [hotelKey]: current + 1,
                          };
                        });
                      }}
                      sx={{
                        width: '100%',
                        display: 'block',
                        objectFit: 'cover',
                      }}
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        position: 'absolute',
                        top: 18,
                        left: 18,
                        zIndex: 1,
                        maxWidth: `calc(100% - 36px)`,
                      }}
                    >
                      <Chip
                        size="small"
                        label={reviews.length === 0 ? 'New listing' : `${reviews.length} reviews`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 700 }}
                      />
                    </Stack>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 2.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#103529' }}>
                        {hotelName}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Rating value={avgRating} precision={0.1} readOnly size="small" />
                        <Typography variant="body2" sx={{ color: '#4e7468', fontWeight: 600 }}>
                          {avgRating ? avgRating.toFixed(1) : 'New'}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
                      {hotelType && (
                        <Chip size="small" icon={<HotelIcon />} label={hotelType} sx={{ fontWeight: 700 }} />
                      )}
                      {hotelCityState && (
                        <Chip size="small" label={hotelCityState} sx={{ fontWeight: 700 }} />
                      )}
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {hotelAddress}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Owner: {hotel.ownerName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {hotel.ownerEmail || 'No owner email'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {hotel.ownerPhone || 'No owner phone'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {hotelEmail}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {hotelPhone}
                      </Typography>
                    </Stack>

                    <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
                      {amenitiesList.length === 0 ? (
                        <Chip size="small" label="No amenities listed" />
                      ) : (
                        amenitiesList.map((amenity) => (
                          <Chip key={amenity} size="small" label={amenity} />
                        ))
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <Chip
                        size="small"
                        label={reviews.length === 0 ? "No reviews yet" : `${reviews.length} reviews`}
                        sx={{
                          bgcolor: "#e2e8f0",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        size="small"
                        label={roomStatusLabel}
                        sx={{
                          bgcolor: canBook ? "#dcfce7" : "#f1f5f9",
                          color: canBook ? "#166534" : "#334155",
                          border: canBook ? "1px solid #86efac" : "1px solid #cbd5e1",
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        size="small"
                        label={startingPrice ? `From ${formatCurrency(startingPrice)} per night` : 'Price not set'}
                        sx={{
                          bgcolor: "#fff7ed",
                          color: "#9a3412",
                          border: "1px solid #fed7aa",
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                      <Tooltip title={canBook ? "" : "No rooms available"} placement="top" arrow>
                        <span>
                          <Button
                            variant="contained"
                            startIcon={<HotelIcon />}
                            onClick={() => handleOpenBooking(hotel)}
                            disabled={!canBook}
                            sx={{
                              borderRadius: 2.5,
                              px: 2,
                              background: 'linear-gradient(120deg, #0ca678 0%, #17b99a 100%)',
                              textTransform: 'none',
                              fontWeight: 700,
                              boxShadow: '0 8px 18px rgba(16, 185, 129, 0.25)',
                              '&:hover': {
                                background: 'linear-gradient(120deg, #09906a 0%, #109b81 100%)',
                              },
                            }}
                          >
                            Book Now
                          </Button>
                        </span>
                      </Tooltip>
                      <Button
                        variant="outlined"
                        onClick={() => handleOpenReview(hotel)}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        View Reviews
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ChatBubbleOutlineIcon />}
                        onClick={() => handleOpenChat(hotel)}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        Chat
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      <Box sx={{ mt: 5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={2}
        >
          <Typography variant="h5" fontWeight={800} sx={{ color: '#123d30' }}>
            My Hotel Bookings
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<GridViewIcon fontSize="small" />}
              variant={bookingsViewMode === 'grid' ? 'contained' : 'outlined'}
              onClick={() => setBookingsViewMode('grid')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Grid
            </Button>
            <Button
              size="small"
              startIcon={<ViewListIcon fontSize="small" />}
              variant={bookingsViewMode === 'list' ? 'contained' : 'outlined'}
              onClick={() => setBookingsViewMode('list')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              List
            </Button>
          </Stack>
        </Stack>
        {bookingsLoading ? (
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #dce8e2', bgcolor: '#ffffff' }}>
            <Typography color="text.secondary">Loading bookings...</Typography>
          </Card>
        ) : bookings.length === 0 ? (
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #dce8e2', bgcolor: '#ffffff' }}>
            <Typography color="text.secondary">No hotel bookings yet.</Typography>
          </Card>
        ) : bookingsViewMode === 'grid' ? (
          <Grid container spacing={2}>
            {bookings.map((booking) => (
              <Grid item xs={12} md={6} lg={4} key={booking._id}>
                {renderBookingCard(booking, true)}
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack spacing={2}>
            {bookings.map((booking) => renderBookingCard(booking, false))}
          </Stack>
        )}
      </Box>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book Hotel</DialogTitle>
        <DialogContent>
          <Typography fontWeight={600} mb={2}>
            {selectedHotel?.name}
          </Typography>
          <Box sx={{ mb: 2, p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
              {selectedHotel?.hotelType && <Chip size="small" label={selectedHotel.hotelType} />}
              {selectedHotel?.cityState && <Chip size="small" label={selectedHotel.cityState} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {selectedHotel?.address || 'Address not provided'}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={1.25}>
              {normalizeAmenities(selectedHotel?.amenities).length === 0 ? (
                <Chip size="small" label="No amenities listed" />
              ) : (
                normalizeAmenities(selectedHotel?.amenities).slice(0, 5).map((amenity) => (
                  <Chip key={amenity} size="small" label={amenity} />
                ))
              )}
            </Stack>
          </Box>
          <Stack spacing={2}>
            <TextField
              label="Check-in Date"
              type="date"
              value={bookingForm.checkIn}
              onChange={(e) => {
                const nextCheckIn = e.target.value;
                setBookingForm((prev) => {
                  const shouldClear = prev.checkOut && prev.checkOut < nextCheckIn;
                  return {
                    ...prev,
                    checkIn: nextCheckIn,
                    checkOut: shouldClear ? '' : prev.checkOut,
                  };
                });
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: today }}
            />
            <TextField
              label="Check-out Date"
              type="date"
              value={bookingForm.checkOut}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, checkOut: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: bookingForm.checkIn || today }}
            />
            <TextField
              label="Guests"
              type="number"
              value={bookingForm.guests}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, guests: Math.max(1, Number(e.target.value)) }))}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Rooms"
              type="number"
              value={bookingForm.roomCount}
              onChange={(e) => {
                const nextCount = normalizePositiveInt(e.target.value, 1);
                const maxAllowed = selectedRoomAvailable > 0 ? selectedRoomAvailable : undefined;
                setBookingForm((prev) => ({
                  ...prev,
                  roomCount: maxAllowed ? Math.min(nextCount, maxAllowed) : nextCount,
                }));
              }}
              inputProps={{ min: 1, max: selectedRoomAvailable > 0 ? selectedRoomAvailable : undefined }}
              helperText={
                selectedRoom
                  ? `${selectedRoomAvailable}/${selectedRoomTotal || selectedRoomAvailable} vacant in ${selectedRoom.type || 'selected type'}`
                  : 'Select a room type to see vacancy'
              }
            />
            <TextField
              label="Room Type"
              select
              value={bookingForm.roomType}
              onChange={(e) => {
                const nextType = e.target.value;
                setBookingForm((prev) => ({ ...prev, roomType: nextType }));
                const matchingRoom = selectableRooms.find((room) => room.type === nextType);
                if (matchingRoom?._id) {
                  setSelectedRoomId(matchingRoom._id);
                }
              }}
            >
              {roomTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            {dateConflict && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {dateConflict.message}
              </Alert>
            )}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Available Rooms
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Tap a room to select it for booking.
              </Typography>
              {roomsLoading ? (
                <Typography color="text.secondary">Loading rooms...</Typography>
              ) : hotelRooms.length === 0 ? (
                <Typography color="text.secondary">No rooms listed yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {(availableRooms.length ? availableRooms : hotelRooms).map((room) => {
                    const availableCount = Number(room.available) || 0;
                    const totalCount = Number(room.total) || 0;
                    const isUnavailable = room.status === 'Unavailable';
                    const isFull = totalCount > 0 && availableCount <= 0;
                    const statusLabel = isUnavailable ? 'Unavailable' : isFull ? 'Full' : 'Available';
                    const isSelected = selectedRoomId === room._id;
                    return (
                      <Box
                        key={room._id}
                        onClick={() => {
                          setSelectedRoomId(room._id);
                          if (room.type) {
                            setBookingForm((prev) => ({ ...prev, roomType: room.type }));
                          }
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: isSelected ? '1px solid #0f766e' : '1px solid #e2e8f0',
                          bgcolor: isSelected ? 'rgba(20,184,166,0.08)' : '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 10px 20px rgba(15,118,110,0.15)' : 'none',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{room.type}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {statusLabel} - {availableCount}/{totalCount || availableCount} available
                          </Typography>
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Typography fontWeight={700}>{formatCurrency(room.price)}</Typography>
                          {isSelected && (
                            <Chip size="small" label="Selected" color="success" />
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid #cde7dc',
                bgcolor: '#f7fffb',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Room price
                  </Typography>
                  <Typography fontWeight={800}>
                    {selectedRoomPrice ? `${formatCurrency(selectedRoomPrice)} per night` : 'Select a priced room'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Stay
                  </Typography>
                  <Typography fontWeight={800}>
                    {bookingNights ? `${bookingNights} night${bookingNights === 1 ? '' : 's'}` : 'Select valid dates'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Rooms
                  </Typography>
                  <Typography fontWeight={800}>{bookingRooms}</Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total estimate
                  </Typography>
                  <Typography variant="h6" fontWeight={900} sx={{ color: '#0f5132' }}>
                    {bookingEstimate ? formatCurrency(bookingEstimate) : formatCurrency(0)}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Total is calculated from the hotel manager room price, number of nights, and selected rooms.
              </Typography>
            </Box>
            <TextField
              label="Special Requests"
              multiline
              minRows={3}
              value={bookingForm.notes}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setBookingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={
              roomsLoading ||
              checkingAvailability ||
              Boolean(dateConflict) ||
              hotelRooms.length === 0 ||
              availableRooms.length === 0 ||
              bookingNights <= 0
            }
          >
            {checkingAvailability ? 'Checking Dates...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hotel Reviews</DialogTitle>
        <DialogContent>
          <Typography fontWeight={700} mb={1}>
            {selectedHotel?.name}
          </Typography>
          <Box sx={{ mb: 2 }}>
            {(selectedHotel ? getReviewsForHotel(selectedHotel._id) : []).length === 0 ? (
              <Typography color="text.secondary">No reviews yet.</Typography>
            ) : (
              (selectedHotel ? getReviewsForHotel(selectedHotel._id) : []).map((review) => (
                <Box key={review._id || review.id} sx={{ p: 2, borderRadius: 2, bgcolor: '#f7fafc', mb: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28 }} src={review.touristId?.avatar || ''}>
                      {(review.touristId?.name || 'G')[0]}
                    </Avatar>
                    <Typography fontWeight={600}>{review.touristId?.name || 'Guest'}</Typography>
                  </Stack>
                  <Rating value={review.rating} readOnly size="small" sx={{ mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {review.comment}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography fontWeight={700} mb={1}>
            Leave a Review
          </Typography>
          {!selectedHotel?.bookingId && (
            <Typography color="text.secondary" mb={2}>
              You can leave a review after completing a booking for this hotel.
            </Typography>
          )}
          <Rating
            value={reviewForm.rating}
            onChange={(_, value) => setReviewForm((prev) => ({ ...prev, rating: value || 0 }))}
            sx={{ mb: 2 }}
            disabled={!selectedHotel?.bookingId}
          />
          <TextField
            label="Your Review"
            fullWidth
            multiline
            minRows={3}
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            disabled={!selectedHotel?.bookingId}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setReviewDialogOpen(false)}>
            Close
          </Button>
          <Button variant="contained" onClick={handleSubmitReview} disabled={!selectedHotel?.bookingId}>
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
