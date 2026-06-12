import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ItineraryRouteMap from './ItineraryRouteMap';
import {
  deleteSavedItinerary,
  downloadItineraryPdf,
  generateItinerary,
  getItineraryPreferences,
  getItinerarySocialContent,
  getSavedItineraryById,
  listSavedItineraries,
  saveGeneratedItinerary,
  updateSavedItinerary,
} from '../../services/itineraryService';
import './ItineraryPlannerModule.css';

const plannerSteps = [
  { id: 'destination', title: 'Destination' },
  { id: 'dates', title: 'Dates' },
  { id: 'interests', title: 'Interests' },
  { id: 'style', title: 'Budget & Style' },
  { id: 'travelers', title: 'Travelers & Preferences' },
];

const loadingFlowSteps = [
  'Finding top attractions for your dates',
  'Optimizing day-by-day routes',
  'Estimating realistic budget ranges',
  'Preparing weather snapshots',
  'Compiling your final itinerary',
];

const interestOptions = [
  'Adventure',
  'Nature',
  'Beaches',
  'Food',
  'Historical',
  'Shopping',
  'Nightlife',
  'Relaxation',
  'Trekking',
  'Photography',
];

const budgetOptions = [
  { id: 'low', label: 'Budget', detail: 'Value-focused stays and local experiences' },
  { id: 'mid', label: 'Mid-range', detail: 'Comfortable travel with balanced spending' },
  { id: 'high', label: 'Luxury', detail: 'Premium stays and curated experiences' },
];

const travelStyles = [
  { id: 'relaxed', label: 'Relaxed', detail: 'Fewer transfers, slower pace' },
  { id: 'balanced', label: 'Balanced', detail: 'Good mix of activity and free time' },
  { id: 'packed', label: 'Packed', detail: 'Maximum experiences every day' },
];

const hotelTypes = ['Boutique', 'Resort', 'Business', 'Homestay', 'Eco Stay'];
const foodTypes = ['Veg-friendly', 'Street Food', 'Fine Dining', 'Local Cuisine', 'Mixed'];
const accessibilityOptions = ['Standard', 'Wheelchair Friendly', 'Low Mobility', 'Senior Friendly'];
const transportOptions = ['walk', 'bike', 'car', 'train', 'metro', 'taxi'];

const budgetCaps = {
  low: 60000,
  mid: 130000,
  high: 260000,
};

const budgetNightlyRates = {
  low: 2600,
  mid: 5200,
  high: 9800,
};

const budgetDailyPerTraveler = {
  low: 3200,
  mid: 6200,
  high: 11500,
};

const transportPerKmRates = {
  walk: 0,
  bike: 8,
  car: 24,
  train: 16,
  metro: 12,
  taxi: 28,
};

const tripStyleToPace = {
  relaxed: 'relaxed',
  balanced: 'balanced',
  packed: 'fast',
};

const paceToTripStyle = {
  relaxed: 'relaxed',
  balanced: 'balanced',
  fast: 'packed',
};

const trendingDestinations = ['Goa', 'Bali', 'Kyoto', 'Swiss Alps', 'Dubai', 'Singapore', 'Istanbul'];

const weatherCodeLabel = (code) => {
  const numericCode = Number(code);
  if (numericCode === 0) return 'Clear';
  if ([1, 2, 3].includes(numericCode)) return 'Partly Cloudy';
  if ([45, 48].includes(numericCode)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(numericCode)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(numericCode)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(numericCode)) return 'Snow';
  if ([95, 96, 99].includes(numericCode)) return 'Storm';
  return 'Mild';
};

const safeCurrency = (code) => {
  const value = String(code || '').toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : 'INR';
};

const formatMoney = (value, currencyCode = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: safeCurrency(currencyCode),
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `INR ${Math.round(Number(value || 0))}`;
  }
};

const normalizeDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (startDate, endDate) => {
  if (!startDate && !endDate) return 'Dates not selected';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const startLabel = start && !Number.isNaN(start.getTime()) ? start.toLocaleDateString('en-IN', options) : '-';
  const endLabel = end && !Number.isNaN(end.getTime()) ? end.toLocaleDateString('en-IN', options) : '-';
  return `${startLabel} - ${endLabel}`;
};

const formatPublishedLabel = (value) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calcTripDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
};

const normalizeLatLng = (location) => {
  if (!location || typeof location !== 'object') return { lat: null, lon: null };
  const latCandidate = Number(location.lat ?? (Array.isArray(location.coordinates) ? location.coordinates[1] : null));
  const lonCandidate = Number(location.lng ?? location.lon ?? (Array.isArray(location.coordinates) ? location.coordinates[0] : null));
  return {
    lat: Number.isFinite(latCandidate) ? latCandidate : null,
    lon: Number.isFinite(lonCandidate) ? lonCandidate : null,
  };
};

