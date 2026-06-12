import React, { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttractionsIcon from '@mui/icons-material/Attractions';
import HotelIcon from '@mui/icons-material/Hotel';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ExploreIcon from '@mui/icons-material/Explore';
import PremiumDestinationMap from './PremiumDestinationMap';
import api from '../../api';

const categories = ['All', 'Island', 'Mountain', 'City', 'Heritage', 'Beach', 'Temple', 'Fort', 'Hotel', 'Cafe'];
const filters = [
  'All',
  'Landmark',
  'Monument',
  'Nature',
  'Historic',
  'Museum',
  'Park',
  'Temple',
  'Beach',
  'Fort',
  'Hotel',
  'Cafe',
  'Popular',
  'Heritage Site',
  'Natural Wonder',
];

const assistantPromptTemplates = [
  'Best time to visit this destination',
  'How to arrive here from major airport',
  '3-day family friendly plan near this place',
];

function toFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const aLat = toFiniteNumber(lat1, null);
  const aLon = toFiniteNumber(lon1, null);
  const bLat = toFiniteNumber(lat2, null);
  const bLon = toFiniteNumber(lon2, null);
  if (aLat == null || aLon == null || bLat == null || bLon == null) return null;

  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function mapFeatureToDestination(feature) {
  const properties = feature?.properties || {};
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];

  return {
    xid: properties?.xid || properties?.fsq_id || null,
    fsqId: properties?.fsq_id || null,
    source: properties?.source || 'search',
    name: properties?.name || 'Unknown place',
    lat: toFiniteNumber(coordinates[1], null),
    lon: toFiniteNumber(coordinates[0], null),
    city: properties?.city || '',
    country: properties?.country || '',
    category: properties?.kinds || 'Popular',
    description: properties?.description || 'No description available.',
    rating: toFiniteNumber(properties?.rating ?? properties?.rate, 0),
    distanceKm: toFiniteNumber(properties?.distance_km, null),
    details: {
      kinds: properties?.kinds || '',
      source: properties?.source || '',
    },
  };
}

