import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-markercluster/MarkerCluster.css';
import 'leaflet-markercluster/MarkerCluster.Default.css';
import 'leaflet-markercluster/leaflet.markercluster.js';
import { MAP_CONFIG } from '../../config/mapConfig';
import { autocompleteLocation } from '../../services/geocodingService';
import { getMultimodalSuggestion, getRoute } from '../../services/routingService';
import { isUnsplashConfigured, searchUnsplashPlacePhotos } from '../../services/unsplashService';

const DEFAULT_CENTER = { lat: 36.3932, lng: 25.4615 };
const DEFAULT_ZOOM = 2;

const getTilePresets = (provider = 'osm') => {
  const usingOla = provider === 'ola';

  if (usingOla) {
    return {
      light: {
        label: 'Ola Light',
        source: MAP_CONFIG?.TILE_SERVERS?.OLA_Light || MAP_CONFIG?.TILE_SERVERS?.OSM,
      },
      streets: {
        label: 'Ola Streets',
        source: MAP_CONFIG?.TILE_SERVERS?.OLA_Light || MAP_CONFIG?.TILE_SERVERS?.OSM,
      },
      satellite: {
        label: 'Satellite',
        source: MAP_CONFIG?.TILE_SERVERS?.Satellite || MAP_CONFIG?.TILE_SERVERS?.OSM,
      },
      topo: {
        label: 'Topo',
        source: MAP_CONFIG?.TILE_SERVERS?.TopoMap || MAP_CONFIG?.TILE_SERVERS?.OSM,
      },
    };
  }

  return {
    light: { label: 'Light', source: MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light || MAP_CONFIG?.TILE_SERVERS?.OSM },
    streets: { label: 'Streets', source: MAP_CONFIG?.TILE_SERVERS?.OSM || MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light },
    satellite: { label: 'Satellite', source: MAP_CONFIG?.TILE_SERVERS?.Satellite || MAP_CONFIG?.TILE_SERVERS?.OSM },
    topo: { label: 'Topo', source: MAP_CONFIG?.TILE_SERVERS?.TopoMap || MAP_CONFIG?.TILE_SERVERS?.OSM },
  };
};

const PLACE_TYPES = {
  hotel: { label: 'Hotel', color: '#2563eb', chip: 'bg-blue-100 text-blue-700' },
  restaurant: { label: 'Restaurant', color: '#f97316', chip: 'bg-orange-100 text-orange-700' },
  hospital: { label: 'Hospital', color: '#dc2626', chip: 'bg-rose-100 text-rose-700' },
  attraction: { label: 'Attraction', color: '#0f766e', chip: 'bg-teal-100 text-teal-700' },
};

const TRAVEL_MODES = [
  { key: 'driving-car', label: 'Drive' },
  { key: 'foot-walking', label: 'Walk' },
  { key: 'cycling-regular', label: 'Bike' },
];

const getDefaultNavPanelExpanded = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth > 1024;
};

const getRouteProviderLabel = (provider = '') => {
  const normalized = String(provider || '').toLowerCase();
  if (normalized === 'osrm') return 'OSRM Roads';
  if (normalized === 'openrouteservice') return 'OpenRouteService Roads';
  if (normalized === 'estimated') return 'Estimated Path';
  return 'Road Routing';
};

const renderTravelModeIcon = (modeKey) => {
  if (modeKey === 'driving-car') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.2 12.6h13.6l-1.5-4.1a1.6 1.6 0 0 0-1.5-1H8.7c-.7 0-1.3.4-1.5 1l-2 4.1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12.6v2.8c0 .9.7 1.6 1.6 1.6H7m10 0h1.4c.9 0 1.6-.7 1.6-1.6v-2.8M7 17v1.4m10-1.4v1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="14.4" r="1" fill="currentColor" />
        <circle cx="16.5" cy="14.4" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (modeKey === 'foot-walking') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="13.3" cy="4.8" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12.5 7.5l-2.8 3.2 2.1 2.2-1.6 5.4M12.6 10.1l3.4 2.2m-3.4-2.2l-2.3 4.1-4 1.5m6.3-1.5l3.6 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (modeKey === 'cycling-regular') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6.6" cy="16.6" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="16.6" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9h3.3l2.4 5.2h2.3m-4.7-5.2l2.2-2.2m-1.6 7.4l-2.5-5m8.3 0h-3l1.6 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
};

const markerIconCache = new Map();
const simpleIconCache = new Map();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toNumber = (value, fallback = null) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeBearing = (value = 0) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const normalizeRating = (rating) => {
  const parsed = toNumber(rating, 4.2);
  const scaled = parsed > 5 ? parsed / 2 : parsed;
  return Math.max(0, Math.min(5, scaled));
};

const detectPlaceType = (destination) => {
  const source = `${destination?.category || ''} ${destination?.kinds || ''} ${destination?.details || ''}`.toLowerCase();
  if (/(hotel|resort|hostel|lodging|accommodation)/.test(source)) return 'hotel';
  if (/(restaurant|food|cafe|dining|bar)/.test(source)) return 'restaurant';
  if (/(hospital|medical|health|clinic)/.test(source)) return 'hospital';
  return 'attraction';
};

const iconSvgForType = (type) => {
  if (type === 'hotel') {
    return '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="16" rx="2.5" fill="white"/><path d="M8 8h2M12 8h2M8 12h2M12 12h2M8 16h8" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  if (type === 'restaurant') {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M8 4v16M6 4v6M10 4v6M6 10h4M15 4v8c0 1.3 1 2.3 2.3 2.3H18V20" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  if (type === 'hospital') {
    return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" fill="white"/><path d="M12 8v8M8 12h8" stroke="#b91c1c" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.5l2.3 4.7 5.2.7-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.7L12 4.5z" fill="white"/></svg>';
};

const createMarkerIcon = (type) => {
  if (markerIconCache.has(type)) return markerIconCache.get(type);
  const style = PLACE_TYPES[type] || PLACE_TYPES.attraction;
  const icon = L.divIcon({
    className: '',
    iconSize: [44, 56],
    iconAnchor: [22, 46],
    popupAnchor: [0, -34],
    html: `<div class="travel-marker marker-${type}"><span class="travel-marker-ping"></span><div class="travel-marker-main" style="background:${style.color}"><span class="travel-marker-icon">${iconSvgForType(type)}</span></div></div>`,
  });
  markerIconCache.set(type, icon);
  return icon;
};

const createSimplePinIcon = (color, label, key) => {
  const cacheKey = `${key}-${color}-${label}`;
  if (simpleIconCache.has(cacheKey)) return simpleIconCache.get(cacheKey);
  const icon = L.divIcon({
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 34],
    popupAnchor: [0, -26],
    html: `<div class="travel-simple-pin" style="--pin-color:${color}"><div class="travel-simple-pin-core">${escapeHtml(label || '')}</div></div>`,
  });
  simpleIconCache.set(cacheKey, icon);
  return icon;
};

const createPopupMarkup = (place) => {
  const placeType = PLACE_TYPES[place.type] || PLACE_TYPES.attraction;
  const image = escapeHtml(place.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
  const title = escapeHtml(place.name || 'Unknown place');
  const location = escapeHtml([place.city, place.country].filter(Boolean).join(', ') || place.categoryLabel);
  const desc = escapeHtml((place.description || 'Discover this place on your journey.').slice(0, 120));
  const rating = place.rating.toFixed(1);
  return `<article class="travel-popup"><div class="travel-popup-media"><img src="${image}" alt="${title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80'" /><span class="travel-popup-badge" style="background:${placeType.color}">${escapeHtml(placeType.label)}</span></div><div class="travel-popup-body"><h4>${title}</h4><p class="travel-popup-location">${location}</p><div class="travel-popup-rating"><span>&#9733;</span><strong>${rating}</strong><small>/ 5.0</small></div><p class="travel-popup-desc">${desc}${place.description && place.description.length > 120 ? '...' : ''}</p><button type="button" class="js-map-action travel-popup-btn">View Details</button></div></article>`;
};

const hasCoords = (value) => value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lon));
const SEARCH_RESULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=320&q=80';

const inferCountryFromLabel = (label = '') => {
  const parts = String(label || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  return parts[parts.length - 1];
};

const attachSearchResultImages = (suggestions = [], photos = []) =>
  suggestions.map((suggestion, index) => {
    const photo = photos[index];
    return {
      ...suggestion,
      image: photo?.imageUrl || suggestion?.image || SEARCH_RESULT_FALLBACK_IMAGE,
      imageCredit: photo
        ? {
            photographerName: photo.photographerName,
            photographerLink: photo.photographerLink,
          }
        : null,
    };
  });

const getDistanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon ?? from.lng);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon ?? to.lng);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getInstructionMeta = (step) => {
  const normalized = `${step?.text || ''} ${step?.type || ''} ${step?.modifier || ''}`.toLowerCase();
  if (normalized.includes('arrive')) return { symbol: 'ARR', bg: '#dcfce7', fg: '#15803d' };
  if (normalized.includes('depart') || normalized.includes('head')) return { symbol: 'GO', bg: '#e0f2fe', fg: '#0369a1' };
  if (normalized.includes('roundabout')) return { symbol: 'RDB', bg: '#fef3c7', fg: '#b45309' };
  if (normalized.includes('u-turn') || normalized.includes('uturn')) return { symbol: 'U', bg: '#ffe4e6', fg: '#be123c' };
  if (normalized.includes('left')) return { symbol: 'L', bg: '#e0e7ff', fg: '#4338ca' };
  if (normalized.includes('right')) return { symbol: 'R', bg: '#ede9fe', fg: '#6d28d9' };
  return { symbol: 'FWD', bg: '#e2e8f0', fg: '#334155' };
};

