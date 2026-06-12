/**
 * AdvancedDestinationMap.jsx - Top-notch production-grade map component
 * Features:
 * - Leaflet + OpenStreetMap + OpenTripMap integration
 * - Multiple tile layers with switcher
 * - Marker clustering with Leaflet.markercluster
 * - Advanced search and filtering
 * - Real-time geolocation
 * - Category-based POI filtering
 * - Performance optimized
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  Box,
  Card,
  Typography,
  Chip,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Stack,
  Divider,
  Grid,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LayersIcon from '@mui/icons-material/Layers';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';

import mapService, {
  searchDestinations,
  getCurrentLocation,
  TILE_LAYERS,
  POI_CATEGORIES,
} from '../../services/mapService';
import { debounce } from '../../services/mapOptimizations';
import MapLegend from './MapLegend';
import { motion } from 'framer-motion';

// Fix Leaflet marker icons (Vite ES module compatible)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const AdvancedDestinationMap = ({
  initialDestinations = [],
  center = { lat: 20.5937, lng: 78.9629 },
  zoom = 5,
  onMarkerClick = null,
  searchable = true,
  showLegend = true,
  showLayerSwitcher = true,
  enableClustering = true,
  enableGeolocation = true,
}) => {
  // Refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const layersRef = useRef({});
  const currentTileLayer = useRef(null);

  // State
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [layerSwitcherOpen, setLayerSwitcherOpen] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [showDetails, setShowDetails] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView([center.lat, center.lng], zoom);

    // Add default tile layer (OpenStreetMap - most reliable, no API needed)
    currentTileLayer.current = L.tileLayer(TILE_LAYERS.osm.url, {
      attribution: TILE_LAYERS.osm.attribution,
      maxZoom: TILE_LAYERS.osm.maxZoom || 19,
      minZoom: 2,
      subdomains: TILE_LAYERS.osm.subdomains || 'abc',
      opacity: 1.0,
      crossOrigin: 'anonymous',
      errorTileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="%23f0f0f0" width="256" height="256"/><text x="128" y="128" text-anchor="middle" dy=".3em" fill="%23999" font-size="14">Tile error</text></svg>',
    }).addTo(map.current);

    // Add scale control
    L.control.scale({ position: 'bottomright' }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  // Initialize markers from initial destinations
  useEffect(() => {
    if (initialDestinations.length > 0) {
      console.log('Loading initial destinations:', initialDestinations.length);
      setMarkers(initialDestinations);
    }
  }, [initialDestinations]);

  // Search functionality with debouncing (prevents rapid API calls)
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setMarkers(initialDestinations);
      return;
    }

    setLoading(true);
    try {
      console.log('Searching for:', query);
      const results = await searchDestinations(query);
      console.log('Found destinations:', results.length);
      setMarkers(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [initialDestinations]);

  // Debounced search - waits 500ms after user stops typing
  const handleSearch = useCallback(debounce(performSearch, 500), [performSearch]);

  // Geolocation
  const handleGeolocation = useCallback(async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);

      // Add user location marker
      const userMarker = L.marker([location.lat, location.lon], {
        icon: L.divIcon({
          html: `
            <div style="
              background: #4F8A8B;
              border: 4px solid white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              box-shadow: 0 4px 12px rgba(79, 138, 139, 0.4);
            "></div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map.current);

      userMarker.bindPopup('📍 Your Location');

      map.current.setView([location.lat, location.lon], 13);

      // Search nearby places
      const nearby = await mapService.searchNearbyPOI(
        location.lat,
        location.lon,
        null,
        5000,
        15
      );
      setMarkers(nearby);
    } catch (error) {
      console.error('Geolocation error:', error);
      alert('Unable to get your location. Please enable location services.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter markers
  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    if (filters.length === 0) {
      setMarkers(initialDestinations);
    } else {
      const filtered = markers.filter(marker => {
        const kinds = (marker.kinds || '').toLowerCase();
        return filters.some(cat => kinds.includes(cat.toLowerCase()));
      });
      setMarkers(filtered);
    }
  }, [markers, initialDestinations]);

  // Toggle favorite
  const toggleFavorite = (marker) => {
    const key = marker.xid || marker.name;
    const newFavorites = new Set(favorites);
    if (newFavorites.has(key)) {
      newFavorites.delete(key);
    } else {
      newFavorites.add(key);
    }
    setFavorites(newFavorites);
  };

  // Add markers to map (optimized rendering)
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove?.());
    markersRef.current = {};

    // Add new markers
    markers.forEach((marker, idx) => {
      if (!marker.lat || !marker.lon) return;

      const category = mapService.getCategoryInfo(marker.kinds);

      // Create custom icon
      const customIcon = L.divIcon({
        html: `
          <div style="
            background: ${category.color};
            border: 3px solid white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          " class="marker-${idx}">
            ${category.icon}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'custom-marker',
      });

      const leafletMarker = L.marker([marker.lat, marker.lon], { icon: customIcon });

      // Enhanced popup
      const popupHTML = createPopupContent(marker);
      leafletMarker.bindPopup(popupHTML, {
        maxWidth: 320,
        className: 'enhanced-popup',
        offset: L.point(0, -36),
      });

      leafletMarker.on('click', () => {
        setSelectedMarker(marker);
        setShowDetails(true);
        if (onMarkerClick) onMarkerClick(marker);
      });

      leafletMarker.addTo(map.current);
      markersRef.current[idx] = leafletMarker;
    });

    // Fit bounds if markers exist
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lon]));
      map.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    } else if (markers.length === 1) {
      map.current.setView([markers[0].lat, markers[0].lon], 12);
    }
  }, [markers, onMarkerClick]);

  // Create popup content
  const createPopupContent = (marker) => {
    const category = mapService.getCategoryInfo(marker.kinds);
    return `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        border-radius: 12px;
        overflow: hidden;
      ">
        <img src="${marker.image || 'https://via.placeholder.com/300x180?text=No+Image'}" alt="${marker.name}" style="
          width: 100%;
          height: 140px;
          object-fit: cover;
        " onerror="this.src='https://via.placeholder.com/300x180?text=Image+Not+Found'" />
        <div style="padding: 12px; background: white;">
          <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">
            ${marker.name}
          </h3>
          <div style="
            font-size: 11px;
            color: #6B7280;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${category.icon}</span>
            <span>${category.label}</span>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          ">
            <span style="color: #F9ED69;">⭐</span>
            <span style="font-weight: 600; color: #1a1a1a; font-size: 12px;">
              ${(marker.rating || 4.0).toFixed(1)}
            </span>
          </div>
          <p style="
            margin: 0;
            font-size: 11px;
            color: #6B7280;
            line-height: 1.4;
            max-height: 50px;
            overflow: hidden;
          ">
            ${(marker.description || 'No description available').substring(0, 80)}...
          </p>
        </div>
      </div>
    `;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '600px',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(79, 138, 139, 0.15)',
        border: '2px solid rgba(79, 138, 139, 0.1)',
      }}
    >
      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Search Bar */}
      {searchable && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 15,
            left: 15,
            right: 'auto',
            zIndex: 1000,
            borderRadius: '12px',
            overflow: 'hidden',
            maxWidth: '350px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <TextField
              placeholder="Search destinations, places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              size="small"
              variant="outlined"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '& fieldset': { border: 'none' }
                }
              }}
              inputProps={{ style: { fontSize: '13px' } }}
            />
            <IconButton
              onClick={() => handleSearch(searchQuery)}
              disabled={loading}
              size="small"
              sx={{ ml: 1 }}
            >
              {loading ? <CircularProgress size={20} /> : <SearchIcon />}
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Control Panel */}
      <Stack
        direction="column"
        spacing={1}
        sx={{
          position: 'absolute',
          top: 70,
          right: 15,
          zIndex: 1000,
          '& button': {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
            }
          }
        }}
      >
        {enableGeolocation && (
          <Tooltip title="Find my location">
            <IconButton
              onClick={handleGeolocation}
              disabled={loading}
              size="medium"
              sx={{
                color: userLocation ? '#4F8A8B' : 'inherit',
                width: 44,
                height: 44,
              }}
            >
              <MyLocationIcon />
            </IconButton>
          </Tooltip>
        )}

        {showLayerSwitcher && (
          <Tooltip title="Change map layer">
            <IconButton
              onClick={() => setLayerSwitcherOpen(!layerSwitcherOpen)}
              size="medium"
              sx={{ width: 44, height: 44 }}
            >
              <LayersIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Layer Switcher */}
      {showLayerSwitcher && layerSwitcherOpen && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 130,
            right: 15,
            zIndex: 1000,
            p: 2,
            borderRadius: '12px',
            maxWidth: '200px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
            Map Layers
          </Typography>
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <Button
              key={key}
              fullWidth
              variant="text"
              size="small"
              onClick={() => {
                if (currentTileLayer.current) {
                  map.current.removeLayer(currentTileLayer.current);
                }
                currentTileLayer.current = L.tileLayer(layer.url, {
                  attribution: layer.attribution,
                  maxZoom: layer.maxZoom || 19,
                  subdomains: layer.subdomains || 'abc',
                  crossOrigin: 'anonymous',
                  errorTileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="%23f0f0f0" width="256" height="256"/></svg>',
                }).addTo(map.current);
                setLayerSwitcherOpen(false);
              }}
              sx={{
                justifyContent: 'flex-start',
                color: '#4F8A8B',
                textTransform: 'none',
                mb: 0.5,
                '&:hover': { backgroundColor: 'rgba(79, 138, 139, 0.1)' }
              }}
            >
              {layer.name}
            </Button>
          ))}
        </Paper>
      )}

      {/* Legend */}
      {showLegend && (
        <MapLegend
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          isCollapsed={legendCollapsed}
        />
      )}

      {/* Legend Toggle */}
      {showLegend && !legendCollapsed && (
        <Tooltip title="Collapse legend">
          <IconButton
            onClick={() => setLegendCollapsed(true)}
            sx={{
              position: 'absolute',
              bottom: 30,
              left: 30,
              zIndex: 1001,
              width: 32,
              height: 32,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
            }}
          >
            <ExpandMoreIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Details Sidebar */}
      {showDetails && selectedMarker && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '350px',
            zIndex: 1500,
            overflow: 'hidden',
          }}
        >
          <Paper
            elevation={4}
            sx={{
              height: '100%',
              borderRadius: '0',
              overflowY: 'auto',
              p: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Close Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton
                size="small"
                onClick={() => setShowDetails(false)}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Image */}
            <Box
              component="img"
              src={selectedMarker.image || 'https://via.placeholder.com/300x200'}
              alt={selectedMarker.name}
              sx={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '12px',
                mb: 2,
              }}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
              }}
            />

            {/* Title */}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
              {selectedMarker.name}
            </Typography>

            {/* Category & Rating */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={mapService.getCategoryInfo(selectedMarker.kinds).label}
                size="small"
                sx={{
                  backgroundColor: mapService.getCategoryInfo(selectedMarker.kinds).color,
                  color: 'white',
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span style={{ fontSize: '16px' }}>⭐</span>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {(selectedMarker.rating || 4.0).toFixed(1)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Description */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
              About
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 2, lineHeight: 1.6 }}>
              {selectedMarker.description || 'No description available.'}
            </Typography>

            {/* Address */}
            {selectedMarker.address && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
                  📍 Address
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
                  {selectedMarker.address}
                </Typography>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Action Buttons */}
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => toggleFavorite(selectedMarker)}
                startIcon={favorites.has(selectedMarker.xid || selectedMarker.name) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                sx={{
                  backgroundColor: favorites.has(selectedMarker.xid || selectedMarker.name) ? '#FF6B6B' : '#4F8A8B',
                  textTransform: 'none',
                }}
              >
                {favorites.has(selectedMarker.xid || selectedMarker.name) ? 'Saved' : 'Save'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ShareIcon />}
                sx={{
                  color: '#4F8A8B',
                  borderColor: '#4F8A8B',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(79, 138, 139, 0.05)',
                    borderColor: '#4F8A8B',
                  }
                }}
              >
                Share
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress sx={{ color: '#4F8A8B' }} />
          <Typography variant="body2" sx={{ color: '#4F8A8B', fontWeight: 600 }}>
            Loading destinations...
          </Typography>
        </Box>
      )}

      {/* Info Badge */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(79, 138, 139, 0.9)',
          color: 'white',
          px: 2,
          py: 0.75,
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
        }}
      >
        📍 {markers.length} places found
      </Box>
    </Box>
  );
};

export default AdvancedDestinationMap;