const toTimeMinutes = (timeText) => {
  const match = String(timeText || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const diffDuration = (start, end) => {
  const startMinutes = toTimeMinutes(start);
  const endMinutes = toTimeMinutes(end);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return '';
  const minutes = endMinutes - startMinutes;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (!hrs) return `${rem}m`;
  return `${hrs}h ${rem}m`;
};

const getTimeSegment = (timeValue) => {
  const minutes = toTimeMinutes(timeValue);
  if (minutes == null) return 'Daytime';
  if (minutes < 720) return 'Morning';
  if (minutes < 1020) return 'Afternoon';
  if (minutes < 1260) return 'Evening';
  return 'Night';
};

const inferStopCost = (stop) => {
  const explicit = Number(stop?.estimatedCost);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const category = String(stop?.category || '').toLowerCase();
  if (category.includes('food')) return 1200;
  if (category.includes('shopping')) return 2500;
  if (category.includes('nature')) return 800;
  if (category.includes('culture')) return 1000;
  return 1500;
};

const fallbackChecklist = (destination) => {
  const safeDestination = destination || 'destination';
  return [
    { label: `Passport and travel documents for ${safeDestination}`, done: false },
    { label: 'Accommodation confirmations and tickets', done: false },
    { label: 'Local transport wallet and backup payment method', done: false },
    { label: 'Offline map and emergency contacts', done: false },
    { label: 'Weather-ready packing essentials', done: false },
  ];
};

const weatherTipsFromCondition = (weatherCondition = 'Mild') => {
  const normalized = String(weatherCondition || '').toLowerCase();
  if (normalized.includes('rain')) {
    return ['Carry a light rain jacket', 'Keep indoor options for afternoons', 'Use waterproof day bags'];
  }
  if (normalized.includes('storm')) {
    return ['Keep transfer buffer time', 'Monitor local advisories', 'Prefer covered transport'];
  }
  if (normalized.includes('clear') || normalized.includes('sun')) {
    return ['Pack sunscreen and sunglasses', 'Start outdoor plans early', 'Stay hydrated during transfers'];
  }
  if (normalized.includes('cloud')) {
    return ['Carry a light evening layer', 'Great weather for city walks', 'Keep flexible sunset plans'];
  }
  return ['Carry versatile layers', 'Use comfortable walking shoes', 'Review daily weather before heading out'];
};

const buildPayloadFromForm = (form) => {
  const adults = Number(form.travelers.adults || 0);
  const children = Number(form.travelers.children || 0);
  const travelersCount = Math.max(1, adults + children);
  const detailBlocks = [
    form.specialRequirements,
    `Hotel type: ${form.hotelType}`,
    `Food preference: ${form.foodPreference}`,
    `Accessibility: ${form.accessibility}`,
    `Rooms: ${form.travelers.rooms}`,
  ].filter(Boolean);

  const dailyWindow =
    form.tripStyle === 'packed'
      ? { start: '08:00', end: '22:00' }
      : form.tripStyle === 'relaxed'
      ? { start: '09:30', end: '20:00' }
      : { start: '09:00', end: '21:00' };

  return {
    destination: String(form.destination || '').trim(),
    startDate: normalizeDate(form.startDate),
    endDate: normalizeDate(form.endDate),
    days: calcTripDays(form.startDate, form.endDate),
    interests: Array.isArray(form.interests) ? form.interests.map((item) => item.toLowerCase()) : [],
    budget: form.budget,
    pace: tripStyleToPace[form.tripStyle] || 'balanced',
    transportMode: form.transportPreference,
    dailyStartTime: dailyWindow.start,
    dailyEndTime: dailyWindow.end,
    travelers: travelersCount,
    specialRequirements: detailBlocks.join(' | '),
    currency: String(form.currency || 'INR').trim().toUpperCase(),
  };
};

const buildPlanState = ({
  id = '',
  title = '',
  itinerary = {},
  tripRequest = {},
  notes = '',
  checklist = [],
  saved = false,
  createdAt = '',
  updatedAt = '',
}) => {
  const destination = String(itinerary?.destination || tripRequest?.destination || 'Untitled destination').trim();
  const days = Array.isArray(itinerary?.days) ? itinerary.days : [];

  const normalizedDays = days.map((day, dayIndex) => {
    const dayNumber = Number(day?.day || dayIndex + 1);
    const stops = Array.isArray(day?.stops) ? day.stops : [];

    let distanceKm = 0;
    let travelMinutes = 0;
    let dayBudget = 0;

    const normalizedStops = stops.map((stop, stopIndex) => {
      const stopId = String(stop?._id || stop?.id || `day-${dayNumber}-stop-${stopIndex + 1}`);
      const location = normalizeLatLng(stop?.location);
      const travel = stop?.travelFromPrevious || null;
      const travelDistance = Number(travel?.distanceKm || 0);
      const travelTime = Number(travel?.estimatedMinutes || 0);
      const estimatedSpend = inferStopCost(stop);

      if (Number.isFinite(travelDistance) && travelDistance > 0) distanceKm += travelDistance;
      if (Number.isFinite(travelTime) && travelTime > 0) travelMinutes += travelTime;
      dayBudget += estimatedSpend;

      return {
        id: stopId,
        name: String(stop?.name || `Stop ${stopIndex + 1}`),
        category: String(stop?.category || 'sightseeing'),
        address: String(stop?.address || ''),
        description: String(stop?.description || ''),
        start: String(stop?.arrivalTime || stop?.startTime || ''),
        end: String(stop?.departureTime || stop?.endTime || ''),
        duration: stop?.durationMinutes
          ? `${Number(stop.durationMinutes)}m`
          : diffDuration(stop?.arrivalTime, stop?.departureTime),
        openingHours: String(stop?.openingHours || ''),
        estimatedSpend,
        rating: Number(stop?.rating || 0),
        image: String(stop?.image || ''),
        bestFor: Array.isArray(stop?.bestFor) ? stop.bestFor : [],
        crowdTip: String(stop?.crowdTip || ''),
        lat: location.lat,
        lon: location.lon,
        segment: getTimeSegment(stop?.arrivalTime),
        transportFromPrev: travel
          ? {
              mode: String(travel.mode || tripRequest?.transportMode || 'car'),
              time: Number.isFinite(Number(travel.estimatedMinutes))
                ? `${Math.round(Number(travel.estimatedMinutes))}m`
                : '',
              distanceKm: Number.isFinite(Number(travel.distanceKm)) ? Number(travel.distanceKm) : 0,
              estimatedMinutes: Number.isFinite(Number(travel.estimatedMinutes))
                ? Number(travel.estimatedMinutes)
                : 0,
            }
          : null,
      };
    });

    const summaryDistance = Number(day?.summary?.distanceKm ?? distanceKm ?? 0);
    const summaryMinutes = Number(day?.summary?.movingTimeMinutes ?? travelMinutes ?? 0);
    const pace = normalizedStops.length >= 5 ? 'Packed' : normalizedStops.length <= 2 ? 'Relaxed' : 'Balanced';

    return {
      id: `day-${dayNumber}`,
      dayNumber,
      label: `Day ${dayNumber}`,
      date: (() => {
        const start = tripRequest?.startDate ? new Date(tripRequest.startDate) : null;
        if (!start || Number.isNaN(start.getTime())) return '';
        const next = new Date(start);
        next.setDate(start.getDate() + dayIndex);
        return next.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
      })(),
      title: String(day?.title || `Day ${dayNumber}`),
      summary: {
        distanceKm: Number.isFinite(summaryDistance) ? Number(summaryDistance.toFixed(1)) : 0,
        movingTime: summaryMinutes > 0 ? `${Math.floor(summaryMinutes / 60)}h ${summaryMinutes % 60}m` : '0h 0m',
        pace,
        estimatedSpend: dayBudget,
      },
      stops: normalizedStops,
    };
  });

  return {
    id,
    saved,
    title: title || `${destination} Itinerary`,
    destination,
    dateLabel: formatDateLabel(tripRequest?.startDate, tripRequest?.endDate),
    tripRequest,
    itineraryRaw: itinerary,
    notes: String(notes || ''),
    checklist: Array.isArray(checklist) && checklist.length ? checklist : fallbackChecklist(destination),
    days: normalizedDays,
    createdAt,
    updatedAt,
    summary: String(itinerary?.summary || '').trim(),
  };
};

export default function ItineraryPlannerModule() {
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    interests: ['Beaches', 'Food'],
    budget: 'mid',
    tripStyle: 'balanced',
    travelers: { adults: 2, children: 0, rooms: 1 },
    transportPreference: 'car',
    hotelType: 'Boutique',
    foodPreference: 'Mixed',
    accessibility: 'Standard',
    specialRequirements: '',
    currency: 'INR',
  });

  const [profileInfo, setProfileInfo] = useState({ name: '', country: '', interests: [] });
  const [recentDestinations, setRecentDestinations] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedStop, setSelectedStop] = useState(null);
  const [insightTab, setInsightTab] = useState('details');
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [socialContent, setSocialContent] = useState(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [notification, setNotification] = useState({ message: '', severity: 'success' });
  const socialCacheRef = useRef(new Map());

  const selectedDay = useMemo(() => {
    if (!currentPlan?.days?.length) return null;
    return currentPlan.days.find((day) => day.id === selectedDayId) || currentPlan.days[0];
  }, [currentPlan, selectedDayId]);

  const allStops = useMemo(() => {
    if (!currentPlan?.days?.length) return [];
    return currentPlan.days.flatMap((day) => (Array.isArray(day.stops) ? day.stops : []));
  }, [currentPlan]);

  const selectedDayTimeline = useMemo(() => {
    if (!Array.isArray(selectedDay?.stops) || !selectedDay.stops.length) return [];
    return [...selectedDay.stops].sort((a, b) => {
      const aStart = toTimeMinutes(a?.start);
      const bStart = toTimeMinutes(b?.start);
      if (aStart == null && bStart == null) return 0;
      if (aStart == null) return 1;
      if (bStart == null) return -1;
      return aStart - bStart;
    });
  }, [selectedDay?.stops]);

  const activeDayStop = useMemo(() => {
    if (!selectedDayTimeline.length) return null;
    if (!selectedStop?.id) return selectedDayTimeline[0];
    return selectedDayTimeline.find((stop) => stop.id === selectedStop.id) || selectedDayTimeline[0];
  }, [selectedDayTimeline, selectedStop?.id]);

  useEffect(() => {
    setInsightTab('details');
  }, [selectedDay?.id]);

  useEffect(() => {
    if (!videoPreview) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setVideoPreview(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [videoPreview]);

  const tripDays = calcTripDays(form.startDate, form.endDate);
  const budgetLevel = currentPlan?.tripRequest?.budget || form.budget;
  const tripTravelers = Math.max(
    1,
    Number(currentPlan?.tripRequest?.travelers || (Number(form.travelers.adults || 0) + Number(form.travelers.children || 0) || 1))
  );
  const tripDayCount = Math.max(1, Number(currentPlan?.days?.length || tripDays || 1));
  const tripNights = Math.max(0, tripDayCount - 1);
  const tripRooms = Math.max(1, Math.ceil(tripTravelers / 2));
  const transportRatePerKm = transportPerKmRates[currentPlan?.tripRequest?.transportMode || form.transportPreference] ?? 24;

  const budgetRows = useMemo(() => {
    let food = 0;
    let activities = 0;
    let transport = 0;

    allStops.forEach((stop) => {
      const spend = Number(stop.estimatedSpend || 0);
      const category = String(stop?.category || '').toLowerCase();
      if (category.includes('food')) {
        food += spend;
      } else {
        activities += spend;
      }

      const distanceKm = Number(stop?.transportFromPrev?.distanceKm || 0);
      if (distanceKm > 0) {
        transport += distanceKm * transportRatePerKm;
      }
    });

    const nightlyRate = budgetNightlyRates[budgetLevel] || budgetNightlyRates.mid;
    const hotels = tripNights * tripRooms * nightlyRate;

    return [
      { name: 'Hotels', value: Math.max(0, Math.round(hotels)), colorClass: 'budgetHotels' },
      { name: 'Food', value: Math.max(0, Math.round(food)), colorClass: 'budgetFood' },
      { name: 'Transport', value: Math.max(0, Math.round(transport)), colorClass: 'budgetTransport' },
      { name: 'Activities', value: Math.max(0, Math.round(activities)), colorClass: 'budgetActivities' },
    ];
  }, [allStops, budgetLevel, transportRatePerKm, tripNights, tripRooms]);

  const totalEstimated = useMemo(
    () => budgetRows.reduce((sum, row) => sum + Number(row.value || 0), 0),
    [budgetRows]
  );

  const budgetTarget = useMemo(() => {
    const perTraveler = budgetDailyPerTraveler[budgetLevel] || budgetDailyPerTraveler.mid;
    const dynamicTarget = Math.round(perTraveler * tripTravelers * tripDayCount);
    return Math.max(dynamicTarget, budgetCaps[budgetLevel] || budgetCaps.mid);
  }, [budgetLevel, tripDayCount, tripTravelers]);

  const budgetPercent = budgetTarget > 0 ? Math.min(100, Math.round((totalEstimated / budgetTarget) * 100)) : 0;

  const completedChecklist = currentPlan?.checklist?.filter((item) => item.done).length || 0;
  const checklistTotal = currentPlan?.checklist?.length || 0;

  const weatherTips = useMemo(() => weatherTipsFromCondition(weather?.condition), [weather?.condition]);
  const weatherPreviewDays = useMemo(
    () => (Array.isArray(weather?.daily) ? weather.daily.slice(0, 3) : []),
    [weather?.daily]
  );

  const socialVideos = useMemo(
    () => (Array.isArray(socialContent?.videos) ? socialContent.videos : []),
    [socialContent?.videos]
  );

  const socialShorts = useMemo(
    () => (Array.isArray(socialContent?.shorts) ? socialContent.shorts : []),
    [socialContent?.shorts]
  );

  const socialQuickLinks = useMemo(
    () => (Array.isArray(socialContent?.quickLinks) ? socialContent.quickLinks : []),
    [socialContent?.quickLinks]
  );

  const buildYouTubeEmbedUrl = (rawUrl, fallbackId = '') => {
    const safeRawUrl = String(rawUrl || '').trim();
    const safeId = String(fallbackId || '').trim();
    const base = safeRawUrl || (safeId ? `https://www.youtube.com/embed/${safeId}` : '');
    if (!base) return '';

    try {
      const parsed = new URL(base);
      parsed.searchParams.set('autoplay', '1');
      parsed.searchParams.set('rel', '0');
      parsed.searchParams.set('modestbranding', '1');
      parsed.searchParams.set('playsinline', '1');
      return parsed.toString();
    } catch {
      return base;
    }
  };

  const openVideoPreview = (video) => {
    const embedUrl = buildYouTubeEmbedUrl(video?.embedUrl, video?.id);
    if (!embedUrl) {
      if (video?.watchUrl) {
        window.open(video.watchUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setVideoPreview({
      id: String(video?.id || ''),
      title: String(video?.title || 'YouTube video'),
      channelTitle: String(video?.channelTitle || ''),
      embedUrl,
      watchUrl: String(video?.watchUrl || ''),
    });
  };

  const notify = (message, severity = 'success') => {
    setNotification({ message, severity });
  };

  const refreshSavedItems = async (autoSelectId = '') => {
    const response = await listSavedItineraries();
    const items = Array.isArray(response?.items) ? response.items : [];
    setSavedItems(items);

    if (autoSelectId) {
      setSelectedSavedId(autoSelectId);
      return autoSelectId;
    }

    if (!items.length) {
      setSelectedSavedId('');
      return '';
    }

    if (selectedSavedId && items.some((item) => item._id === selectedSavedId)) {
      return selectedSavedId;
    }

    setSelectedSavedId(items[0]._id);
    return items[0]._id;
  };

  const hydrateFormFromTripRequest = (tripRequest = {}) => {
    const pace = String(tripRequest.pace || 'balanced').toLowerCase();
    const travelers = Math.max(1, Number(tripRequest.travelers || 1));

    setForm((prev) => ({
      ...prev,
      destination: tripRequest.destination || prev.destination,
      startDate: normalizeDate(tripRequest.startDate) || prev.startDate,
      endDate: normalizeDate(tripRequest.endDate) || prev.endDate,
      interests: Array.isArray(tripRequest.interests) && tripRequest.interests.length
        ? tripRequest.interests.map((item) => String(item).replace(/^\w/, (char) => char.toUpperCase()))
        : prev.interests,
      budget: tripRequest.budget || prev.budget,
      tripStyle: paceToTripStyle[pace] || pace || prev.tripStyle,
      transportPreference: tripRequest.transportMode || prev.transportPreference,
      travelers: {
        adults: travelers,
        children: 0,
        rooms: Math.max(1, Math.ceil(travelers / 2)),
      },
      currency: tripRequest.currency || prev.currency,
    }));
  };

  const loadSavedDetail = async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const response = await getSavedItineraryById(id);
      const record = response?.itinerary;
      if (!record) return;

      const nextPlan = buildPlanState({
        id: record._id,
        title: record.title,
        itinerary: record.itinerary || {},
        tripRequest: record.tripRequest || {},
        notes: record.notes,
        checklist: record.checklist,
        saved: true,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });

      setCurrentPlan(nextPlan);
      setVideoPreview(null);
      setSelectedSavedId(id);
      setSelectedDayId(nextPlan.days[0]?.id || '');
      setSelectedStop(nextPlan.days[0]?.stops?.[0] || null);
      hydrateFormFromTripRequest(nextPlan.tripRequest || {});
      notify('Saved itinerary loaded.');
    } catch (error) {
      notify(error?.response?.data?.message || 'Unable to load itinerary details.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInit(true);
      try {
        const pref = await getItineraryPreferences();
        const interests = Array.isArray(pref?.profile?.interests) ? pref.profile.interests : [];
        const recent = Array.isArray(pref?.suggestions?.recentDestinations)
          ? pref.suggestions.recentDestinations
          : [];

        setProfileInfo({
          name: pref?.profile?.name || '',
          country: pref?.profile?.country || '',
          interests,
        });
        setRecentDestinations(recent);

        setForm((prev) => ({
          ...prev,
          destination: prev.destination || recent[0] || '',
          interests: prev.interests.length
            ? prev.interests
            : interests.slice(0, 3).map((item) => String(item).replace(/^\w/, (char) => char.toUpperCase())),
        }));

        await refreshSavedItems();
      } catch (error) {
        notify(error?.response?.data?.message || 'Unable to initialize itinerary planner.', 'error');
      } finally {
        setLoadingInit(false);
      }
    };

    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loadingGenerate) {
      setLoadingPhase(0);
      setLoadingProgress(8);
      return;
    }

    const phaseTimer = setInterval(() => {
      setLoadingPhase((prev) => (prev < loadingFlowSteps.length - 1 ? prev + 1 : prev));
    }, 1700);

    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => Math.min(95, prev + 3));
    }, 230);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(progressTimer);
    };
  }, [loadingGenerate]);

  useEffect(() => {
    const leadStop = selectedDay?.stops?.find(
      (stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lon))
    );
    if (!leadStop?.lat || !leadStop?.lon) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const forecastDays = Math.max(1, Math.min(3, currentPlan?.days?.length || 3));
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${leadStop.lat}&longitude=${leadStop.lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=${forecastDays}`;
        const response = await fetch(url);
        const data = await response.json();

        const dailyList = Array.from({ length: forecastDays }).map((_, index) => ({
          date: data?.daily?.time?.[index] || '',
          max: Math.round(Number(data?.daily?.temperature_2m_max?.[index] || 0)),
          min: Math.round(Number(data?.daily?.temperature_2m_min?.[index] || 0)),
          rainChance: Math.round(Number(data?.daily?.precipitation_probability_max?.[index] || 0)),
          condition: weatherCodeLabel(data?.daily?.weather_code?.[index]),
        }));

        setWeather({
          temp: Math.round(Number(data?.current?.temperature_2m || 0)),
          humidity: Math.round(Number(data?.current?.relative_humidity_2m || 0)),
          condition: weatherCodeLabel(data?.current?.weather_code),
          rainChance: dailyList[0]?.rainChance || 0,
          daily: dailyList,
        });
      } catch {
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [selectedDay?.id, selectedDay?.stops, currentPlan?.days?.length]);

  useEffect(() => {
    const destination = String(currentPlan?.destination || '').trim();
    const stopName = String(activeDayStop?.name || '').trim();

    if (!destination && !stopName) {
      setSocialContent(null);
      setSocialError('');
      setSocialLoading(false);
      return;
    }

    const cacheKey = `${destination.toLowerCase()}|${stopName.toLowerCase()}`;
    const cached = socialCacheRef.current.get(cacheKey);
    if (cached) {
      setSocialContent(cached);
      setSocialError('');
      setSocialLoading(false);
      return;
    }

    let cancelled = false;
    const fetchTimer = setTimeout(async () => {
      setSocialLoading(true);
      setSocialError('');
      try {
        const response = await getItinerarySocialContent({
          destination,
          stopName,
          limit: 6,
        });

        if (cancelled) return;

        setSocialContent(response || null);
        socialCacheRef.current.set(cacheKey, response || null);
        if (socialCacheRef.current.size > 80) {
          const oldestKey = socialCacheRef.current.keys().next().value;
          socialCacheRef.current.delete(oldestKey);
        }
      } catch (error) {
        if (cancelled) return;
        setSocialError(error?.response?.data?.message || 'Unable to load social content right now.');
        setSocialContent(null);
      } finally {
        if (!cancelled) {
          setSocialLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(fetchTimer);
    };
  }, [currentPlan?.destination, activeDayStop?.name]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const adjustTraveler = (key, delta) => {
    setForm((prev) => {
      const current = Number(prev.travelers[key] || 0);
      const nextValue = key === 'rooms' ? Math.max(1, current + delta) : Math.max(0, current + delta);
      return {
        ...prev,
        travelers: {
          ...prev.travelers,
          [key]: nextValue,
        },
      };
    });
  };

  const toggleInterest = (interest) => {
    setForm((prev) => {
      const has = prev.interests.includes(interest);
      if (has) {
        return {
          ...prev,
          interests: prev.interests.filter((item) => item !== interest),
        };
      }
      return {
        ...prev,
        interests: [...prev.interests, interest],
      };
    });
  };

  const goStep = (index) => {
    if (index < 0 || index > plannerSteps.length - 1) return;
    setCurrentStep(index);
  };

  const handleGenerate = async () => {
    const payload = buildPayloadFromForm(form);
    if (!payload.destination) {
      notify('Please enter a destination before generating.', 'error');
      setCurrentStep(0);
      return;
    }

    if (!payload.startDate || !payload.endDate) {
      notify('Please choose your trip start and end dates.', 'error');
      setCurrentStep(1);
      return;
    }

    if (new Date(payload.endDate) < new Date(payload.startDate)) {
      notify('End date must be after start date.', 'error');
      setCurrentStep(1);
      return;
    }

    setLoadingGenerate(true);
    try {
      const response = await generateItinerary(payload);
      setLoadingProgress(100);

      const nextPlan = buildPlanState({
        id: '',
        title: `${payload.destination} Itinerary`,
        itinerary: response?.itinerary || {},
        tripRequest: response?.tripRequest || payload,
        notes: '',
        checklist: Array.isArray(response?.checklist) ? response.checklist : [],
        saved: false,
      });

      setCurrentPlan(nextPlan);
      setVideoPreview(null);
      setSelectedSavedId('');
      setSelectedDayId(nextPlan.days[0]?.id || '');
      setSelectedStop(nextPlan.days[0]?.stops?.[0] || null);
      notify('Your itinerary is ready.');
    } catch (error) {
      notify(
        error?.response?.data?.message || 'Unable to generate itinerary right now. Please try again later.',
        'error'
      );
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (!currentPlan) return;
    setLoadingSave(true);
    try {
      const response = await saveGeneratedItinerary({
        title: currentPlan.title,
        itinerary: currentPlan.itineraryRaw,
        tripRequest: currentPlan.tripRequest,
        notes: currentPlan.notes || '',
        checklist: currentPlan.checklist || [],
      });

      const savedRecord = response?.itinerary;
      const savedPlan = buildPlanState({
        id: savedRecord?._id || '',
        title: savedRecord?.title,
        itinerary: savedRecord?.itinerary || currentPlan.itineraryRaw,
        tripRequest: savedRecord?.tripRequest || currentPlan.tripRequest,
        notes: savedRecord?.notes || currentPlan.notes,
        checklist: savedRecord?.checklist || currentPlan.checklist,
        saved: true,
        createdAt: savedRecord?.createdAt,
        updatedAt: savedRecord?.updatedAt,
      });

      setCurrentPlan(savedPlan);
      setSelectedSavedId(savedPlan.id);
      await refreshSavedItems(savedPlan.id);
      notify('Itinerary saved successfully.');
    } catch (error) {
      notify(error?.response?.data?.message || 'Unable to save itinerary.', 'error');
    } finally {
      setLoadingSave(false);
    }
  };

  const handlePersistPlanChanges = async () => {
    if (!currentPlan?.id) {
      notify('Save this itinerary first, then update notes/checklist.', 'error');
      return;
    }

    setLoadingSave(true);
    try {
      const response = await updateSavedItinerary(currentPlan.id, {
        title: currentPlan.title,
        notes: currentPlan.notes,
        checklist: currentPlan.checklist,
      });
      const record = response?.itinerary;
      const nextPlan = buildPlanState({
        id: record?._id || currentPlan.id,
        title: record?.title || currentPlan.title,
        itinerary: record?.itinerary || currentPlan.itineraryRaw,
        tripRequest: record?.tripRequest || currentPlan.tripRequest,
        notes: record?.notes || currentPlan.notes,
        checklist: record?.checklist || currentPlan.checklist,
        saved: true,
        createdAt: record?.createdAt || currentPlan.createdAt,
        updatedAt: record?.updatedAt || currentPlan.updatedAt,
      });

      setCurrentPlan(nextPlan);
      await refreshSavedItems(nextPlan.id);
      notify('Saved itinerary updates.');
    } catch (error) {
      notify(error?.response?.data?.message || 'Unable to update itinerary.', 'error');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!currentPlan?.id) {
      setCurrentPlan(null);
      setVideoPreview(null);
      setSelectedSavedId('');
      setSelectedDayId('');
      setSelectedStop(null);
      return;
    }

    setLoadingSave(true);
    try {
      await deleteSavedItinerary(currentPlan.id);
      notify('Itinerary deleted.');
      const nextId = await refreshSavedItems();
      if (nextId) {
        await loadSavedDetail(nextId);
      } else {
        setCurrentPlan(null);
        setVideoPreview(null);
        setSelectedSavedId('');
        setSelectedDayId('');
        setSelectedStop(null);
      }
    } catch (error) {
      notify(error?.response?.data?.message || 'Unable to delete itinerary.', 'error');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleShare = async () => {
    if (!currentPlan) return;
    const text = `${currentPlan.title} | ${currentPlan.destination} | ${currentPlan.dateLabel}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPlan.title,
          text,
          url: window.location.href,
        });
        notify('Itinerary shared successfully.');
        return;
      } catch {
        // Fallback clipboard flow.
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} | ${window.location.href}`);
      notify('Share link copied to clipboard.');
    } catch {
      notify('Unable to copy share link.', 'error');
    }
  };

  const handlePdfDownload = async () => {
    if (!currentPlan) return;
    try {
      await downloadItineraryPdf({
        itinerary: currentPlan.itineraryRaw,
        tripRequest: currentPlan.tripRequest,
      });
      notify('Itinerary PDF downloaded.');
    } catch (error) {
      notify(error?.response?.data?.message || 'Unable to download PDF.', 'error');
    }
  };

  const toggleChecklistItem = (index) => {
    setCurrentPlan((prev) => {
      if (!prev) return prev;
      const nextChecklist = prev.checklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, done: !item.done } : item
      );
      return { ...prev, checklist: nextChecklist };
    });
  };

  const selectDay = (dayId) => {
    const day = currentPlan?.days?.find((item) => item.id === dayId);
    if (!day) return;
    setSelectedDayId(dayId);
    setSelectedStop(day?.stops?.[0] || null);
  };

  const selectStopInDay = (dayId, stop) => {
    if (!dayId) return;
    setSelectedDayId(dayId);
    setSelectedStop(stop || null);
  };

  const renderStepContent = () => {
    const step = plannerSteps[currentStep]?.id;

    if (step === 'destination') {
      return (
        <div className="stepBlock">
          <h3>Where do you want to go?</h3>
          <p>Start with destination. You can also load an old saved trip if needed.</p>

          <label htmlFor="trip-destination" className="fieldLabel">Destination</label>
          <input
            id="trip-destination"
            type="text"
            value={form.destination}
            onChange={(event) => updateField('destination', event.target.value)}
            placeholder="Search city, state, or country"
            className="textField"
          />

          <div className="chipRow">
            {[...recentDestinations.slice(0, 4), ...trendingDestinations]
              .filter((name, index, arr) => arr.indexOf(name) === index)
              .slice(0, 8)
              .map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`pillButton ${form.destination === name ? 'active' : ''}`}
                  onClick={() => updateField('destination', name)}
                >
                  {name}
                </button>
              ))}
          </div>

          <div className="loadSavedBox">
            <div>
              <p className="loadSavedTitle">Load Saved Itinerary</p>
              <p className="loadSavedText">Pick a previous plan only when you want to view/edit it.</p>
            </div>
            <div className="loadSavedActions">
              <select
                value={selectedSavedId}
                onChange={(event) => setSelectedSavedId(event.target.value)}
                className="selectField"
              >
                <option value="">Select saved trip</option>
                {savedItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.destination} ({item.daysCount} days)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadSavedDetail(selectedSavedId)}
                disabled={!selectedSavedId || loadingDetail}
                className="outlineButton"
              >
                {loadingDetail ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (step === 'dates') {
      return (
        <div className="stepBlock">
          <h3>When are you travelling?</h3>
          <p>Add exact dates so the itinerary, weather, and pacing are realistic.</p>

          <div className="fieldGridTwo">
            <div>
              <label htmlFor="trip-start-date" className="fieldLabel">Start Date</label>
              <input
                id="trip-start-date"
                type="date"
                value={form.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                className="textField"
              />
            </div>
            <div>
              <label htmlFor="trip-end-date" className="fieldLabel">End Date</label>
              <input
                id="trip-end-date"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(event) => updateField('endDate', event.target.value)}
                className="textField"
              />
            </div>
          </div>

          <div className="compactInfo">
            <span>{formatDateLabel(form.startDate, form.endDate)}</span>
            <span>{tripDays ? `${tripDays} day${tripDays > 1 ? 's' : ''}` : 'Select both dates'}</span>
          </div>
        </div>
      );
    }

    if (step === 'interests') {
      return (
        <div className="stepBlock">
          <h3>What kind of trip do you want?</h3>
          <p>Select interests so attractions and route suggestions match your travel style.</p>

          <div className="interestGrid">
            {interestOptions.map((interest) => {
              const active = form.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  className={`interestCard ${active ? 'active' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 'style') {
      return (
        <div className="stepBlock">
          <h3>Choose budget and trip pace</h3>
          <p>This controls recommended hotels, transfer choices, and day intensity.</p>

          <label className="fieldLabel">Budget</label>
          <div className="optionGrid">
            {budgetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`optionCard ${form.budget === option.id ? 'active' : ''}`}
                onClick={() => updateField('budget', option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>

          <label className="fieldLabel">Travel Style</label>
          <div className="optionGrid">
            {travelStyles.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`optionCard ${form.tripStyle === option.id ? 'active' : ''}`}
                onClick={() => updateField('tripStyle', option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="stepBlock">
        <h3>Travelers and preferences</h3>
        <p>Finalize trip details before you generate the itinerary.</p>

        <div className="travelerGrid">
          <div className="travelerCounter">
            <span>Adults</span>
            <div>
              <button type="button" onClick={() => adjustTraveler('adults', -1)}>-</button>
              <strong>{form.travelers.adults}</strong>
              <button type="button" onClick={() => adjustTraveler('adults', 1)}>+</button>
            </div>
          </div>
          <div className="travelerCounter">
            <span>Children</span>
            <div>
              <button type="button" onClick={() => adjustTraveler('children', -1)}>-</button>
              <strong>{form.travelers.children}</strong>
              <button type="button" onClick={() => adjustTraveler('children', 1)}>+</button>
            </div>
          </div>
          <div className="travelerCounter">
            <span>Rooms</span>
            <div>
              <button type="button" onClick={() => adjustTraveler('rooms', -1)}>-</button>
              <strong>{form.travelers.rooms}</strong>
              <button type="button" onClick={() => adjustTraveler('rooms', 1)}>+</button>
            </div>
          </div>
        </div>

        <div className="fieldGridTwo">
          <div>
            <label className="fieldLabel">Transport Preference</label>
            <select
              value={form.transportPreference}
              onChange={(event) => updateField('transportPreference', event.target.value)}
              className="selectField"
            >
              {transportOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fieldLabel">Currency</label>
            <input
              type="text"
              maxLength={3}
              value={form.currency}
              onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
              className="textField"
            />
          </div>
          <div>
            <label className="fieldLabel">Hotel Type</label>
            <select
              value={form.hotelType}
              onChange={(event) => updateField('hotelType', event.target.value)}
              className="selectField"
            >
              {hotelTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fieldLabel">Food Preference</label>
            <select
              value={form.foodPreference}
              onChange={(event) => updateField('foodPreference', event.target.value)}
              className="selectField"
            >
              {foodTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="fieldLabel">Accessibility</label>
          <select
            value={form.accessibility}
            onChange={(event) => updateField('accessibility', event.target.value)}
            className="selectField"
          >
            {accessibilityOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="fieldLabel">Special Requirements</label>
          <textarea
            value={form.specialRequirements}
            onChange={(event) => updateField('specialRequirements', event.target.value)}
            rows={4}
            className="textareaField"
            placeholder="Any accessibility, dietary, or timing preferences..."
          />
        </div>
      </div>
    );
  };

  if (loadingInit) {
    return (
      <div className="tripPlannerRoot">
        <section className="loadingBootCard">
          <CircularProgress size={22} />
          <p>Preparing your trip planner...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="tripPlannerRoot">
      <div className="plannerBackdropLayer" />
      <section className="plannerHeader">
        <div>
          <p className="plannerEyebrow">AI Planner</p>
          <h1>Plan Your Trip Step by Step</h1>
          <p>
            Start with inputs only. After you generate, we will show itinerary, map, weather, and activity insights.
          </p>
          {profileInfo?.name && (
            <p className="plannerProfileHint">
              Planning for {profileInfo.name}
              {profileInfo.country ? ` from ${profileInfo.country}` : ''}
            </p>
          )}
        </div>
        <div className="plannerHeaderStats">
          <div>
            <strong>{savedItems.length}</strong>
            <span>Saved Trips</span>
          </div>
          <div>
            <strong>{form.interests.length}</strong>
            <span>Interests</span>
          </div>
          <div>
            <strong>{tripDays || '-'}</strong>
            <span>Trip Days</span>
          </div>
        </div>
      </section>

      {!currentPlan && (
        <section className="plannerFormCard">
          <div className="plannerStepTabs">
            {plannerSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`stepTab ${currentStep === index ? 'active' : ''}`}
                onClick={() => goStep(index)}
              >
                <span>{index + 1}</span>
                {step.title}
              </button>
            ))}
          </div>

          <div className="plannerStepBody">
            {renderStepContent()}
          </div>

          <div className="plannerFooterActions">
            <button
              type="button"
              onClick={() => goStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="outlineButton"
            >
              Previous
            </button>

            <div className="plannerFooterRight">
              {currentStep < plannerSteps.length - 1 && (
                <button
                  type="button"
                  onClick={() => goStep(currentStep + 1)}
                  className="outlineButton"
                >
                  Next
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loadingGenerate}
                className="primaryButton"
              >
                {loadingGenerate ? 'Generating...' : 'Generate Itinerary'}
              </button>
            </div>
          </div>
        </section>
      )}

      {loadingGenerate && (
        <section className="generatingCard">
          <div className="generatingHead">
            <AutoAwesomeRoundedIcon />
            <div>
              <h3>Crafting Your Itinerary</h3>
              <p>We are building routes, budget, weather, and activity flow in real time.</p>
            </div>
            <span>{loadingProgress}%</span>
          </div>
          <div className="progressTrack">
            <div className="progressFill" style={{ width: `${loadingProgress}%` }} />
          </div>
          <div className="loadingSteps">
            {loadingFlowSteps.map((item, index) => (
              <div key={item} className={`loadingStep ${index <= loadingPhase ? 'done' : ''}`}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentPlan && !loadingGenerate && (
        <>
          <section className="resultActionBar">
            <div>
              <h2>{currentPlan.title}</h2>
              <p>{currentPlan.dateLabel}</p>
            </div>

            <div className="resultActionButtons">
              <button
                type="button"
                className="outlineButton"
                onClick={() => {
                  setCurrentPlan(null);
                  setVideoPreview(null);
                  setSelectedDayId('');
                  setSelectedStop(null);
                }}
              >
                Plan New Trip
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={handleSaveCurrent}
                disabled={loadingSave}
              >
                <SaveRoundedIcon fontSize="small" />
                {currentPlan.saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={handlePdfDownload}
              >
                <DownloadRoundedIcon fontSize="small" />
                PDF
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={handleShare}
              >
                <ShareRoundedIcon fontSize="small" />
                Share
              </button>
              <button
                type="button"
                className="dangerButton"
                onClick={handleDeleteCurrent}
                disabled={loadingSave}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
                Delete
              </button>
            </div>
          </section>

          <section className="resultOverviewGrid">
            <article className="resultPanel">
              <header>
                <h3><PlaceRoundedIcon /> Trip Summary</h3>
              </header>
              <div className="summaryStats">
                <div>
                  <span>Destination</span>
                  <strong>{currentPlan.destination || '-'}</strong>
                </div>
                <div>
                  <span>Total Days</span>
                  <strong>{currentPlan.days.length}</strong>
                </div>
                <div>
                  <span>Estimated Budget</span>
                  <strong>{formatMoney(totalEstimated || budgetTarget, currentPlan.tripRequest.currency || form.currency)}</strong>
                </div>
                <div>
                  <span>Budget Usage</span>
                  <strong>{budgetPercent}%</strong>
                </div>
              </div>
              <p className="summaryText">
                {currentPlan.summary || 'Your itinerary is generated. Review each day, map routes, and weather before booking.'}
              </p>
              <div className="interestTags">
                {(currentPlan.tripRequest.interests || []).slice(0, 8).map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </article>

            <article className="resultPanel">
              <header>
                <h3><CalendarMonthRoundedIcon /> Budget Breakdown</h3>
              </header>
              <div className="budgetList">
                {budgetRows.map((row) => {
                  const width = totalEstimated > 0 ? Math.max(8, Math.round((row.value / totalEstimated) * 100)) : 0;
                  return (
                    <div key={row.name} className="budgetRow">
                      <div className="budgetTop">
                        <span>{row.name}</span>
                        <strong>{formatMoney(row.value, currentPlan.tripRequest.currency || form.currency)}</strong>
                      </div>
                      <div className="budgetTrack">
                        <i className={row.colorClass} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="resultMapWeatherGrid">
            <article className="resultPanel mapPanel">
              <header className="panelHeaderSplit">
                <h3><RouteRoundedIcon /> Trip Map</h3>
                <select
                  className="selectField compactSelect"
                  value={selectedDay?.id || ''}
                  onChange={(event) => {
                    selectDay(event.target.value);
                  }}
                >
                  {currentPlan.days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </header>
              <div className="dayChipsRow">
                {currentPlan.days.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    className={`pillButton ${selectedDay?.id === day.id ? 'active' : ''}`}
                    onClick={() => {
                      selectDay(day.id);
                    }}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="mapHolder">
                <ItineraryRouteMap
                  stops={selectedDay?.stops || []}
                  selectedStopId={selectedStop?.id || ''}
                  onStopClick={(stop) => setSelectedStop(stop)}
                  transportMode={currentPlan.tripRequest.transportMode || form.transportPreference}
                  height={420}
                />
              </div>
            </article>

            <article className="resultPanel weatherPanel">
              <header className="panelHeaderSplit">
                <h3><WbSunnyRoundedIcon /> Weather</h3>
                <span className="smallText">3-day outlook</span>
              </header>
              {weatherLoading ? (
                <div className="inlineLoader">
                  <CircularProgress size={18} />
                  <span>Checking weather...</span>
                </div>
              ) : weather ? (
                <>
                  <div className="weatherStats">
                    <div>
                      <span>Current</span>
                      <strong>{weather.temp} C</strong>
                    </div>
                    <div>
                      <span>Condition</span>
                      <strong>{weather.condition}</strong>
                    </div>
                    <div>
                      <span>Humidity</span>
                      <strong>{weather.humidity}%</strong>
                    </div>
                    <div>
                      <span>Rain Chance</span>
                      <strong>{weather.rainChance}%</strong>
                    </div>
                  </div>
                  <div className="weatherDays">
                    {weatherPreviewDays.map((entry, index) => (
                      <div key={`${entry.date}-${index}`}>
                        <span>{entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short' }) : `Day ${index + 1}`}</span>
                        <strong>{entry.max} / {entry.min} C</strong>
                        <small>{entry.condition}</small>
                      </div>
                    ))}
                  </div>
                  {weatherTips[0] && <p className="weatherQuickTip">{weatherTips[0]}</p>}
                </>
              ) : (
                <p className="emptyText">Weather appears once map coordinates are available in selected day stops.</p>
              )}
            </article>
          </section>

          <section className="resultTimelineGalleryGrid">
            <article className="resultPanel itineraryTimelinePanel">
              <header className="panelHeaderSplit">
                <h3><AutoAwesomeRoundedIcon /> Day-wise Itinerary</h3>
                <span className="smallText">{currentPlan.days.length} days</span>
              </header>
              <p className="emptyText timelineHelperText">
                Pick a day from the top bar, then choose any activity to inspect details on the right panel.
              </p>
              {!currentPlan.days.length ? (
                <p className="emptyText">No generated day plan available.</p>
              ) : (
                <>
                  <div className="dayTopTabs" role="tablist" aria-label="Select itinerary day">
                    {currentPlan.days.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedDay?.id === day.id}
                        className={`dayTopTab ${selectedDay?.id === day.id ? 'active' : ''}`}
                        onClick={() => {
                          selectDay(day.id);
                        }}
                      >
                        <strong>{day.label}</strong>
                        <small>{day.date || 'Date TBA'}</small>
                      </button>
                    ))}
                  </div>

                  {selectedDay ? (
                    <>
                      <div className="daySummaryCard">
                        <div>
                          <strong>{selectedDay.label}</strong>
                          <span>{selectedDay.title}</span>
                          <small>{selectedDay.date || 'Date not available'}</small>
                        </div>
                        <div className="dayMeta">
                          <span>{selectedDay.summary.distanceKm} km</span>
                          <span>{selectedDay.summary.movingTime}</span>
                          <span>{selectedDay.summary.pace}</span>
                        </div>
                      </div>

                      {selectedDayTimeline.length ? (
                        <div className="dayStopsList">
                          {selectedDayTimeline.map((stop, index) => (
                            <button
                              type="button"
                              key={`${selectedDay.id}-${stop.id}`}
                              className={`stopRow ${activeDayStop?.id === stop.id ? 'active' : ''}`}
                              onClick={() => {
                                selectStopInDay(selectedDay.id, stop);
                              }}
                            >
                              <div>
                                <strong>{index + 1}. {stop.name}</strong>
                                <span>{stop.category} | {stop.segment}</span>
                                <small>{stop.address || 'Address unavailable'}</small>
                              </div>
                              <div className="stopTiming">
                                <span>{stop.start || '--'} to {stop.end || '--'}</span>
                                <small>{stop.transportFromPrev?.time ? `Travel ${stop.transportFromPrev.time}` : 'Start point'}</small>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="emptyText">No activities available for this day yet.</p>
                      )}
                    </>
                  ) : (
                    <p className="emptyText">Select a day to view planned activities.</p>
                  )}
                </>
              )}
            </article>

            <article className="resultPanel itineraryInsightPanel">
              <header className="panelHeaderSplit">
                <h3><PlaceRoundedIcon /> Day Activity Insights</h3>
                <span className="smallText">{selectedDay?.label || 'Select a day'}</span>
              </header>
              {!selectedDay ? (
                <p className="emptyText">Select a day to review activity insights.</p>
              ) : (
                <>
                  <div className="dayInsightHeader">
                    <div>
                      <strong>{selectedDay.label}</strong>
                      <span>{selectedDay.title}</span>
                      <small>{selectedDay.date || 'Date not available'}</small>
                    </div>
                    <div className="dayMeta">
                      <span>{selectedDay.summary.distanceKm} km</span>
                      <span>{selectedDay.summary.movingTime}</span>
                      <span>{selectedDay.summary.pace}</span>
                    </div>
                  </div>

                  <div className="insightTabsRow" role="tablist" aria-label="Day insight sections">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={insightTab === 'details'}
                      className={`insightTabButton ${insightTab === 'details' ? 'active' : ''}`}
                      onClick={() => setInsightTab('details')}
                    >
                      Activity
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={insightTab === 'youtube'}
                      className={`insightTabButton ${insightTab === 'youtube' ? 'active' : ''}`}
                      onClick={() => setInsightTab('youtube')}
                    >
                      YouTube
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={insightTab === 'timeline'}
                      className={`insightTabButton ${insightTab === 'timeline' ? 'active' : ''}`}
                      onClick={() => setInsightTab('timeline')}
                    >
                      Timeline ({selectedDayTimeline.length})
                    </button>
                  </div>

                  {insightTab === 'details' && (
                    <>
                      {activeDayStop ? (
                        <div className="selectedActivityCard">
                          <div className="selectedActivityTop">
                            <strong>{activeDayStop.name}</strong>
                            <span>{activeDayStop.category} | {activeDayStop.segment}</span>
                          </div>
                          <div className="selectedActivityStats">
                            <span>{activeDayStop.start || '--'} to {activeDayStop.end || '--'}</span>
                            <span>{activeDayStop.duration || 'Flexible duration'}</span>
                            <span>{activeDayStop.openingHours || 'Hours vary by day'}</span>
                          </div>
                          {activeDayStop.address && (
                            <p className="selectedActivityAddress">{activeDayStop.address}</p>
                          )}
                          {activeDayStop.description && (
                            <p className="selectedActivityDescription">{activeDayStop.description}</p>
                          )}
                          <div className="selectedActivityFacts">
                            {activeDayStop.openingHours && <span>Hours: {activeDayStop.openingHours}</span>}
                            {Number.isFinite(activeDayStop.rating) && activeDayStop.rating > 0 && (
                              <span>Rating: {activeDayStop.rating.toFixed(1)}</span>
                            )}
                            {activeDayStop.transportFromPrev?.mode && (
                              <span>
                                Reach: {activeDayStop.transportFromPrev.mode}
                                {activeDayStop.transportFromPrev.time ? ` | ${activeDayStop.transportFromPrev.time}` : ''}
                              </span>
                            )}
                          </div>
                          {Array.isArray(activeDayStop.bestFor) && activeDayStop.bestFor.length > 0 && (
                            <div className="selectedActivityTags">
                              {activeDayStop.bestFor.slice(0, 5).map((item) => (
                                <span key={`${activeDayStop.id}-${item}`}>{item}</span>
                              ))}
                            </div>
                          )}
                          {activeDayStop.crowdTip && (
                            <p className="selectedActivityTip">Tip: {activeDayStop.crowdTip}</p>
                          )}
                        </div>
                      ) : (
                        <p className="emptyText">No activities available for this day.</p>
                      )}
                    </>
                  )}

                  {insightTab === 'youtube' && (
                    <div className="socialContentBlock">
                      <div className="panelHeaderSplit socialContentHeader">
                        <h4>YouTube Travel Content</h4>
                        <span className="smallText">
                          {socialContent?.location?.label || currentPlan.destination}
                        </span>
                      </div>

                      {socialLoading ? (
                        <div className="inlineLoader">
                          <CircularProgress size={18} />
                          <span>Loading videos and shorts...</span>
                        </div>
                      ) : socialError ? (
                        <p className="emptyText">{socialError}</p>
                      ) : (
                        <>
                          {socialVideos.length > 0 && (
                            <div className="socialBlockSection">
                              <p className="socialSectionLabel">Videos</p>
                              <div className="socialVideoGrid">
                                {socialVideos.slice(0, 4).map((video) => (
                                  <button
                                    type="button"
                                    key={`video-${video.id}`}
                                    className="socialVideoCard socialVideoButton"
                                    onClick={() => openVideoPreview(video)}
                                  >
                                    <div className="socialThumbWrap">
                                      {video.thumbnail ? (
                                        <img src={video.thumbnail} alt={video.title || 'YouTube video'} />
                                      ) : (
                                        <div className="socialThumbFallback">No preview</div>
                                      )}
                                    </div>
                                    <div className="socialVideoMeta">
                                      <strong>{video.title || 'Untitled video'}</strong>
                                      <span>{video.channelTitle || 'YouTube channel'}</span>
                                      <small>
                                        {video.durationLabel || 'Watch'}
                                        {' | '}
                                        {formatPublishedLabel(video.publishedAt)}
                                      </small>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {socialShorts.length > 0 && (
                            <div className="socialBlockSection">
                              <p className="socialSectionLabel">Shorts</p>
                              <div className="socialVideoGrid">
                                {socialShorts.slice(0, 4).map((video) => (
                                  <button
                                    type="button"
                                    key={`short-${video.id}`}
                                    className="socialVideoCard socialVideoButton shortsCard"
                                    onClick={() => openVideoPreview(video)}
                                  >
                                    <div className="socialThumbWrap">
                                      {video.thumbnail ? (
                                        <img src={video.thumbnail} alt={video.title || 'YouTube short'} />
                                      ) : (
                                        <div className="socialThumbFallback">No preview</div>
                                      )}
                                    </div>
                                    <div className="socialVideoMeta">
                                      <strong>{video.title || 'Untitled short'}</strong>
                                      <span>{video.channelTitle || 'YouTube channel'}</span>
                                      <small>
                                        {video.durationLabel || 'Short'}
                                        {' | '}
                                        {formatPublishedLabel(video.publishedAt)}
                                      </small>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {!socialVideos.length && !socialShorts.length && (
                            <p className="emptyText">
                              No direct video matches found yet. Use quick YouTube search links below.
                            </p>
                          )}

                          {socialQuickLinks.length > 0 && (
                            <div className="socialQuickLinks">
                              {socialQuickLinks.map((item, index) => (
                                <a
                                  key={`${item.url}-${index}`}
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="socialQuickLink"
                                >
                                  {item.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {insightTab === 'timeline' && (
                    <div className="dayActivityTimeline">
                      {selectedDayTimeline.map((stop, index) => (
                        <button
                          key={`${selectedDay.id}-${stop.id}`}
                          type="button"
                          className={`activityTimelineRow ${activeDayStop?.id === stop.id ? 'active' : ''}`}
                          onClick={() => selectStopInDay(selectedDay.id, stop)}
                        >
                          <div className="activityTimelineTime">
                            <strong>{stop.start || '--'}</strong>
                            <span>{stop.end || '--'}</span>
                          </div>
                          <div className="activityTimelineInfo">
                            <strong>{index + 1}. {stop.name}</strong>
                            <span>{stop.category} | {stop.segment}</span>
                            <small>{stop.address || 'Address unavailable'}</small>
                          </div>
                          <div className="activityTimelineMeta">
                            <strong>{stop.duration || 'Flexible'}</strong>
                            <span>{stop.transportFromPrev?.time ? `Travel ${stop.transportFromPrev.time}` : 'No transfer'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!selectedDay?.stops?.length && (
                <p className="emptyText">No activities found for the selected day.</p>
              )}
              <div className="activityHint">
                <AutoAwesomeRoundedIcon fontSize="small" />
                <span>
                  Select any stop from day-wise itinerary to inspect timing, logistics, and quick travel tips.
                </span>
              </div>
            </article>
          </section>

          <section className="resultChecklistGrid">
            <article className="resultPanel">
              <header className="panelHeaderSplit">
                <h3>Checklist</h3>
                <span className="smallText">{completedChecklist}/{checklistTotal} done</span>
              </header>
              <div className="checklistList">
                {(currentPlan.checklist || []).map((item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={() => toggleChecklistItem(index)}
                    className={`checkItem ${item.done ? 'done' : ''}`}
                  >
                    <span>{item.done ? 'Done' : 'Todo'}</span>
                    <p>{item.label}</p>
                  </button>
                ))}
              </div>
            </article>

            <article className="resultPanel">
              <header>
                <h3>Planner Notes</h3>
              </header>
              <textarea
                value={currentPlan.notes || ''}
                onChange={(event) =>
                  setCurrentPlan((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                }
                rows={10}
                className="textareaField"
                placeholder="Booking references, emergency contacts, or personal reminders..."
              />
              <button
                type="button"
                onClick={handlePersistPlanChanges}
                disabled={!currentPlan || loadingSave}
                className="primaryButton fullWidth"
              >
                {loadingSave ? 'Saving...' : 'Save Notes & Checklist'}
              </button>
            </article>
          </section>
        </>
      )}

      {videoPreview && (
        <section className="floatingVideoPlayer" role="dialog" aria-label="YouTube video player">
          <header className="floatingVideoHead">
            <div className="floatingVideoTitleBlock">
              <strong>{videoPreview.title || 'YouTube video'}</strong>
              <span>{videoPreview.channelTitle || 'YouTube'}</span>
            </div>
            <div className="floatingVideoActions">
              {videoPreview.watchUrl && (
                <a
                  href={videoPreview.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="floatingVideoOpenLink"
                >
                  <OpenInNewRoundedIcon fontSize="inherit" />
                  Open YouTube
                </a>
              )}
              <button
                type="button"
                onClick={() => setVideoPreview(null)}
                className="floatingVideoClose"
                aria-label="Close video preview"
              >
                <CloseRoundedIcon fontSize="inherit" />
              </button>
            </div>
          </header>
          <div className="floatingVideoFrameWrap">
            <iframe
              key={`${videoPreview.id}-${videoPreview.embedUrl}`}
              src={videoPreview.embedUrl}
              title={videoPreview.title || 'YouTube video preview'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <Snackbar
        open={Boolean(notification.message)}
        autoHideDuration={3500}
        onClose={() => setNotification({ message: '', severity: 'success' })}
      >
        <Alert
          onClose={() => setNotification({ message: '', severity: 'success' })}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