const getNearestInstructionIndex = (instructions, currentLocation) => {
  if (!Array.isArray(instructions) || instructions.length === 0 || !hasCoords(currentLocation)) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  instructions.forEach((step, index) => {
    const target = step?.toCoord || step?.fromCoord;
    if (!Array.isArray(target) || target.length < 2) return;
    const distance = getDistanceMeters(currentLocation, { lat: target[0], lon: target[1] });
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const simplifyPolylineWaypoints = (waypoints, maxPoints = 900) => {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return [];
  if (waypoints.length <= maxPoints) return waypoints;
  const step = Math.ceil(waypoints.length / maxPoints);
  const reduced = [];
  for (let index = 0; index < waypoints.length; index += step) {
    reduced.push(waypoints[index]);
  }
  const last = waypoints[waypoints.length - 1];
  const tail = reduced[reduced.length - 1];
  if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) {
    reduced.push(last);
  }
  return reduced;
};

const getTileCandidates = (activeTileKey, tilePresets) => {
  const primary = tilePresets[activeTileKey];
  const candidates = [
    primary?.source
      ? {
          ...primary.source,
          _label: primary.label || 'Primary',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.OSM
      ? {
          ...MAP_CONFIG.TILE_SERVERS.OSM,
          _label: 'OpenStreetMap',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light
      ? {
          ...MAP_CONFIG.TILE_SERVERS.CartoDB_Light,
          _label: 'Carto Light',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.OLA_Light
      ? {
          ...MAP_CONFIG.TILE_SERVERS.OLA_Light,
          _label: 'Ola Light',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.TopoMap
      ? {
          ...MAP_CONFIG.TILE_SERVERS.TopoMap,
          _label: 'Topo',
        }
      : null,
  ].filter((item) => item?.url);

  const unique = [];
  const seen = new Set();
  candidates.forEach((item) => {
    if (seen.has(item.url)) return;
    seen.add(item.url);
    unique.push(item);
  });
  return unique;
};

const createPoiClusterLayer = () => {
  const clusterOptions = {
    maxClusterRadius: 56,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    spiderfyDistanceMultiplier: 1.18,
    iconCreateFunction: (cluster) =>
      L.divIcon({
        className: 'travel-cluster-shell',
        html: `<div class="travel-cluster"><span>${cluster.getChildCount()}</span></div>`,
        iconSize: [44, 44],
      }),
  };

  if (typeof L.markerClusterGroup === 'function') {
    return L.markerClusterGroup(clusterOptions);
  }

  // Fallback for cluster plugin mismatch.
  return L.layerGroup();
};

const PremiumDestinationMap = ({
  destinations = [],
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMarkerClick = null,
  mapProvider = 'osm',
  hidePlaceImage = false,
  height = 640,
}) => {
  const normalizedProvider = String(mapProvider || 'osm').toLowerCase();
  const tilePresets = useMemo(() => getTilePresets(normalizedProvider), [normalizedProvider]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markerRefs = useRef(new Map());
  const fitBoundsDoneRef = useRef(false);
  const fromSearchTimerRef = useRef(null);
  const toSearchTimerRef = useRef(null);
  const rotateGestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startBearing: 0,
  });
  const mapBearingRef = useRef(0);
  const onMarkerClickRef = useRef(onMarkerClick);
  const liveWatchRef = useRef(null);
  const lastLiveRouteRef = useRef({ at: 0, location: null });
  const hasLiveFixRef = useRef(false);
  const isRoutingRef = useRef(false);
  const routeDestinationRef = useRef(null);
  const routeSummaryRef = useRef(null);
  const routeCandidatesRef = useRef([]);

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [isBearingDragging, setIsBearingDragging] = useState(false);
  const [activeTile, setActiveTile] = useState('streets');
  const [activeTileSource, setActiveTileSource] = useState(tilePresets?.streets?.label || 'Streets');
  const [mapViewMode, setMapViewMode] = useState('2d');
  const [tileLoadError, setTileLoadError] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSearchResults, setFromSearchResults] = useState([]);
  const [toSearchResults, setToSearchResults] = useState([]);
  const [isSearchingFrom, setIsSearchingFrom] = useState(false);
  const [isSearchingTo, setIsSearchingTo] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [manualOrigin, setManualOrigin] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeMode, setRouteMode] = useState('driving-car');
  const [routePreference, setRoutePreference] = useState('recommended');
  const [trafficMode, setTrafficMode] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeSummary, setRouteSummary] = useState(null);
  const [multimodalPlan, setMultimodalPlan] = useState(null);
  const [routeCandidates, setRouteCandidates] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLiveNavigation, setIsLiveNavigation] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState('');
  const [activeInstructionIndex, setActiveInstructionIndex] = useState(0);
  const [routePanelExpanded, setRoutePanelExpanded] = useState(getDefaultNavPanelExpanded);
  const [mapOptionsOpen, setMapOptionsOpen] = useState(false);
  const [placesPanelOpen, setPlacesPanelOpen] = useState(false);

  const normalizedDestinations = useMemo(() => (destinations || [])
    .map((destination, index) => {
      const lat = toNumber(destination?.lat ?? destination?.latitude, null);
      const lon = toNumber(destination?.lon ?? destination?.lng ?? destination?.longitude, null);
      if (lat === null || lon === null) return null;
      const type = detectPlaceType(destination);
      const id = destination?.xid || destination?._id || `${destination?.name || 'place'}-${index}`;
      const category = destination?.category || destination?.kinds || destination?.details?.kinds || 'Travel place';
      return {
        ...destination,
        id,
        lat,
        lon,
        type,
        rating: normalizeRating(destination?.rating),
        categoryLabel: category,
        name: destination?.name || 'Unknown place',
        description: destination?.description || destination?.details?.description || 'A beautiful place to explore.',
        city: destination?.city || destination?.address?.city || '',
        country: destination?.country || destination?.address?.country || '',
        image: destination?.image || destination?.details?.image || '',
      };
    })
    .filter(Boolean), [destinations]);

  const visibleDestinations = normalizedDestinations;

  const placeTypeSummary = useMemo(() => {
    const summary = Object.entries(PLACE_TYPES).map(([key, value]) => ({
      key,
      label: value.label,
      color: value.color,
      count: 0,
    }));
    const summaryByType = summary.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});

    visibleDestinations.forEach((place) => {
      const typeKey = PLACE_TYPES[place.type] ? place.type : 'attraction';
      if (summaryByType[typeKey]) summaryByType[typeKey].count += 1;
    });

    return summary.filter((item) => item.count > 0);
  }, [visibleDestinations]);

  const routeDestination = hasCoords(searchedLocation)
    ? searchedLocation
    : (selectedPlace
      ? {
          name: selectedPlace.name,
          lat: selectedPlace.lat,
          lon: selectedPlace.lon,
          country: selectedPlace.country || '',
        }
      : null);
  const routeOrigin = hasCoords(manualOrigin)
    ? manualOrigin
    : (hasCoords(userLocation)
      ? userLocation
      : {
          name: 'Map center',
          lat: mapRef.current?.getCenter()?.lat ?? toNumber(center?.lat, DEFAULT_CENTER.lat),
          lon: mapRef.current?.getCenter()?.lng ?? toNumber(center?.lng, DEFAULT_CENTER.lng),
        });

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    routeDestinationRef.current = routeDestination;
  }, [routeDestination]);

  useEffect(() => {
    routeSummaryRef.current = routeSummary;
  }, [routeSummary]);

  useEffect(() => {
    routeCandidatesRef.current = routeCandidates;
  }, [routeCandidates]);

  useEffect(() => {
    mapBearingRef.current = mapBearing;
  }, [mapBearing]);

  useEffect(() => {
    if (tilePresets[activeTile]) return;
    setActiveTile('streets');
  }, [tilePresets, activeTile]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.classList.toggle('travel-map-3d', mapViewMode === '3d');
    mapRef.current?.invalidateSize();
  }, [mapViewMode, activeTile, tilePresets]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const markerRefsSnapshot = markerRefs.current;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      preferCanvas: true,
      attributionControl: false,
      worldCopyJump: true,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([toNumber(center?.lat, DEFAULT_CENTER.lat), toNumber(center?.lng, DEFAULT_CENTER.lng)], toNumber(zoom, DEFAULT_ZOOM));

    mapRef.current = map;
    poiLayerRef.current = createPoiClusterLayer().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    overlayLayerRef.current = L.layerGroup().addTo(map);
    L.control.attribution({ prefix: false }).addTo(map);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    const resizeTimer = window.setTimeout(() => {
      if (mapRef.current && mapRef.current._container) {
        mapRef.current.invalidateSize();
      }
    }, 80);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      if (fromSearchTimerRef.current) clearTimeout(fromSearchTimerRef.current);
      if (toSearchTimerRef.current) clearTimeout(toSearchTimerRef.current);
      if (liveWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(liveWatchRef.current);
        liveWatchRef.current = null;
      }
      markerRefsSnapshot.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const stopBearingDrag = () => {
      if (!rotateGestureRef.current.active) return;
      rotateGestureRef.current.active = false;
      setIsBearingDragging(false);
    };

    const handlePointerDown = (event) => {
      // Right mouse drag rotates map bearing similar to Google Maps desktop interaction.
      if (event.button !== 2) return;
      rotateGestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        startBearing: mapBearingRef.current,
      };
      setIsBearingDragging(true);
      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      if (!rotateGestureRef.current.active) return;
      const deltaX = event.clientX - rotateGestureRef.current.startX;
      const deltaY = event.clientY - rotateGestureRef.current.startY;
      const nextBearing = normalizeBearing(
        rotateGestureRef.current.startBearing + (deltaX * 0.3) + (deltaY * 0.07)
      );
      setMapBearing(nextBearing);
      event.preventDefault();
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', stopBearingDrag);
    window.addEventListener('pointercancel', stopBearingDrag);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopBearingDrag);
      window.removeEventListener('pointercancel', stopBearingDrag);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const candidates = getTileCandidates(activeTile, tilePresets);
    if (!candidates.length) return;

    let cancelled = false;
    let currentLayer = null;

    setTileLoadError('');
    setActiveTileSource(tilePresets[activeTile]?.label || 'Streets');

    const mountTileLayer = (candidateIndex) => {
      if (cancelled) return;
      if (candidateIndex >= candidates.length) {
        setTileLoadError('Unable to load map tiles. Please check network/firewall and try again.');
        return;
      }

      const source = candidates[candidateIndex];
      let tileErrors = 0;
      let switched = false;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      const layer = L.tileLayer(source.url, {
        attribution: source.attribution || 'OpenStreetMap contributors',
        maxZoom: source.maxZoom || 19,
        minZoom: source.minZoom || 2,
        opacity: 0.95,
      });

      layer.on('tileload', () => {
        if (cancelled) return;
        setTileLoadError('');
        setActiveTileSource(source._label || 'Map');
      });

      layer.on('tileerror', () => {
        if (cancelled) return;
        if (switched) return;
        tileErrors += 1;
        if (tileErrors < 6) return;
        switched = true;
        setTileLoadError(`Tile source blocked. Switching from ${source._label}...`);
        mountTileLayer(candidateIndex + 1);
      });

      layer.addTo(map);
      currentLayer = layer;
      tileLayerRef.current = layer;
    };

    mountTileLayer(0);

    return () => {
      cancelled = true;
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
      }
    };
  }, [activeTile, tilePresets]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([toNumber(center?.lat, DEFAULT_CENTER.lat), toNumber(center?.lng, DEFAULT_CENTER.lng)], toNumber(zoom, DEFAULT_ZOOM), { animate: true, duration: 0.6 });
  }, [center?.lat, center?.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = poiLayerRef.current;
    if (!map || !layer) return;
    let cancelled = false;

    const render = async () => {
      if (visibleDestinations.length === 0) {
        layer.clearLayers();
        markerRefs.current.clear();
        fitBoundsDoneRef.current = false;
        setActiveMarkerId(null);
        setIsLoadingMarkers(false);
        return;
      }

      setIsLoadingMarkers(true);
      layer.clearLayers();
      markerRefs.current.clear();
      fitBoundsDoneRef.current = false;
      const chunkSize = 50;
      for (let i = 0; i < visibleDestinations.length; i += chunkSize) {
        if (cancelled) return;
        visibleDestinations.slice(i, i + chunkSize).forEach((place) => {
          const marker = L.marker([place.lat, place.lon], { icon: createMarkerIcon(place.type), riseOnHover: true, keyboard: false });
          marker.bindPopup(createPopupMarkup(place), { className: 'travel-popup-shell', closeButton: false, maxWidth: 320, offset: [0, -22] });
          marker.on('click', () => {
            setSelectedPlace(place);
            setToQuery(place.name || '');
            setToSearchResults([]);
            setSearchedLocation({ name: place.name, lat: place.lat, lon: place.lon });
            setPanelOpen(true);
            setActiveMarkerId(place.id);
          });
          marker.on('popupopen', (event) => {
            const detailsBtn = event?.popup?.getElement()?.querySelector('.js-map-action');
            if (detailsBtn) {
              detailsBtn.onclick = (buttonEvent) => {
                buttonEvent.preventDefault();
                setSelectedPlace(place);
                setToQuery(place.name || '');
                setToSearchResults([]);
                setSearchedLocation({ name: place.name, lat: place.lat, lon: place.lon });
                setPanelOpen(true);
                setActiveMarkerId(place.id);
                if (typeof onMarkerClickRef.current === 'function') onMarkerClickRef.current(place);
              };
            }
          });
          marker.addTo(layer);
          markerRefs.current.set(place.id, marker);
        });
        if (i + chunkSize < visibleDestinations.length) await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (!cancelled && visibleDestinations.length > 0 && !fitBoundsDoneRef.current) {
        const bounds = L.latLngBounds(visibleDestinations.map((place) => [place.lat, place.lon]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 0.7 });
        fitBoundsDoneRef.current = true;
      }
      setTimeout(() => {
        if (!cancelled) setIsLoadingMarkers(false);
      }, 220);
    };

    render();
    return () => {
      cancelled = true;
      setIsLoadingMarkers(false);
    };
  }, [visibleDestinations]);

  useEffect(() => {
    markerRefs.current.forEach((marker, id) => {
      const element = marker.getElement();
      if (element) element.classList.toggle('is-active', id === activeMarkerId);
    });
  }, [activeMarkerId, visibleDestinations.length]);

  useEffect(() => {
    if (fromSearchTimerRef.current) clearTimeout(fromSearchTimerRef.current);
    const query = fromQuery.trim();
    if (query.length < 2) {
      setFromSearchResults([]);
      setIsSearchingFrom(false);
      return;
    }
    const normalizedQuery = query.toLowerCase();
    const originName = String(manualOrigin?.name || '').toLowerCase();
    const originLabel = String(manualOrigin?.label || '').toLowerCase();
    if (hasCoords(manualOrigin) && (originName === normalizedQuery || originLabel === normalizedQuery)) {
      setFromSearchResults([]);
      setIsSearchingFrom(false);
      return;
    }
    setIsSearchingFrom(true);
    fromSearchTimerRef.current = setTimeout(async () => {
      try {
        const [response, photos] = await Promise.all([
          autocompleteLocation(query, { limit: 6 }),
          isUnsplashConfigured() ? searchUnsplashPlacePhotos(query, 6) : Promise.resolve([]),
        ]);
        const suggestions = response?.success ? response.suggestions || [] : [];
        setFromSearchResults(attachSearchResultImages(suggestions, photos));
      } catch {
        setFromSearchResults([]);
      } finally {
        setIsSearchingFrom(false);
      }
    }, 260);
    return () => {
      if (fromSearchTimerRef.current) clearTimeout(fromSearchTimerRef.current);
    };
  }, [fromQuery]);

  useEffect(() => {
    if (toSearchTimerRef.current) clearTimeout(toSearchTimerRef.current);
    const query = toQuery.trim();
    if (query.length < 2) {
      setToSearchResults([]);
      setIsSearchingTo(false);
      return;
    }
    const normalizedQuery = query.toLowerCase();
    const destinationName = String(searchedLocation?.name || '').toLowerCase();
    const destinationLabel = String(searchedLocation?.label || '').toLowerCase();
    if (hasCoords(searchedLocation) && (destinationName === normalizedQuery || destinationLabel === normalizedQuery)) {
      setToSearchResults([]);
      setIsSearchingTo(false);
      return;
    }
    setIsSearchingTo(true);
    toSearchTimerRef.current = setTimeout(async () => {
      try {
        const [response, photos] = await Promise.all([
          autocompleteLocation(query, { limit: 6 }),
          isUnsplashConfigured() ? searchUnsplashPlacePhotos(query, 6) : Promise.resolve([]),
        ]);
        const suggestions = response?.success ? response.suggestions || [] : [];
        setToSearchResults(attachSearchResultImages(suggestions, photos));
      } catch {
        setToSearchResults([]);
      } finally {
        setIsSearchingTo(false);
      }
    }, 260);
    return () => {
      if (toSearchTimerRef.current) clearTimeout(toSearchTimerRef.current);
    };
  }, [toQuery]);

  useEffect(() => {
    const layer = overlayLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (hasCoords(searchedLocation)) {
      L.marker([searchedLocation.lat, searchedLocation.lon], { icon: createSimplePinIcon('#0f172a', 'S', 'search') }).addTo(layer);
    }
    if (hasCoords(userLocation)) {
      L.marker([userLocation.lat, userLocation.lon], { icon: createSimplePinIcon('#0ea5e9', 'ME', 'me') }).addTo(layer);
    }
  }, [searchedLocation, userLocation]);

  useEffect(() => {
    if (!routeSummary?.instructions?.length || !hasCoords(userLocation)) return;
    setActiveInstructionIndex(getNearestInstructionIndex(routeSummary.instructions, userLocation));
  }, [routeSummary, userLocation?.lat, userLocation?.lon]);

  const revealMarker = (marker, callback) => {
    const layer = poiLayerRef.current;
    if (layer && typeof layer.zoomToShowLayer === 'function') {
      layer.zoomToShowLayer(marker, callback);
      return;
    }
    if (typeof callback === 'function') callback();
  };

  const focusInstructionStep = (step) => {
    const target = step?.toCoord || step?.fromCoord;
    if (!Array.isArray(target) || target.length < 2 || !mapRef.current) return;
    mapRef.current.flyTo([target[0], target[1]], Math.max(15, mapRef.current.getZoom()), {
      animate: true,
      duration: 0.55,
    });
  };

  const clearRoute = () => {
    routeLayerRef.current?.clearLayers();
    if (liveWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }
    setRouteSummary(null);
    setMultimodalPlan(null);
    setRouteCandidates([]);
    setSelectedRouteId(0);
    setRouteError('');
    setIsLiveNavigation(false);
    setNavigationStatus('');
    setActiveInstructionIndex(0);
    hasLiveFixRef.current = false;
    lastLiveRouteRef.current = { at: 0, location: null };
    setShowInstructions(true);
  };

  const handleFromSelect = (suggestion) => {
    const lat = toNumber(suggestion?.lat, null);
    const lon = toNumber(suggestion?.lng, null);
    if (lat === null || lon === null) return;
    const selected = {
      name: suggestion?.name || suggestion?.label || 'Starting point',
      label: suggestion?.label || '',
      lat,
      lon,
      country: inferCountryFromLabel(suggestion?.label),
      image: suggestion?.image || '',
      imageCredit: suggestion?.imageCredit || null,
    };
    setFromQuery(selected.name || '');
    setFromSearchResults([]);
    setManualOrigin(selected);
    setNavigationStatus('Starting point updated');
    setRouteError('');
    mapRef.current?.flyTo([lat, lon], Math.max(12, mapRef.current.getZoom()), { animate: true, duration: 0.6 });
  };

  const handleToSelect = (suggestion) => {
    const lat = toNumber(suggestion?.lat, null);
    const lon = toNumber(suggestion?.lng, null);
    if (lat === null || lon === null) return;
    const selected = {
      name: suggestion?.name || suggestion?.label || 'Destination',
      label: suggestion?.label || '',
      lat,
      lon,
      country: inferCountryFromLabel(suggestion?.label),
      image: suggestion?.image || '',
      imageCredit: suggestion?.imageCredit || null,
    };
    setToQuery(selected.name || '');
    setToSearchResults([]);
    setSearchedLocation(selected);
    setSelectedPlace(null);
    setNavigationStatus('Destination updated');
    setRouteError('');
    mapRef.current?.flyTo([lat, lon], Math.max(12, mapRef.current.getZoom()), { animate: true, duration: 0.6 });
  };

  const handleSwapRoutePoints = () => {
    if (!hasCoords(manualOrigin) && !hasCoords(routeDestination)) return;
    const currentOrigin = hasCoords(manualOrigin) ? { ...manualOrigin } : null;
    const currentDestination = hasCoords(routeDestination) ? { ...routeDestination } : null;
    if (currentDestination) {
      setManualOrigin(currentDestination);
      setFromQuery(currentDestination.name || '');
    }
    if (currentOrigin) {
      setSearchedLocation(currentOrigin);
      setToQuery(currentOrigin.name || '');
      setSelectedPlace(null);
    } else if (!currentDestination) {
      setSearchedLocation(null);
      setToQuery('');
    }
    setNavigationStatus('Swapped From and To');
  };

  const resolveLocationFromText = async (query, fallbackName) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return null;
    try {
      const response = await autocompleteLocation(normalizedQuery, { limit: 1 });
      const firstMatch = response?.success ? (response.suggestions || [])[0] : null;
      const lat = toNumber(firstMatch?.lat, null);
      const lon = toNumber(firstMatch?.lng, null);
      if (lat === null || lon === null) return null;
      return {
        name: firstMatch?.name || firstMatch?.label || fallbackName || normalizedQuery,
        label: firstMatch?.label || '',
        lat,
        lon,
        country: inferCountryFromLabel(firstMatch?.label),
      };
    } catch {
      return null;
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { name: 'Your location', lat: Number(position.coords.latitude), lon: Number(position.coords.longitude) };
        setUserLocation(loc);
        setManualOrigin(loc);
        setFromQuery('Your location');
        setRouteError('');
        setNavigationStatus('Using current location as start');
        mapRef.current?.flyTo([loc.lat, loc.lon], Math.max(12, mapRef.current.getZoom()), { animate: true, duration: 0.6 });
      },
      () => setRouteError('Unable to detect current location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const drawRouteOnMap = (routes, selectedId, fitToRoute = true) => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer || !Array.isArray(routes) || routes.length === 0) return;

    routeLayer.clearLayers();
    const selectedRoute = routes.find((route) => route.id === selectedId) || routes[0];
    if (!selectedRoute?.waypoints?.length) return;

    routes
      .filter((route) => route.id !== selectedRoute.id)
      .forEach((route) => {
        if (!route?.waypoints?.length) return;
        const alternativeCoordinates = simplifyPolylineWaypoints(route.waypoints, 1400);
        L.polyline(alternativeCoordinates, {
          color: '#64748b',
          weight: 4,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '10 10',
        }).addTo(routeLayer);
      });

    const activeCoordinates = simplifyPolylineWaypoints(selectedRoute.waypoints, 6000);
    const outerLine = L.polyline(activeCoordinates, { color: '#0f172a', weight: 8, opacity: 0.22, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    L.polyline(activeCoordinates, { color: '#14b8a6', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    L.polyline(activeCoordinates, { color: '#ffffff', weight: 2, opacity: 0.48, dashArray: '10 10' }).addTo(routeLayer);
    L.marker(activeCoordinates[0], { icon: createSimplePinIcon('#16a34a', 'A', 'origin') }).addTo(routeLayer);
    L.marker(activeCoordinates[activeCoordinates.length - 1], { icon: createSimplePinIcon('#dc2626', 'B', 'destination') }).addTo(routeLayer);

    if (fitToRoute) {
      mapRef.current?.fitBounds(outerLine.getBounds(), { padding: [60, 60], maxZoom: 14, animate: true, duration: 0.7 });
    }
  };

  const selectAlternativeRoute = (routeId, options = {}) => {
    const { fitToRoute = false } = options;
    const routes = routeCandidatesRef.current;
    const selectedRoute = routes.find((route) => route.id === routeId);
    const currentSummary = routeSummaryRef.current;
    if (!selectedRoute || !currentSummary) return;

    drawRouteOnMap(routes, routeId, fitToRoute);
    setSelectedRouteId(routeId);
    const instructions = selectedRoute.instructions || [];
    setActiveInstructionIndex(getNearestInstructionIndex(instructions, routeOrigin));
    setRouteSummary({
      ...currentSummary,
      distanceKM: selectedRoute.distanceKM,
      durationHM: selectedRoute.durationHM,
      instructions,
      selectedRouteId: routeId,
      lastUpdatedAt: Date.now(),
    });
  };

  const calculateRoute = async (destinationOverride = null, originOverride = null, options = {}) => {
    const { fitToRoute = true } = options;
    let target = destinationOverride || routeDestination;
    if (!hasCoords(target) && toQuery.trim().length >= 2) {
      const resolvedDestination = await resolveLocationFromText(toQuery, 'Destination');
      if (resolvedDestination) {
        target = resolvedDestination;
        setSearchedLocation(resolvedDestination);
        setSelectedPlace(null);
      }
    }
    if (!hasCoords(target)) {
      setRouteError('Enter or select a destination first.');
      return false;
    }

    let origin = originOverride || routeOrigin;
    if (!originOverride && !hasCoords(manualOrigin) && fromQuery.trim().length >= 2) {
      const resolvedOrigin = await resolveLocationFromText(fromQuery, 'Starting point');
      if (resolvedOrigin) {
        origin = resolvedOrigin;
        setManualOrigin(resolvedOrigin);
      }
    }

    setIsRouting(true);
    isRoutingRef.current = true;
    setRouteError('');
    setMultimodalPlan(null);
    setRouteSummary(null);
    setRouteCandidates([]);
    try {
      const effectivePreference = trafficMode ? 'fastest' : routePreference;
      const routeResponse = await getRoute(
        [[origin.lat, origin.lon], [target.lat, target.lon]],
        {
          profile: routeMode,
          noAlternatives: true,
          color: '#0f766e',
          provider: 'auto',
          allowEstimatedFallback: false,
          allowEstimatedFallbackAnyDistance: false,
          routeOptions: { preference: effectivePreference },
          originCountry: origin.country || '',
          destinationCountry: target.country || '',
        }
      );
      const routes = routeResponse?.routes || [];
      const mainRoute = routes[0];
      if (!mainRoute?.waypoints?.length) {
        setRouteError('No route found for this selection.');
        return false;
      }

      if (routeResponse?.provider === 'estimated') {
        setRouteError('Road route data is unavailable for this trip right now. Please try another start/end pair.');
        return false;
      }

      setRouteCandidates(routes);
      setSelectedRouteId(mainRoute.id);
      drawRouteOnMap(routes, mainRoute.id, fitToRoute);

      const instructions = mainRoute.instructions || [];
      const instructionIndex = getNearestInstructionIndex(instructions, origin);
      setActiveInstructionIndex(instructionIndex);
      setRouteSummary({
        distanceKM: mainRoute.distanceKM,
        durationHM: mainRoute.durationHM,
        origin,
        destination: target,
        instructions,
        provider: routeResponse?.provider || 'routing',
        preference: effectivePreference,
        alternativesCount: routes.length,
        selectedRouteId: mainRoute.id,
        lastUpdatedAt: Date.now(),
      });
      setShowInstructions(true);
      return true;
    } catch (error) {
      const rawMessage = (error?.error || error?.message || '').toLowerCase();
      if (
        rawMessage.includes('no direct road route found') ||
        rawMessage.includes('did not return a route') ||
        rawMessage.includes('could not find routable point')
      ) {
        const suggestion = getMultimodalSuggestion(
          origin,
          target,
          {
            profile: routeMode,
            originCountry: origin.country || '',
            destinationCountry: target.country || '',
          }
        );
        setMultimodalPlan(suggestion);
        setRouteError(
          'No continuous road route is available for this trip. Use flight/ferry for the long leg, then route locally from arrival city.'
        );
      } else {
        setMultimodalPlan(null);
        setRouteError(error?.error || error?.message || 'Route calculation failed. Please check your network.');
      }
      return false;
    } finally {
      setIsRouting(false);
      isRoutingRef.current = false;
    }
  };

  const stopLiveNavigation = () => {
    if (liveWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }
    hasLiveFixRef.current = false;
    setIsLiveNavigation(false);
    setNavigationStatus('Live navigation stopped');
  };

  const startLiveNavigation = () => {
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported in this browser.');
      return;
    }

    const target = routeDestinationRef.current;
    if (!hasCoords(target)) {
      setRouteError('Select destination first, then start live navigation.');
      return;
    }

    if (liveWatchRef.current !== null) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }

    lastLiveRouteRef.current = { at: 0, location: null };
    hasLiveFixRef.current = false;
    setIsLiveNavigation(true);
    setNavigationStatus('Connecting to GPS...');
    setRouteError('');

    liveWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const currentLoc = {
          name: 'Your location',
          lat: Number(position.coords.latitude),
          lon: Number(position.coords.longitude),
        };

        setUserLocation(currentLoc);

        if (!hasLiveFixRef.current) {
          hasLiveFixRef.current = true;
          mapRef.current?.flyTo([currentLoc.lat, currentLoc.lon], Math.max(14, mapRef.current?.getZoom() || 14), { animate: true, duration: 0.7 });
        }

        const now = Date.now();
        const last = lastLiveRouteRef.current;
        const movedMeters = last?.location ? getDistanceMeters(last.location, currentLoc) : Number.POSITIVE_INFINITY;
        const shouldReroute = now - (last?.at || 0) > 12000 || movedMeters > 35 || !routeSummaryRef.current;

        if (shouldReroute && !isRoutingRef.current) {
          lastLiveRouteRef.current = { at: now, location: currentLoc };
          const liveTarget = routeDestinationRef.current;
          if (!hasCoords(liveTarget)) return;
          const success = await calculateRoute(liveTarget, currentLoc, { fitToRoute: false });
          if (success) {
            setNavigationStatus('Live navigation active');
          }
        }
      },
      () => {
        stopLiveNavigation();
        setRouteError('Unable to track live location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  };

  useEffect(() => {
    if (!routeSummary || isRouting || isLiveNavigation) return;
    if (!hasCoords(routeDestination)) return;

    const rerouteTimer = setTimeout(() => {
      calculateRoute(routeDestination, routeOrigin, { fitToRoute: false });
    }, 120);

    return () => clearTimeout(rerouteTimer);
  }, [routeMode, routePreference, trafficMode]);

  const activeInstruction = routeSummary?.instructions?.[activeInstructionIndex] || null;
  const containerHeight =
    typeof height === 'number'
      ? `${height}px`
      : (String(height || '').trim() || '640px');

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
      style={{ height: containerHeight }}
    >
      <style>{`
        .travel-marker{position:relative;width:44px;height:56px;display:flex;align-items:center;justify-content:center}
        .travel-marker-main{width:38px;height:38px;border-radius:9999px;border:3px solid #fff;box-shadow:0 12px 24px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;transition:transform .22s ease,box-shadow .22s ease}
        .travel-marker-icon{width:19px;height:19px;display:inline-flex}.travel-marker-icon svg{width:100%;height:100%;display:block}
        .travel-marker-ping{position:absolute;top:9px;width:38px;height:38px;border-radius:9999px;opacity:.28;background:rgba(15,23,42,.25);animation:travel-ping 2s cubic-bezier(0,0,.2,1) infinite}
        .travel-marker:hover .travel-marker-main,.travel-marker.is-active .travel-marker-main{transform:translateY(-6px) scale(1.08);box-shadow:0 16px 30px rgba(15,23,42,.34)}
        .travel-simple-pin{position:relative;width:28px;height:38px;display:flex;align-items:flex-start;justify-content:center}
        .travel-simple-pin::before{content:'';position:absolute;top:0;width:24px;height:24px;border-radius:999px;background:var(--pin-color);border:2px solid #fff;box-shadow:0 8px 16px rgba(2,6,23,.28)}
        .travel-simple-pin::after{content:'';position:absolute;bottom:0;width:12px;height:12px;background:var(--pin-color);transform:rotate(45deg);border-bottom-right-radius:3px}
        .travel-simple-pin-core{position:relative;z-index:1;margin-top:5px;font-size:9px;color:#fff;font-weight:800}
        .travel-popup-shell .leaflet-popup-content-wrapper{border-radius:18px !important;padding:0 !important;overflow:hidden;box-shadow:0 24px 50px rgba(15,23,42,.28) !important}
        .travel-popup-shell .leaflet-popup-content{margin:0 !important;width:300px !important}.travel-popup{background:#fff}.travel-popup-media{position:relative;height:140px;background:#e2e8f0}
        .travel-popup-media img{width:100%;height:100%;object-fit:cover;display:block}.travel-popup-badge{position:absolute;left:10px;top:10px;color:#fff;font-size:11px;font-weight:700;border-radius:9999px;padding:4px 10px}
        .travel-popup-body{padding:12px}.travel-popup h4{margin:0 0 4px;font-size:15px;color:#0f172a;font-weight:700}.travel-popup-location{margin:0;color:#64748b;font-size:12px}
        .travel-popup-rating{margin-top:8px;display:inline-flex;align-items:baseline;gap:6px}.travel-popup-rating span{color:#f59e0b}.travel-popup-desc{margin:8px 0 12px;color:#334155;font-size:12px}
        .travel-popup-btn{border:0;width:100%;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#0f766e,#0f172a)}
        .travel-cluster-shell{background:transparent;border:0}
        .travel-cluster{width:44px;height:44px;border-radius:9999px;border:3px solid #fff;background:radial-gradient(circle at 30% 30%,#14b8a6,#0f766e);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 22px rgba(15,118,110,.38)}
        .travel-cluster span{color:#fff;font-size:12px;font-weight:800;line-height:1}
        .travel-map-3d .leaflet-tile-pane,.travel-map-3d .leaflet-overlay-pane{transform-origin:center bottom;transform:perspective(1400px) rotateX(56deg) scale(1.18) translateY(-90px)}
        .travel-map-3d .leaflet-marker-pane,.travel-map-3d .leaflet-popup-pane{transform:none !important}
        .travel-map-3d .leaflet-control-container{opacity:.96}
        @keyframes travel-ping{0%{transform:scale(1);opacity:.25}80%,100%{transform:scale(1.65);opacity:0}}
        .travel-map-left-panel{width:min(420px,calc(100% - 420px));display:flex;flex-direction:column;gap:12px}
        .travel-ui-card{border-radius:22px;border:1px solid rgba(255,255,255,.72);background:linear-gradient(145deg,rgba(255,255,255,.96) 0%,rgba(247,250,252,.93) 55%,rgba(241,245,249,.9) 100%);padding:14px;box-shadow:0 26px 50px rgba(15,23,42,.3);backdrop-filter:blur(14px)}
        .travel-ui-header{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .travel-ui-header-actions{display:flex;align-items:center;gap:8px}
        .travel-ui-stat{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:rgba(15,23,42,.08);padding:6px 11px;font-size:11px;font-weight:700;color:#334155;letter-spacing:.02em}
        .travel-ui-locate{border:1px solid rgba(148,163,184,.5);background:#fff;color:#0f172a;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-ui-locate:hover{background:#f8fafc;transform:translateY(-1px)}
        .travel-ui-toggle{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
        .travel-ui-toggle-btn{border:1px solid transparent;background:rgba(148,163,184,.14);border-radius:12px;padding:8px 10px;font-size:11px;font-weight:700;color:#334155;cursor:pointer;transition:all .2s ease}
        .travel-ui-toggle-btn.is-active{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 10px 22px rgba(15,23,42,.28)}
        .travel-ui-search-wrap{position:relative;margin-top:10px}
        .travel-ui-search-input{width:100%;border-radius:14px;border:1px solid rgba(148,163,184,.46);background:#fff;padding:11px 86px 11px 36px;font-size:14px;color:#0f172a;outline:none;transition:all .2s ease}
        .travel-ui-search-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(20,184,166,.16)}
        .travel-ui-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:#64748b}
        .travel-ui-search-icon svg{width:100%;height:100%;display:block}
        .travel-ui-search-state{pointer-events:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);border-radius:999px;padding:3px 9px;font-size:10px;font-weight:700;color:#0f766e;background:rgba(20,184,166,.12)}
        .travel-ui-search-state.is-searching{background:rgba(15,23,42,.13);color:#334155}
        .travel-ui-results{margin-top:10px;max-height:220px;overflow:auto;border-radius:14px;border:1px solid rgba(148,163,184,.36);background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.12)}
        .travel-ui-result-item{display:flex;width:100%;align-items:center;gap:10px;padding:8px 10px;text-align:left;border:0;border-bottom:1px solid rgba(226,232,240,.92);background:#fff;cursor:pointer;transition:background .16s ease}
        .travel-ui-result-item:last-child{border-bottom:0}
        .travel-ui-result-item:hover{background:#f8fafc}
        .travel-ui-result-thumb{width:54px;height:38px;border-radius:8px;object-fit:cover;display:block;flex-shrink:0;background:#e2e8f0}
        .travel-ui-result-meta{min-width:0;display:flex;flex-direction:column;gap:2px}
        .travel-ui-result-name{font-size:13px;font-weight:700;color:#0f172a;line-height:1.25}
        .travel-ui-result-label{font-size:11px;color:#64748b;line-height:1.35}
        .travel-ui-results.compact{margin-top:0;max-height:126px}
        .travel-ui-route-card{margin-top:12px;border-radius:18px;border:1px solid rgba(226,232,240,.9);background:linear-gradient(180deg,rgba(255,255,255,.98) 0%,rgba(248,250,252,.95) 100%);padding:11px}
        .travel-ui-route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}
        .travel-ui-route-label{margin:0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.12em;text-transform:uppercase}
        .travel-ui-route-title{margin:1px 0 0;font-size:15px;font-weight:800;color:#0f172a}
        .travel-ui-route-chip{border-radius:999px;background:rgba(15,118,110,.12);color:#0f766e;padding:4px 9px;font-size:10px;font-weight:700;white-space:nowrap}
        .travel-ui-mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .travel-ui-mode-btn{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;border:1px solid rgba(148,163,184,.35);padding:8px 9px;background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-ui-mode-btn:hover{transform:translateY(-1px);border-color:rgba(15,23,42,.2)}
        .travel-ui-mode-btn.is-active{background:linear-gradient(130deg,#0f172a,#115e59);border-color:transparent;color:#fff;box-shadow:0 10px 20px rgba(15,23,42,.34)}
        .travel-ui-mode-icon{width:15px;height:15px;display:inline-flex}
        .travel-ui-mode-icon svg{width:100%;height:100%;display:block}
        .travel-ui-field-stack{display:flex;flex-direction:column;gap:8px;margin-top:10px}
        .travel-ui-field{position:relative}
        .travel-ui-field label{display:block;margin:0 0 4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;font-weight:700}
        .travel-ui-field input{width:100%;border-radius:11px;border:1px solid rgba(148,163,184,.45);background:#fff;padding:9px 80px 9px 10px;font-size:13px;font-weight:600;color:#1e293b;outline:none;transition:border-color .2s ease,box-shadow .2s ease}
        .travel-ui-field input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(20,184,166,.14)}
        .travel-ui-field .travel-ui-search-state{top:27px;transform:none}
        .travel-ui-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
        .travel-ui-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}
        .travel-ui-soft-btn{border-radius:11px;border:1px solid rgba(148,163,184,.42);padding:8px 9px;font-size:11px;font-weight:700;color:#334155;background:#fff;cursor:pointer;transition:all .18s ease}
        .travel-ui-soft-btn:hover{background:#f8fafc}
        .travel-ui-soft-btn:disabled{opacity:.45;cursor:not-allowed}
        .travel-ui-soft-btn.is-active{background:linear-gradient(135deg,#0f766e,#0f172a);border-color:transparent;color:#fff}
        .travel-ui-select{width:100%;border-radius:11px;border:1px solid rgba(148,163,184,.42);padding:8px 10px;font-size:12px;font-weight:700;color:#334155;background:#fff;cursor:pointer;outline:none}
        .travel-ui-select:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(20,184,166,.14)}
        .travel-ui-traffic-btn{border-radius:11px;border:1px solid rgba(148,163,184,.42);padding:8px 10px;font-size:11px;font-weight:700;background:#fff;color:#334155;cursor:pointer;transition:all .2s ease}
        .travel-ui-traffic-btn:hover{background:#f8fafc}
        .travel-ui-traffic-btn.is-active{background:linear-gradient(135deg,#f59e0b,#ea580c);border-color:transparent;color:#fff}
        .travel-ui-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
        .travel-ui-main-btn{border:0;border-radius:12px;padding:9px 10px;font-size:12px;font-weight:700;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s ease,color .2s ease}
        .travel-ui-main-btn:hover{transform:translateY(-1px)}
        .travel-ui-main-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .travel-ui-main-btn.build{background:linear-gradient(135deg,#0f766e,#0f172a);color:#fff;box-shadow:0 12px 24px rgba(15,23,42,.26)}
        .travel-ui-main-btn.clear{border:1px solid rgba(148,163,184,.45);background:#fff;color:#334155}
        .travel-ui-main-btn.live{background:#0f172a;color:#fff}
        .travel-ui-main-btn.live.is-active{background:linear-gradient(135deg,#dc2626,#be123c)}
        .travel-ui-alert{margin-top:9px;border-radius:11px;padding:8px 10px;font-size:11px;font-weight:700}
        .travel-ui-alert.info{background:rgba(14,165,233,.13);color:#0369a1}
        .travel-ui-alert.error{background:rgba(244,63,94,.12);color:#be123c}
        .travel-map-tools{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
        .travel-tool-fabs{display:flex;gap:8px}
        .travel-tool-fab{border:1px solid rgba(255,255,255,.72);border-radius:999px;padding:7px 12px;background:rgba(255,255,255,.95);color:#0f172a;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 16px 32px rgba(15,23,42,.18);backdrop-filter:blur(10px);transition:all .2s ease}
        .travel-tool-fab:hover{transform:translateY(-1px);background:#fff}
        .travel-tool-fab.is-active{background:linear-gradient(135deg,#0f172a,#115e59);color:#fff;border-color:transparent}
        .travel-tool-card{border-radius:18px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.94);padding:9px;box-shadow:0 20px 40px rgba(15,23,42,.23);backdrop-filter:blur(12px)}
        .travel-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
        .travel-tool-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .travel-tool-label{font-size:10px;font-weight:700;color:#64748b;letter-spacing:.06em;text-transform:uppercase}
        .travel-tool-select{width:100%;margin-top:6px}
        .travel-tool-btn{border:1px solid transparent;border-radius:10px;padding:7px 10px;background:rgba(148,163,184,.14);color:#334155;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-tool-btn:hover{background:rgba(148,163,184,.22)}
        .travel-tool-btn.is-active{background:linear-gradient(140deg,#0f172a,#1e293b);color:#fff;box-shadow:0 8px 18px rgba(15,23,42,.28)}
        .travel-tool-btn.wide{grid-column:1 / -1}
        .travel-tool-hint{margin-top:6px;font-size:10px;color:#64748b;text-align:center;line-height:1.35}
        .travel-map-bearing-dragging{cursor:ew-resize}
        .travel-tool-status{border-radius:999px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.94);padding:6px 12px;font-size:11px;font-weight:700;color:#334155;box-shadow:0 14px 28px rgba(15,23,42,.18)}
        .travel-type-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 10px;background:rgba(255,255,255,.94);font-size:11px;font-weight:700;color:#334155;box-shadow:0 10px 20px rgba(15,23,42,.16)}
        .travel-places-panel{width:min(280px,calc(100vw - 2rem));border-radius:18px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.95);padding:10px;box-shadow:0 20px 40px rgba(15,23,42,.23);backdrop-filter:blur(12px)}
        .travel-places-panel h5{margin:0 0 8px;font-size:12px;font-weight:800;color:#0f172a}
        .travel-places-list{display:flex;flex-direction:column;gap:6px}
        .travel-places-item{display:flex;align-items:center;justify-content:space-between;border-radius:12px;background:#f8fafc;padding:8px 10px}
        .travel-places-left{display:inline-flex;align-items:center;gap:8px}
        .travel-places-dot{width:10px;height:10px;border-radius:999px}
        .travel-places-name{font-size:12px;font-weight:700;color:#334155}
        .travel-places-count{font-size:12px;font-weight:800;color:#0f172a}
        .travel-route-panel{display:flex;flex-direction:column;gap:8px;max-height:calc(100% - 2rem);overflow-y:auto;padding-right:2px}
        .travel-route-panel::-webkit-scrollbar{width:6px}
        .travel-route-panel::-webkit-scrollbar-thumb{background:rgba(148,163,184,.55);border-radius:999px}
        .travel-route-card{border-radius:18px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.95);padding:11px;box-shadow:0 20px 40px rgba(15,23,42,.23);backdrop-filter:blur(12px)}
        .travel-route-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .travel-route-title{margin:0;font-size:14px;font-weight:800;color:#0f172a}
        .travel-route-toggle{border-radius:10px;border:1px solid rgba(148,163,184,.42);padding:6px 10px;background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer}
        .travel-route-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}
        .travel-route-metric{border-radius:11px;background:#f8fafc;padding:7px 9px}
        .travel-route-metric strong{display:block;font-size:13px;color:#0f172a}
        .travel-route-metric span{display:block;margin-top:2px;font-size:11px;color:#64748b}
        .travel-route-meta{margin-top:8px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;color:#475569;font-size:11px;font-weight:600}
        .travel-route-pill{border-radius:999px;background:rgba(15,23,42,.08);padding:4px 8px;font-size:10px;font-weight:700;color:#334155}
        .travel-route-updated{margin-top:5px;font-size:10px;color:#64748b}
        .travel-route-alt{margin-top:8px;border-radius:12px;border:1px solid rgba(226,232,240,.95);background:#f8fafc;padding:8px}
        .travel-route-alt h5{margin:0 0 5px;font-size:11px;font-weight:700;color:#475569}
        .travel-route-alt-list{display:flex;flex-direction:column;gap:5px}
        .travel-route-alt-btn{display:flex;align-items:center;justify-content:space-between;border-radius:9px;border:1px solid rgba(148,163,184,.35);background:#fff;padding:6px 8px;font-size:11px;font-weight:700;color:#334155;cursor:pointer}
        .travel-route-alt-btn.is-active{background:linear-gradient(135deg,#0f766e,#0f172a);border-color:transparent;color:#fff}
        .travel-next-turn{border-radius:14px;border:1px solid rgba(15,118,110,.24);background:rgba(20,184,166,.12);padding:10px 11px}
        .travel-next-turn small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;font-weight:700}
        .travel-next-turn strong{display:block;margin-top:4px;font-size:13px;color:#134e4a}
        .travel-next-turn span{display:block;margin-top:2px;font-size:11px;color:#0f766e}
        .travel-route-steps-shell{border-radius:14px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.95);padding:8px;box-shadow:0 16px 34px rgba(15,23,42,.18)}
        .travel-route-steps-shell h5{margin:0 0 5px;font-size:11px;font-weight:800;color:#334155}
        .travel-route-steps{max-height:240px;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}
        .travel-route-step{display:flex;align-items:flex-start;gap:8px;width:100%;border:0;background:#fff;border-radius:10px;padding:7px 8px;text-align:left;cursor:pointer}
        .travel-route-step + .travel-route-step{margin-top:4px}
        .travel-route-step:hover{background:#f8fafc}
        .travel-route-step.is-active{background:#ecfeff;box-shadow:inset 0 0 0 1px rgba(20,184,166,.36)}
        .travel-step-symbol{min-width:30px;height:22px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
        .travel-route-step-copy{min-width:0;flex:1}
        .travel-route-step-copy strong{display:block;font-size:12px;color:#1e293b;line-height:1.34}
        .travel-route-step-copy small{display:block;margin-top:2px;font-size:11px;color:#64748b}
        .travel-route-steps::-webkit-scrollbar{width:6px}
        .travel-route-steps::-webkit-scrollbar-thumb{background:rgba(148,163,184,.55);border-radius:999px}
        @media (max-width: 1280px){.travel-map-left-panel{width:min(410px,calc(100% - 360px))}}
        @media (max-width: 1180px){.travel-map-left-panel{width:min(390px,calc(100% - 320px))}}
        @media (max-width: 980px){.travel-map-left-panel{width:min(460px,calc(100% - 2rem))}.travel-map-tools{transform:scale(.96);transform-origin:top right}}
        @media (max-width: 720px){.travel-map-left-panel{width:calc(100% - 2rem)}.travel-map-tools{display:none}}
      `}</style>

      <div
        ref={mapContainerRef}
        className={`h-full w-full ${isBearingDragging ? 'travel-map-bearing-dragging' : ''}`}
        style={{
          transform: `rotate(${mapBearing}deg)`,
          transformOrigin: '50% 50%',
          transition: isBearingDragging ? 'none' : 'transform 180ms ease-out',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900/35 via-slate-900/10 to-transparent" />

      <div
        className="travel-map-left-panel"
        style={{
          position: 'absolute',
          left: '16px',
          top: '16px',
          zIndex: 5000,
          pointerEvents: 'auto',
        }}
      >
        <div className="travel-ui-card">
          <div className="travel-ui-header">
            <div className="travel-ui-stat">
              {`${visibleDestinations.length} places on map`}
            </div>
            <div className="travel-ui-header-actions">
              <button
                type="button"
                onClick={() => setRoutePanelExpanded((prev) => !prev)}
                className="travel-ui-locate"
              >
                {routePanelExpanded ? 'Hide Navigation' : 'Show Navigation'}
              </button>
              <button type="button" onClick={handleLocateUser} className="travel-ui-locate">Locate Me</button>
            </div>
          </div>

          {routePanelExpanded && (
            <div className="travel-ui-route-card">
            <div className="travel-ui-route-head">
              <div>
                <p className="travel-ui-route-label">Route Planner</p>
                <h4 className="travel-ui-route-title">Smart Navigation</h4>
              </div>
              <span className="travel-ui-route-chip">{trafficMode ? 'Traffic aware' : 'Standard flow'}</span>
            </div>

            <div className="travel-ui-mode-grid">
              {TRAVEL_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setRouteMode(mode.key)}
                  className={`travel-ui-mode-btn ${routeMode === mode.key ? 'is-active' : ''}`}
                >
                  <span className="travel-ui-mode-icon">{renderTravelModeIcon(mode.key)}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="travel-ui-field-stack">
              <div className="travel-ui-field">
                <label htmlFor="route-from-input">From</label>
                <input
                  id="route-from-input"
                  type="text"
                  value={fromQuery}
                  onChange={(event) => {
                    setFromQuery(event.target.value);
                    setManualOrigin(null);
                  }}
                  placeholder="Enter starting point"
                />
                <span className={`travel-ui-search-state ${isSearchingFrom ? 'is-searching' : ''}`}>
                  {isSearchingFrom ? 'Searching' : 'Ready'}
                </span>
              </div>
              {fromSearchResults.length > 0 && (
                <div className="travel-ui-results compact" onWheel={(event) => event.stopPropagation()}>
                  {fromSearchResults.map((item) => (
                    <button
                      key={`from-${item.id}-${item.lat}-${item.lng}`}
                      type="button"
                      onClick={() => handleFromSelect(item)}
                      className="travel-ui-result-item"
                    >
                      <img
                        src={item.image || SEARCH_RESULT_FALLBACK_IMAGE}
                        alt={item.name || 'Location'}
                        className="travel-ui-result-thumb"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = SEARCH_RESULT_FALLBACK_IMAGE;
                        }}
                      />
                      <span className="travel-ui-result-meta">
                        <span className="travel-ui-result-name">{item.name || 'Location'}</span>
                        <span className="travel-ui-result-label">{item.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="travel-ui-field">
                <label htmlFor="route-to-input">To</label>
                <input
                  id="route-to-input"
                  type="text"
                  value={toQuery}
                  onChange={(event) => {
                    setToQuery(event.target.value);
                    setSearchedLocation(null);
                    setSelectedPlace(null);
                  }}
                  placeholder="Enter destination"
                />
                <span className={`travel-ui-search-state ${isSearchingTo ? 'is-searching' : ''}`}>
                  {isSearchingTo ? 'Searching' : 'Ready'}
                </span>
              </div>
              {toSearchResults.length > 0 && (
                <div className="travel-ui-results compact" onWheel={(event) => event.stopPropagation()}>
                  {toSearchResults.map((item) => (
                    <button
                      key={`to-${item.id}-${item.lat}-${item.lng}`}
                      type="button"
                      onClick={() => handleToSelect(item)}
                      className="travel-ui-result-item"
                    >
                      <img
                        src={item.image || SEARCH_RESULT_FALLBACK_IMAGE}
                        alt={item.name || 'Location'}
                        className="travel-ui-result-thumb"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = SEARCH_RESULT_FALLBACK_IMAGE;
                        }}
                      />
                      <span className="travel-ui-result-meta">
                        <span className="travel-ui-result-name">{item.name || 'Location'}</span>
                        <span className="travel-ui-result-label">{item.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="travel-ui-grid-2">
              <button type="button" onClick={handleLocateUser} className="travel-ui-soft-btn">Use Current</button>
              <button type="button" onClick={handleSwapRoutePoints} className="travel-ui-soft-btn">Swap</button>
            </div>

            <div className="travel-ui-grid-2">
              <select
                value={routePreference}
                onChange={(event) => setRoutePreference(event.target.value)}
                className="travel-ui-select"
              >
                <option value="recommended">Balanced Route</option>
                <option value="fastest">Fastest Route</option>
                <option value="shortest">Shortest Route</option>
              </select>
              <button
                type="button"
                onClick={() => setTrafficMode((prev) => !prev)}
                className={`travel-ui-traffic-btn ${trafficMode ? 'is-active' : ''}`}
              >
                {trafficMode ? 'Traffic ON' : 'Traffic OFF'}
              </button>
            </div>

            <div className="travel-ui-action-grid">
              <button type="button" onClick={() => calculateRoute()} disabled={isRouting} className="travel-ui-main-btn build">
                {isRouting ? 'Routing...' : 'Build Route'}
              </button>
              <button type="button" onClick={clearRoute} className="travel-ui-main-btn clear">Clear</button>
              <button
                type="button"
                onClick={isLiveNavigation ? stopLiveNavigation : startLiveNavigation}
                className={`travel-ui-main-btn live ${isLiveNavigation ? 'is-active' : ''}`}
              >
                {isLiveNavigation ? 'Stop Live' : 'Start Live'}
              </button>
            </div>

            {navigationStatus && <div className="travel-ui-alert info">{navigationStatus}</div>}
            {routeError && <div className="travel-ui-alert error">{routeError}</div>}
            {multimodalPlan && (
              <div className="travel-ui-alert info" style={{ marginTop: '10px', display: 'grid', gap: '8px', alignItems: 'start' }}>
                <strong>Suggested multimodal route</strong>
                <span>{multimodalPlan.totalDistanceKM} km | {multimodalPlan.totalDurationHM}</span>
                <span>Air leg: {multimodalPlan.departureAirport.code}{' -> '}{multimodalPlan.arrivalAirport.code}</span>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {multimodalPlan.legs.map((leg, index) => (
                    <div key={`${leg.mode}-${index}`} style={{ borderRadius: '10px', border: '1px solid rgba(15,118,110,.22)', background: 'rgba(255,255,255,.78)', padding: '8px 10px', color: '#0f172a' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>{leg.title}</div>
                      <div style={{ fontSize: '11px' }}>{leg.from}{' -> '}{leg.to}</div>
                      <div style={{ fontSize: '11px', opacity: 0.9 }}>{leg.distanceKM} km | {leg.durationHM}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      <div
        className="travel-map-tools"
        style={{
          position: 'absolute',
          right: '16px',
          top: '16px',
          zIndex: 5000,
          pointerEvents: 'auto',
        }}
      >
        <div className="travel-tool-fabs">
          <button
            type="button"
            onClick={() => setMapOptionsOpen((prev) => !prev)}
            className={`travel-tool-fab ${mapOptionsOpen ? 'is-active' : ''}`}
          >
            Map Options
          </button>
          <button
            type="button"
            onClick={() => setPlacesPanelOpen((prev) => !prev)}
            className={`travel-tool-fab ${placesPanelOpen ? 'is-active' : ''}`}
          >
            Places
          </button>
        </div>

        {mapOptionsOpen && (
          <div className="travel-tool-card">
            <div className="travel-tool-row">
              <span className="travel-tool-label">View</span>
              <div className="travel-tool-grid" style={{ width: '160px' }}>
                <button type="button" onClick={() => setMapViewMode('2d')} className={`travel-tool-btn ${mapViewMode === '2d' ? 'is-active' : ''}`}>2D</button>
                <button type="button" onClick={() => setMapViewMode('3d')} className={`travel-tool-btn ${mapViewMode === '3d' ? 'is-active' : ''}`}>3D</button>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <span className="travel-tool-label">Map Type</span>
              <select
                value={activeTile}
                onChange={(event) => setActiveTile(event.target.value)}
                className="travel-ui-select travel-tool-select"
              >
                {Object.entries(tilePresets).map(([key, tile]) => (
                  <option key={key} value={key}>{tile.label}</option>
                ))}
              </select>
            </div>

            <div className="travel-tool-grid" style={{ marginTop: '8px' }}>
              <button type="button" onClick={() => setMapBearing(0)} className="travel-tool-btn wide">Reset Bearing ({Math.round(mapBearing)}&deg;)</button>
              <button type="button" onClick={handleLocateUser} className="travel-tool-btn wide">Locate My Position</button>
            </div>
            <div className="travel-tool-hint">Right-click + drag on map to rotate</div>
          </div>
        )}

        <div className="travel-tool-status">Tiles: {activeTileSource}</div>
        {tileLoadError && (
          <div style={{ maxWidth: '260px', borderRadius: '12px', border: '1px solid #facc15', background: '#fef9c3', color: '#854d0e', padding: '8px 10px', fontSize: '11px', fontWeight: 700, boxShadow: '0 12px 24px rgba(15,23,42,.14)' }}>
            {tileLoadError}
          </div>
        )}
        {placesPanelOpen && (
          <div className="travel-places-panel">
            <h5>Visible place types</h5>
            <div className="travel-places-list">
              {placeTypeSummary.length > 0 ? placeTypeSummary.map((item) => (
                <div key={item.key} className="travel-places-item">
                  <div className="travel-places-left">
                    <span className="travel-places-dot" style={{ backgroundColor: item.color }} />
                    <span className="travel-places-name">{item.label}</span>
                  </div>
                  <span className="travel-places-count">{item.count}</span>
                </div>
              )) : (
                <div className="travel-places-item">
                  <span className="travel-places-name">No places available</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {routeSummary && (
        <div
          className="travel-route-panel"
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: 'min(340px, calc(100% - 2rem))',
            zIndex: 5000,
            pointerEvents: 'auto',
          }}
        >
          <div className="travel-route-card">
            <div className="travel-route-head">
              <h4 className="travel-route-title">Route Summary</h4>
              <button
                type="button"
                onClick={() => setShowInstructions((prev) => !prev)}
                className="travel-route-toggle"
              >
                {showInstructions ? 'Hide Steps' : 'Show Steps'}
              </button>
            </div>
            <div className="travel-route-metrics">
              <div className="travel-route-metric">
                <strong>{routeSummary.distanceKM} km</strong>
                <span>Distance</span>
              </div>
              <div className="travel-route-metric">
                <strong>{routeSummary.durationHM}</strong>
                <span>Duration</span>
              </div>
            </div>
            <div className="travel-route-meta">
              <span>{routeSummary.origin?.name || 'Start'} to {routeSummary.destination?.name || 'Destination'}</span>
              <span className="travel-route-pill">
                Engine: {getRouteProviderLabel(routeSummary.provider)}
              </span>
            </div>
            {routeSummary.lastUpdatedAt && (
              <div className="travel-route-updated">
                Updated {new Date(routeSummary.lastUpdatedAt).toLocaleTimeString()}
              </div>
            )}
            {routeCandidates.length > 1 && (
              <div className="travel-route-alt">
                <h5>Select road option</h5>
                <div className="travel-route-alt-list">
                  {routeCandidates.map((route, index) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectAlternativeRoute(route.id, { fitToRoute: false })}
                      className={`travel-route-alt-btn ${selectedRouteId === route.id ? 'is-active' : ''}`}
                    >
                      <span>Road {index + 1}</span>
                      <span>{route.distanceKM} km / {route.durationHM}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeInstruction && (
            <div className="travel-next-turn">
              <small>Next turn</small>
              <strong>{activeInstruction.text}</strong>
              <span>{activeInstruction.distanceText} | {activeInstruction.durationText}</span>
            </div>
          )}

          {showInstructions && (routeSummary.instructions || []).length > 0 && (
            <div className="travel-route-steps-shell">
              <h5>Turn-by-turn</h5>
              <div className="travel-route-steps" onWheel={(event) => event.stopPropagation()}>
                {(routeSummary.instructions || []).map((step, index) => {
                  const instructionMeta = getInstructionMeta(step);
                  const isActive = index === activeInstructionIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => focusInstructionStep(step)}
                      className={`travel-route-step ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="travel-step-symbol" style={{ background: instructionMeta.bg, color: instructionMeta.fg }}>
                        {instructionMeta.symbol}
                      </span>
                      <span className="travel-route-step-copy">
                        <strong>{step.text}</strong>
                        <small>{step.distanceText} | {step.durationText}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoadingMarkers && (
        <div className="pointer-events-none absolute inset-0 z-[950] bg-white/70 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex h-full w-full items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl">
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 z-[1000] px-4 pb-4 transition-all duration-500 ${panelOpen && selectedPlace ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0'}`}>
        {selectedPlace && (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(2,6,23,0.34)]">
            <div className={`grid grid-cols-1 ${hidePlaceImage ? '' : 'md:grid-cols-[240px_1fr]'}`}>
              {!hidePlaceImage && (
                <div className="relative h-48 md:h-full">
                  <img src={selectedPlace.image || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80'} alt={selectedPlace.name} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{(PLACE_TYPES[selectedPlace.type] || PLACE_TYPES.attraction).label}</span>
                </div>
              )}
              <div className="flex flex-col gap-3 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{selectedPlace.name}</h3>
                    <p className="text-sm text-slate-500">{[selectedPlace.city, selectedPlace.country].filter(Boolean).join(', ') || selectedPlace.categoryLabel}</p>
                    {hidePlaceImage && (
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {(PLACE_TYPES[selectedPlace.type] || PLACE_TYPES.attraction).label}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => setPanelOpen(false)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Close</button>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700"><span>{selectedPlace.rating.toFixed(1)} / 5.0</span></div>
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{selectedPlace.description || 'A wonderful destination to explore.'}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      mapRef.current?.flyTo(
                        [selectedPlace.lat, selectedPlace.lon],
                        Math.max(11, mapRef.current.getZoom()),
                        { animate: true, duration: 0.7 }
                      );
                      const marker = markerRefs.current.get(selectedPlace.id);
                      if (marker) {
                        revealMarker(marker, () => marker.openPopup());
                      }
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Center on map
                  </button>
                  <button type="button" onClick={() => calculateRoute({ name: selectedPlace.name, lat: selectedPlace.lat, lon: selectedPlace.lon })} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-500">Get directions</button>
                  <button type="button" onClick={() => { if (typeof onMarkerClickRef.current === 'function') onMarkerClickRef.current(selectedPlace); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">Open full details</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumDestinationMap;

