/**
 * ADVANCED LEAFLET MAP COMPONENT
 * Enterprise-grade map with routing, search, clustering, and advanced features
 * Real Google Map-like experience using Leaflet + OpenStreetMap
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-markercluster/MarkerCluster.css';
import 'leaflet-markercluster/MarkerCluster.Default.css';
import MarkerClusterGroup from 'leaflet-markercluster';

import {
  MAP_CONFIG,
  GEOCODING_CONFIG,
  FEATURES_CONFIG,
  MARKER_CONFIG,
  ROUTING_CONFIG,
  getTileServer,
  getMarkerConfig,
  logConfigStatus,
} from '../config/mapConfig';
import { getRoute, formatDistance, formatDuration } from '../services/routingService';
import { searchLocation, reverseGeocode } from '../services/geocodingService';

import styles from './AdvancedMap.module.css';

/**
 * Custom icon creator for markers
 */
const createCustomIcon = (type = 'DESTINATION', size = 32) => {
  const config = getMarkerConfig(type);

  const html = `
    <div style="
      width: ${size}px;
      height: ${size + 9}px;
      position: relative;
    ">
      <svg viewBox="0 0 32 41" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
        <path d="M16 0C7.2 0 0 6.9 0 15.4c0 9.8 16 25.6 16 25.6s16-15.8 16-25.6C32 6.9 24.8 0 16 0z" fill="${config.color}"/>
        <circle cx="16" cy="15" r="6" fill="white"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    iconSize: [size, size + 9],
    iconAnchor: [size / 2, size + 9],
    popupAnchor: [0, -size],
    className: 'custom-marker',
  });
};

/**
 * Main Map Component
 */
export const AdvancedMap = ({
  destinations = [],
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = MAP_CONFIG.DEFAULT_ZOOM,
  onMarkerClick = null,
  onRouteCalculated = null,
  showClustering = true,
  showSearch = true,
  showRouting = true,
  tileServerName = MAP_CONFIG.DEFAULT_TILE,
  height = '500px',
  containerClassName = '',
}) => {
  const mapRef = useRef(null);
  const markerClusterRef = useRef(null);

  // State management
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Get tile server configuration
  const tileServer = getTileServer(tileServerName);

  // Initialize map
  useEffect(() => {
    logConfigStatus();
  }, []);

  // Process destinations into markers
  useEffect(() => {
    const processedMarkers = destinations.map((dest, idx) => ({
      id: dest.id || idx,
      lat: dest.latitude || dest.lat,
      lng: dest.longitude || dest.lng,
      name: dest.name || `Destination ${idx + 1}`,
      type: dest.type || 'DESTINATION',
      data: dest,
      icon: createCustomIcon(dest.type || 'DESTINATION'),
    }));

    setMarkers(processedMarkers);
  }, [destinations]);

  // Get user's current location
  useEffect(() => {
    if (!FEATURES_CONFIG.ENABLE_GEOLOCATION) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => console.warn('Geolocation error:', error)
    );
  }, []);

  /**
   * Debounce search function
   */
  const debounceSearch = useCallback((query) => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchLocation(query, { limit: 8 });
        if (result.success) {
          setSearchResults(result.locations.slice(0, 8));
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, GEOCODING_CONFIG.SEARCH_DEBOUNCE);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Handle search input change
   */
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      debounceSearch(query);
    }
  };

  /**
   * Handle search result selection
   */
  const handleSearchResultSelect = (location) => {
    const latLng = L.latLng(location.lat, location.lng);
    if (mapRef.current) {
      mapRef.current.setView(latLng, MAP_CONFIG.DESTINATION_ZOOM);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Calculate and show route between points
   */
  const handleCalculateRoute = async () => {
    if (routePoints.length < 2) {
      alert('Please select at least 2 points for routing');
      return;
    }

    try {
      const route = await getRoute(routePoints, {
        profile: ROUTING_CONFIG.DEFAULT_PROFILE,
      });

      if (route.success && route.routes.length > 0) {
        setSelectedRoute(route.routes[0]);
        if (onRouteCalculated) {
          onRouteCalculated(route);
        }

        // Zoom to route bounds
        if (mapRef.current && route.routes[0].waypoints) {
          const bounds = L.latLngBounds(route.routes[0].waypoints);
          mapRef.current.fitBounds(bounds, { padding: [MAP_CONFIG.ROUTE_PADDING, MAP_CONFIG.ROUTE_PADDING] });
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      alert('Error calculating route: ' + error.message);
    }
  };

  /**
   * Handle marker click
   */
  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    setRoutePoints((prev) => {
      const exists = prev.some((p) => p[0] === marker.lat && p[1] === marker.lng);
      if (exists) {
        return prev.filter((p) => !(p[0] === marker.lat && p[1] === marker.lng));
      }
      return [...prev, [marker.lat, marker.lng]];
    });

    if (onMarkerClick) {
      onMarkerClick(marker);
    }
  };

  /**
   * Clear route
   */
  const handleClearRoute = () => {
    setSelectedRoute(null);
    setRoutePoints([]);
  };

  /**
   * Fit all markers to view
   */
  const handleFitToMarkers = () => {
    if (markers.length === 0) return;

    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng])
    );

    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: [MAP_CONFIG.ROUTE_PADDING, MAP_CONFIG.ROUTE_PADDING],
      });
    }
  };

  return (
    <div className={`${styles.mapContainer} ${containerClassName}`} style={{ height }}>
      {/* Search Bar */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="🔍 Search locations..."
              value={searchQuery}
              onChange={handleSearch}
              className={styles.searchInput}
            />
            {isSearching && <div className={styles.spinner} />}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((location) => (
                <div
                  key={location.id}
                  className={styles.searchResult}
                  onClick={() => handleSearchResultSelect(location)}
                >
                  <div className={styles.resultIcon}>📍</div>
                  <div className={styles.resultText}>
                    <div className={styles.resultName}>{location.name}</div>
                    <div className={styles.resultAddress}>{location.displayName.substring(0, 60)}...</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className={styles.map}
        ref={mapRef}
        style={{ height: '100%' }}
      >
        {/* Tile Layer */}
        <TileLayer
          url={tileServer.url}
          attribution={tileServer.attribution}
          maxZoom={tileServer.maxZoom}
          minZoom={tileServer.minZoom}
        />

        {/* Marker Cluster Group */}
        {showClustering && markers.length > 0 && (
          <MarkerClusterGroup
            ref={markerClusterRef}
            maxClusterRadius={MAP_CONFIG.CLUSTER_OPTIONS.maxClusterRadius}
            disableClusteringAtZoom={MAP_CONFIG.CLUSTER_OPTIONS.disableClusteringAtZoom}
            showCoverageOnHover={true}
            chunkedLoading={true}
          >
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={marker.icon}
                eventHandlers={{
                  click: () => handleMarkerClick(marker),
                }}
              >
                <Popup>
                  <div className={styles.markerPopup}>
                    <h3>{marker.name}</h3>
                    <p>
                      <strong>Coordinates:</strong> {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                    </p>
                    <p>
                      <strong>Type:</strong> {marker.type}
                    </p>
                    {marker.data?.description && <p>{marker.data.description}</p>}
                    {selectedRoute && (
                      <p className={styles.routeInfo}>
                        Route selected ({routePoints.length} points)
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Non-clustered markers */}
        {!showClustering &&
          markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={marker.icon}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              <Popup>
                <div className={styles.markerPopup}>
                  <h3>{marker.name}</h3>
                  <p>
                    <strong>Coordinates:</strong> {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCustomIcon('USER_LOCATION', 24)}
          >
            <Popup>
              <div>
                <strong>Your Location</strong>
                <p>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Waypoints */}
        {routePoints.map((point, idx) => (
          <Marker
            key={`waypoint-${idx}`}
            position={point}
            icon={idx === 0 ? createCustomIcon('START_POINT') : createCustomIcon('END_POINT')}
          >
            <Popup>
              <div>Waypoint {idx + 1}</div>
            </Popup>
          </Marker>
        ))}

        {/* Route Polyline */}
        {selectedRoute && selectedRoute.waypoints && (
          <Polyline
            positions={selectedRoute.waypoints}
            pathOptions={{
              color: selectedRoute.color || ROUTING_CONFIG.ROUTE_STYLE.color,
              weight: ROUTING_CONFIG.ROUTE_STYLE.weight,
              opacity: ROUTING_CONFIG.ROUTE_STYLE.opacity,
              lineCap: ROUTING_CONFIG.ROUTE_STYLE.lineCap,
              lineJoin: ROUTING_CONFIG.ROUTE_STYLE.lineJoin,
            }}
          />
        )}
      </MapContainer>

      {/* Route Info Panel */}
      {selectedRoute && (
        <div className={styles.routeInfoPanel}>
          <div className={styles.routeHeader}>
            <h3>📍 Route Information</h3>
            <button onClick={handleClearRoute} className={styles.closeBtn}>
              ✕
            </button>
          </div>
          <div className={styles.routeDetails}>
            <div className={styles.routeDetail}>
              <span>Distance:</span>
              <strong>{selectedRoute.distanceKM} km</strong>
            </div>
            <div className={styles.routeDetail}>
              <span>Duration:</span>
              <strong>{selectedRoute.durationHM}</strong>
            </div>
            <div className={styles.routeDetail}>
              <span>Waypoints:</span>
              <strong>{routePoints.length}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Controls Panel */}
      {showRouting && (
        <div className={styles.controlsPanel}>
          <button
            onClick={handleCalculateRoute}
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={routePoints.length < 2}
            title="Calculate route between selected points"
          >
            🛣️ Calculate Route ({routePoints.length})
          </button>
          <button
            onClick={handleFitToMarkers}
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={markers.length === 0}
            title="Fit all destinations in view"
          >
            📍 View All
          </button>
          {selectedRoute && (
            <button
              onClick={handleClearRoute}
              className={`${styles.btn} ${styles.btnDanger}`}
              title="Clear current route"
            >
              ✕ Clear Route
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <h4>Legend</h4>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon} style={{ color: '#FF6B6B' }}>
            📍
          </span>
          <span>Destination</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon} style={{ color: '#007AFF' }}>
            📍
          </span>
          <span>Your Location</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon} style={{ color: '#00B894' }}>
            ▶
          </span>
          <span>Start Point</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon} style={{ color: '#D63031' }}>
            ⏹
          </span>
          <span>End Point</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMap;