function extractKinds(destination) {
  const sourceKinds =
    destination?.details?.kinds ||
    (typeof destination?.details === 'string' ? destination.details : '') ||
    destination?.category ||
    destination?.kinds ||
    '';

  return String(sourceKinds)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function placeKey(destination) {
  const xid = normalizeLower(destination?.xid || '');
  if (xid) return `xid:${xid}`;

  const fsqId = normalizeLower(destination?.fsqId || '');
  if (fsqId) return `fsq:${fsqId}`;

  const name = normalizeLower(destination?.name || 'unknown');
  const lat = toFiniteNumber(destination?.lat, null);
  const lon = toFiniteNumber(destination?.lon, null);
  if (lat != null && lon != null) {
    return `coord:${name}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  }
  return `name:${name}`;
}

function dedupePlaces(destinations = []) {
  const seen = new Set();
  const output = [];

  for (const destination of destinations) {
    if (!destination) continue;
    const key = placeKey(destination);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(destination);
  }

  return output;
}

function samePlace(a, b) {
  if (!a || !b) return false;
  if (a.xid && b.xid && a.xid === b.xid) return true;
  return placeKey(a) === placeKey(b);
}

function formatLocation(destination) {
  return [destination?.city, destination?.country].filter(Boolean).join(', ') || 'Location not available';
}

function formatDistanceLabel(origin, destination) {
  if (toFiniteNumber(destination?.distanceKm, null) != null) {
    return `${Number(destination.distanceKm).toFixed(1)} km away`;
  }

  const km = getDistanceFromLatLonInKm(origin?.lat, origin?.lon, destination?.lat, destination?.lon);
  if (!Number.isFinite(km)) return '';
  return `${km.toFixed(1)} km away`;
}

function buildGoogleMapsUrl(destination) {
  const lat = toFiniteNumber(destination?.lat, null);
  const lon = toFiniteNumber(destination?.lon, null);
  if (lat != null && lon != null) return `https://www.google.com/maps?q=${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination?.name || 'destination')}`;
}

function buildGoogleDirectionsUrl(destination, userLocation = null) {
  const destinationLat = toFiniteNumber(destination?.lat, null);
  const destinationLon = toFiniteNumber(destination?.lon, null);
  if (destinationLat == null || destinationLon == null) return buildGoogleMapsUrl(destination);

  const base = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLon}`;
  const userLat = toFiniteNumber(userLocation?.lat, null);
  const userLon = toFiniteNumber(userLocation?.lon, null);
  if (userLat == null || userLon == null) return base;
  return `${base}&origin=${userLat},${userLon}&travelmode=driving`;
}

function getQuickNearbyTopic(search = '', category = 'All', filter = 'All') {
  const combined = normalizeLower([search, category, filter].filter(Boolean).join(' '));

  if (/(beach|coast|island|sea|shore)/.test(combined)) return 'beaches';
  if (/(hill|mountain|trek|hiking|viewpoint)/.test(combined)) return 'mountains';
  if (/(temple|church|mosque|cathedral|religious)/.test(combined)) return 'temples';
  if (/(fort|castle|historic|heritage|museum|monument)/.test(combined)) return 'heritage';
  if (/(food|cafe|restaurant)/.test(combined)) return 'food spots';
  return 'attractions';
}

function normalizeInsightPayload(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    title: normalizeText(raw.title || ''),
    overview: normalizeText(raw.overview || ''),
    bestTimeToVisit: normalizeText(raw.bestTimeToVisit || ''),
    highlights: Array.isArray(raw.highlights) ? raw.highlights.filter(Boolean) : [],
    nearbyFocus: Array.isArray(raw.nearbyFocus) ? raw.nearbyFocus.filter(Boolean) : [],
    hotelAdvice: Array.isArray(raw.hotelAdvice) ? raw.hotelAdvice.filter(Boolean) : [],
    foodAdvice: Array.isArray(raw.foodAdvice) ? raw.foodAdvice.filter(Boolean) : [],
    transportAdvice: Array.isArray(raw.transportAdvice) ? raw.transportAdvice.filter(Boolean) : [],
    cautions: Array.isArray(raw.cautions) ? raw.cautions.filter(Boolean) : [],
    budgetTip: normalizeText(raw.budgetTip || ''),
    arrival: {
      mode: normalizeText(raw?.arrival?.mode || ''),
      estimatedTime: normalizeText(raw?.arrival?.estimatedTime || ''),
      steps: Array.isArray(raw?.arrival?.steps) ? raw.arrival.steps.filter(Boolean) : [],
    },
  };
}

export default function ExploreDestinations() {
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filter, setFilter] = useState('All');
  const [rating, setRating] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userLocation, setUserLocation] = useState(null);

  const [destinations, setDestinations] = useState([]);
  const [defaultDestinations, setDefaultDestinations] = useState([]);
  const [isSearchResult, setIsSearchResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyDestinations, setNearbyDestinations] = useState([]);
  const [nearbyHotels, setNearbyHotels] = useState([]);
  const [nearbyFood, setNearbyFood] = useState([]);

  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [assistantInsight, setAssistantInsight] = useState(null);
  const [assistantMeta, setAssistantMeta] = useState(null);

  const normalizeSelectedDestination = (baseDest, detail = null) => {
    const detailKinds = detail?.kinds || '';
    const baseKinds =
      typeof baseDest?.details === 'string' ? baseDest.details : baseDest?.details?.kinds || '';
    const kinds = detailKinds || baseKinds || baseDest?.category || '';

    return {
      ...baseDest,
      description:
        detail?.wikipedia_extracts?.text ||
        detail?.wikipedia_extract ||
        detail?.info?.descr ||
        baseDest?.description ||
        'Description not available for this place.',
      city: detail?.address?.city || baseDest?.city || '',
      country: detail?.address?.country || baseDest?.country || '',
      rating: detail?.rate ? Number(detail.rate) * 2 : Number(baseDest?.rating || 0),
      category: baseDest?.category || kinds,
      details: {
        ...(baseDest?.details && typeof baseDest.details === 'object' ? baseDest.details : {}),
        kinds,
      },
    };
  };

  useEffect(() => {
    let mounted = true;
    const loadDestinations = async () => {
      setLoading(true);
      setError('');
      try {
        const dbResponse = await api.get('/destination/destinations');
        const dbData = Array.isArray(dbResponse?.data) ? dbResponse.data : [];

        if (!mounted) return;
        if (dbData.length > 0) {
          setDestinations(dbData);
          setDefaultDestinations(dbData);
          return;
        }

        const popularResponse = await api.get('/opentripmap/popular');
        const popularData = Array.isArray(popularResponse?.data) ? popularResponse.data : [];
        if (!mounted) return;
        setDestinations(popularData);
        setDefaultDestinations(popularData);
      } catch {
        if (!mounted) return;
        setError('Could not load destinations. Try searching for beaches, temples, or new places.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDestinations();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      }
    );
  }, []);

  const filtered = useMemo(() => {
    return destinations.filter((destination) => {
      const searchText = normalizeLower(search);
      const kinds = extractKinds(destination).map((kind) => normalizeLower(kind));
      const categoryLower = normalizeLower(destination?.category || '');
      const combinedKinds = `${kinds.join(' ')} ${categoryLower}`;

      const matchesSearch =
        !searchText ||
        normalizeLower(destination?.name).includes(searchText) ||
        normalizeLower(destination?.city).includes(searchText) ||
        normalizeLower(destination?.country).includes(searchText) ||
        combinedKinds.includes(searchText);

      const matchesCategory = category === 'All' || combinedKinds.includes(normalizeLower(category));
      const matchesFilter = filter === 'All' || combinedKinds.includes(normalizeLower(filter));
      const matchesRating = Number(destination?.rating || 0) >= Number(rating || 0);

      let matchesDistance = true;
      if (Number(distance) > 0 && userLocation && destination?.lat != null && destination?.lon != null) {
        const km = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lon, destination.lat, destination.lon);
        matchesDistance = Number.isFinite(km) ? km <= Number(distance) : true;
      }

      return matchesSearch && matchesCategory && matchesFilter && matchesRating && matchesDistance;
    });
  }, [category, destinations, distance, filter, rating, search, userLocation]);

  const mapDestinations = useMemo(() => {
    if (selected) {
      return dedupePlaces([selected, ...nearbyDestinations, ...nearbyHotels, ...nearbyFood]);
    }
    return dedupePlaces(filtered);
  }, [filtered, nearbyDestinations, nearbyFood, nearbyHotels, selected]);

  const mapCenter = useMemo(() => {
    if (selected?.lat != null && selected?.lon != null) {
      return { lat: Number(selected.lat), lng: Number(selected.lon) };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [selected]);

  const loadNearbyForSelected = async (anchorDestination) => {
    const lat = toFiniteNumber(anchorDestination?.lat, null);
    const lon = toFiniteNumber(anchorDestination?.lon, null);
    if (lat == null || lon == null) {
      setNearbyDestinations([]);
      setNearbyHotels([]);
      setNearbyFood([]);
      setNearbyError('Coordinates missing for selected destination.');
      return;
    }

    try {
      setNearbyLoading(true);
      setNearbyError('');

      const paramsBase = {
        lat,
        lon,
        radius: 20000,
        limit: 10,
        excludeXid: anchorDestination?.xid || '',
        excludeName: anchorDestination?.name || '',
      };

      const [attractionsRes, hotelsRes, foodRes] = await Promise.all([
        api.get('/opentripmap/nearby', {
          params: { ...paramsBase, category: getQuickNearbyTopic(search, category, filter) || 'attractions' },
        }),
        api.get('/opentripmap/nearby', {
          params: { ...paramsBase, category: 'hotels', radius: 15000 },
        }),
        api.get('/opentripmap/nearby', {
          params: { ...paramsBase, category: 'food', radius: 12000 },
        }),
      ]);

      const attractions = Array.isArray(attractionsRes?.data?.features)
        ? attractionsRes.data.features.map((item) => mapFeatureToDestination(item))
        : [];
      const hotels = Array.isArray(hotelsRes?.data?.features)
        ? hotelsRes.data.features.map((item) => mapFeatureToDestination(item))
        : [];
      const food = Array.isArray(foodRes?.data?.features)
        ? foodRes.data.features.map((item) => mapFeatureToDestination(item))
        : [];

      setNearbyDestinations(
        dedupePlaces(
          attractions.filter((item) => item?.name && !samePlace(item, anchorDestination))
        ).slice(0, 8)
      );
      setNearbyHotels(
        dedupePlaces(
          hotels.filter((item) => item?.name && !samePlace(item, anchorDestination))
        ).slice(0, 8)
      );
      setNearbyFood(
        dedupePlaces(
          food.filter((item) => item?.name && !samePlace(item, anchorDestination))
        ).slice(0, 8)
      );
    } catch {
      setNearbyError('Nearby destination data could not be loaded right now.');
      setNearbyDestinations([]);
      setNearbyHotels([]);
      setNearbyFood([]);
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleSelectDestination = async (destination) => {
    setAssistantInsight(null);
    setAssistantError('');
    setAssistantMeta(null);

    const base = normalizeSelectedDestination(destination);
    setSelected(base);

    let resolved = base;
    if (destination?.xid) {
      setDetailLoading(true);
      try {
        const detailResponse = await api.get(`/opentripmap/place/${encodeURIComponent(destination.xid)}`);
        resolved = normalizeSelectedDestination(destination, detailResponse?.data || null);
        setSelected(resolved);
      } catch {
        setSelected(base);
      } finally {
        setDetailLoading(false);
      }
    }

    await loadNearbyForSelected(resolved);
  };

  const handleSearch = async () => {
    const query = normalizeText(pendingSearch);
    if (!query) {
      setSearch('');
      setIsSearchResult(false);
      setDestinations(defaultDestinations);
      return;
    }

    setLoading(true);
    setError('');
    setSearch(query);
    setIsSearchResult(true);

    try {
      const response = await api.get('/opentripmap/search', {
        params: { query, limit: 24 },
      });
      const places = Array.isArray(response?.data?.features)
        ? response.data.features.map((item) => mapFeatureToDestination(item)).filter((item) => item?.name)
        : [];

      setDestinations(dedupePlaces(places));
      if (places.length === 0) {
        setError('No matching places found. Try: beaches in Thailand, temples in Kyoto, or new places in Europe.');
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setPendingSearch('');
    setSearch('');
    setIsSearchResult(false);
    setError('');
    setDestinations(defaultDestinations);
  };

  const askAssistant = async () => {
    if (!selected) return;
    const question = normalizeText(assistantPrompt);
    if (!question) {
      setAssistantError('Please enter a question for AI assistant.');
      return;
    }

    try {
      setAssistantLoading(true);
      setAssistantError('');
      const response = await api.post('/opentripmap/insight', {
        destination: selected,
        question,
        nearby: nearbyDestinations,
        hotels: nearbyHotels,
        food: nearbyFood,
        userLocation,
      });

      const insight = normalizeInsightPayload(response?.data?.insight || null);
      if (!insight) {
        setAssistantError('Assistant did not return usable insight.');
        return;
      }
      setAssistantInsight(insight);
      setAssistantMeta({
        provider: response?.data?.provider || 'unknown',
        aiAvailable: Boolean(response?.data?.aiAvailable),
      });
    } catch {
      setAssistantError('Assistant request failed right now. Please try again.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const renderNearbyList = (title, icon, items, emptyText) => (
    <Paper
      elevation={0}
      sx={{
        p: 1.4,
        borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.08)',
        height: 240,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ overflowY: 'auto', pr: 0.4 }}>
        {nearbyLoading ? (
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="#6B7280">
              Loading...
            </Typography>
          </Stack>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="#6B7280">
            {emptyText}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {items.map((place) => (
              <Paper
                key={placeKey(place)}
                elevation={0}
                sx={{
                  p: 1.1,
                  borderRadius: '10px',
                  border: '1px solid rgba(79,138,139,0.2)',
                  background: '#fcfeff',
                  cursor: 'pointer',
                }}
                onClick={() => handleSelectDestination(place)}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {place.name}
                </Typography>
                <Typography variant="caption" color="#6B7280" sx={{ display: 'block' }}>
                  {formatLocation(place)}
                  {selected && ` | ${formatDistanceLabel(selected, place)}`}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={24} />
          <Typography variant="body1" color="#4B5563">
            Loading destination explorer...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', pb: 3 }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
          color: 'white',
          p: { xs: 2.5, md: 3 },
          borderRadius: '16px',
          mb: 2,
          boxShadow: '0 10px 30px rgba(79, 138, 139, 0.24)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Smart Explore Destinations
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.3 }}>
          Accurate nearby places, hotels, food, AI travel guidance, and direct arrival links.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '390px minmax(0, 1fr)' },
          gap: 2,
        }}
      >
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 12 }, alignSelf: 'start' }}>
          <Paper
            elevation={0}
            sx={{
              p: 1.6,
              borderRadius: '14px',
              border: '1px solid rgba(79, 138, 139, 0.16)',
            }}
          >
            <Stack spacing={1.3}>
              <TextField
                placeholder="Try: beaches in Goa, space museums in USA"
                value={pendingSearch}
                onChange={(event) => setPendingSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <span style={{ fontSize: 15 }}>Search</span>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSearch}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
                  }}
                >
                  Search
                </Button>
                {isSearchResult && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={clearSearch}
                    sx={{ textTransform: 'none', borderColor: '#4F8A8B', color: '#2d5a5b' }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1}>
                <TextField
                  select
                  label="Category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  size="small"
                >
                  {categories.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Filter"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  size="small"
                >
                  {filters.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Min Rating"
                  type="number"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  size="small"
                />
                <TextField
                  label="Max Distance (km)"
                  type="number"
                  value={distance}
                  onChange={(event) => setDistance(Number(event.target.value))}
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
                  disabled={!userLocation}
                  helperText={!userLocation ? 'Enable location for this filter.' : ''}
                />
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Results
                </Typography>
                <Typography variant="caption" color="#6B7280">
                  {filtered.length} places
                </Typography>
              </Stack>

              <Box
                sx={{
                  maxHeight: { xs: 360, lg: 'calc(100vh - 350px)' },
                  overflowY: 'auto',
                  pr: 0.5,
                }}
              >
                {filtered.length === 0 ? (
                  <Typography variant="body2" color="#6B7280">
                    No destinations found with current filters.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {filtered.map((destination) => {
                      const kinds = extractKinds(destination).slice(0, 3);
                      return (
                        <Paper
                          key={placeKey(destination)}
                          elevation={0}
                          sx={{
                            p: 1.2,
                            borderRadius: '10px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            background:
                              selected && samePlace(selected, destination)
                                ? 'rgba(79,138,139,0.08)'
                                : 'white',
                          }}
                          onClick={() => handleSelectDestination(destination)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#111827' }}>
                            {destination.name}
                          </Typography>
                          <Typography variant="caption" color="#6B7280" sx={{ display: 'block', mb: 0.6 }}>
                            {formatLocation(destination)}
                          </Typography>
                          <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                            {Number(destination?.rating || 0) > 0 && (
                              <Chip
                                size="small"
                                icon={<AttractionsIcon sx={{ fontSize: '0.85rem !important' }} />}
                                label={`${Number(destination.rating).toFixed(1)} / 10`}
                              />
                            )}
                            {kinds.map((kind) => (
                              <Chip key={`${placeKey(destination)}-${kind}`} size="small" label={kind} variant="outlined" />
                            ))}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Paper>
        </Box>

        <Box>
          {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

          {!selected ? (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: '14px',
                border: '1px dashed rgba(79, 138, 139, 0.4)',
                background: '#f9fcfd',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Select a destination from the left list
              </Typography>
              <Typography variant="body2" color="#6B7280" sx={{ mt: 0.5 }}>
                You will get detailed info, nearby destinations, hotels, food, AI guidance, and arrival suggestions.
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: '14px',
                border: '1px solid rgba(79, 138, 139, 0.18)',
                background: 'linear-gradient(135deg, rgba(79,138,139,0.06) 0%, #ffffff 100%)',
              }}
            >
              <Stack spacing={1.6}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {selected.name}
                    </Typography>
                    <Typography variant="body2" color="#4B5563">
                      {formatLocation(selected)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component="a"
                      href={buildGoogleMapsUrl(selected)}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: 'none', borderColor: '#4F8A8B', color: '#2d5a5b' }}
                    >
                      Open Map
                    </Button>
                    <Button
                      component="a"
                      href={buildGoogleDirectionsUrl(selected, userLocation)}
                      target="_blank"
                      rel="noreferrer"
                      variant="contained"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #0f766e 0%, #0f172a 100%)',
                      }}
                    >
                      How to Arrive
                    </Button>
                  </Stack>
                </Stack>

                {detailLoading && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="#6B7280">
                      Fetching verified details...
                    </Typography>
                  </Stack>
                )}

                <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.8 }}>
                  {selected.description || 'Description not available for this place.'}
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip icon={<LocationOnIcon sx={{ fontSize: '1rem !important' }} />} label={formatLocation(selected)} />
                  {Number(selected?.rating || 0) > 0 && (
                    <Chip icon={<AttractionsIcon sx={{ fontSize: '1rem !important' }} />} label={`${Number(selected.rating).toFixed(1)} / 10`} />
                  )}
                  {selected?.lat != null && selected?.lon != null && (
                    <Chip label={`Coordinates: ${Number(selected.lat).toFixed(3)}, ${Number(selected.lon).toFixed(3)}`} variant="outlined" />
                  )}
                </Stack>

                {nearbyError && <Alert severity="info">{nearbyError}</Alert>}

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.2,
                  }}
                >
                  {renderNearbyList(
                    'Nearby Destinations',
                    <ExploreIcon sx={{ color: '#0f766e' }} fontSize="small" />,
                    nearbyDestinations,
                    'No nearby destination data.'
                  )}
                  {renderNearbyList(
                    'Nearby Hotels',
                    <HotelIcon sx={{ color: '#1d4ed8' }} fontSize="small" />,
                    nearbyHotels,
                    'No nearby hotel data.'
                  )}
                  {renderNearbyList(
                    'Nearby Food',
                    <RestaurantIcon sx={{ color: '#ea580c' }} fontSize="small" />,
                    nearbyFood,
                    'No nearby cafe/restaurant data.'
                  )}
                </Box>

                <Divider />

                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>
                    Ask Travel Assistant (Gemini/OpenRouter)
                  </Typography>
                  <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                    {assistantPromptTemplates.map((text) => (
                      <Chip
                        key={text}
                        label={text}
                        onClick={() => setAssistantPrompt(text)}
                        variant="outlined"
                        clickable
                      />
                    ))}
                  </Stack>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="Ask: best time, how to arrive, budget tips, family-friendly nearby plan"
                      value={assistantPrompt}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={askAssistant}
                      disabled={assistantLoading}
                      sx={{
                        minWidth: 140,
                        textTransform: 'none',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
                      }}
                    >
                      {assistantLoading ? 'Analyzing...' : 'Ask AI'}
                    </Button>
                  </Stack>

                  {assistantError && <Alert severity="warning">{assistantError}</Alert>}

                  {assistantInsight && (
                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)' }}>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {assistantInsight.title || 'AI Destination Brief'}
                          </Typography>
                          {assistantMeta && (
                            <Chip
                              size="small"
                              label={`${assistantMeta.provider}${assistantMeta.aiAvailable ? '' : ' (fallback)'}`}
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7 }}>
                          {assistantInsight.overview}
                        </Typography>
                        {assistantInsight.bestTimeToVisit && (
                          <Typography variant="body2" sx={{ color: '#0f172a' }}>
                            <strong>Best Time:</strong> {assistantInsight.bestTimeToVisit}
                          </Typography>
                        )}
                        {assistantInsight.arrival?.steps?.length > 0 && (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              Arrival Guidance ({assistantInsight.arrival.mode || 'mixed'})
                            </Typography>
                            <Typography variant="caption" color="#475569" sx={{ display: 'block', mb: 0.5 }}>
                              Estimated: {assistantInsight.arrival.estimatedTime || 'Not available'}
                            </Typography>
                            <Stack spacing={0.5}>
                              {assistantInsight.arrival.steps.map((step) => (
                                <Typography key={step} variant="caption" color="#475569">
                                  - {step}
                                </Typography>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}

          <Paper
            elevation={0}
            sx={{
              p: 1.2,
              borderRadius: '14px',
              border: '1px solid rgba(79, 138, 139, 0.18)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              Map and Navigation
            </Typography>
            <Typography variant="caption" color="#64748b" sx={{ display: 'block', mb: 1 }}>
              Use map route planner for exact turn-by-turn travel time and alternate routes.
            </Typography>
            <PremiumDestinationMap
              destinations={mapDestinations}
              center={mapCenter}
              zoom={selected ? 8 : 3}
              hidePlaceImage
              height={470}
              onMarkerClick={(destination) => {
                handleSelectDestination(destination);
              }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
