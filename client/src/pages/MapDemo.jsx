/**
 * MAP DEMO & EXAMPLE IMPLEMENTATION
 * Shows how to integrate the AdvancedMap component with real data
 * Includes all features: routing, search, destinations, etc.
 */

import React, { useState, useEffect } from 'react';
import AdvancedMap from '../components/AdvancedMap';
import { getRoute, calculateRouteStats, formatDistance, formatDuration } from '../services/routingService';
import { searchLocation, reverseGeocode } from '../services/geocodingService';

import styles from './MapDemo.module.css';

/**
 * Sample destinations (like in the image: Kolhapur area with hotels and attractions)
 */
const SAMPLE_DESTINATIONS = [
  {
    id: 1,
    name: 'Rajarampuri, Kolhapur',
    latitude: 16.7089,
    longitude: 74.247,
    type: 'DESTINATION',
    description: 'Rajarampuri is a historic area in Kolhapur',
    rating: 4.2,
  },
  {
    id: 2,
    name: 'Nagala Park, Kolhapur',
    latitude: 16.7095,
    longitude: 74.2492,
    type: 'ATTRACTION',
    description: 'Beautiful park in the heart of Kolhapur',
    rating: 4.0,
  },
  {
    id: 3,
    name: 'Hotel Yash, Kolhapur',
    latitude: 16.7012,
    longitude: 74.2201,
    type: 'HOTEL',
    description: 'Comfortable hotel with modern amenities',
    rating: 4.5,
  },
  {
    id: 4,
    name: 'Mahalakshmi Temple',
    latitude: 16.7035,
    longitude: 74.2465,
    type: 'ATTRACTION',
    description: 'Ancient temple dedicated to Goddess Mahalakshmi',
    rating: 4.8,
  },
  {
    id: 5,
    name: 'Rankala Lake',
    latitude: 16.6961,
    longitude: 74.2239,
    type: 'ATTRACTION',
    description: 'Scenic lake with walking trails',
    rating: 4.4,
  },
  {
    id: 6,
    name: 'Tavde Hotel',
    latitude: 16.7245,
    longitude: 74.3053,
    type: 'HOTEL',
    description: 'Premium hotel with valley views',
    rating: 4.6,
  },
  {
    id: 7,
    name: 'Supreme Maharaja',
    latitude: 16.7108,
    longitude: 74.2715,
    type: 'RESTAURANT',
    description: 'Traditional Maharashtrian cuisine',
    rating: 4.3,
  },
  {
    id: 8,
    name: 'New Manmaan City',
    latitude: 16.6821,
    longitude: 74.3189,
    type: 'DESTINATION',
    description: 'Shopping and entertainment hub',
    rating: 3.9,
  },
];

/**
 * Map Demo Component
 */
export const MapDemo = () => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Example: Search for a location
  const handleSearchExample = async () => {
    setIsLoading(true);
    try {
      const result = await searchLocation('Kolhapur, India');
      if (result.success) {
        console.log('Search Results:', result.locations);
        setLocations(result.locations.slice(0, 5));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle route calculated
  const handleRouteCalculated = (route) => {
    setRouteInfo(route);
    if (route.routes && route.routes.length > 0) {
      const stats = calculateRouteStats(route);
      setStats(stats);
    }
  };

  // Example: Reverse geocode a point
  const handleReverseGeocodeExample = async () => {
    try {
      const result = await reverseGeocode(16.7089, 74.247);
      if (result.success) {
        console.log('Address:', result.displayName);
        console.log('Location Details:', result);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🗺️ Advanced Map Integration Demo</h1>
        <p>Real Google Map-like experience using Leaflet + OpenStreetMap + APIs</p>
      </div>

      {/* Main Map */}
      <div className={styles.mapSection}>
        <AdvancedMap
          destinations={SAMPLE_DESTINATIONS}
          initialCenter={[16.7089, 74.247]} // Kolhapur center
          initialZoom={12}
          onMarkerClick={setSelectedMarker}
          onRouteCalculated={handleRouteCalculated}
          showClustering={true}
          showSearch={true}
          showRouting={true}
          tileServerName="CartoDB_Light"
          height="600px"
          containerClassName={styles.mapWrapper}
        />
      </div>

      {/* Info Panels */}
      <div className={styles.infoPanels}>
        {/* Selected Marker Info */}
        {selectedMarker && (
          <div className={styles.infoCard}>
            <h3>📍 Selected Destination</h3>
            <div className={styles.infoContent}>
              <p>
                <strong>Name:</strong> {selectedMarker.name}
              </p>
              <p>
                <strong>Type:</strong> {selectedMarker.type}
              </p>
              <p>
                <strong>Coordinates:</strong> {selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}
              </p>
              {selectedMarker.data?.description && (
                <p>
                  <strong>Description:</strong> {selectedMarker.data.description}
                </p>
              )}
              {selectedMarker.data?.rating && (
                <p>
                  <strong>Rating:</strong> ⭐ {selectedMarker.data.rating}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Route Information */}
        {routeInfo && stats && (
          <div className={styles.infoCard}>
            <h3>🛣️ Route Information</h3>
            <div className={styles.infoContent}>
              <p>
                <strong>Distance:</strong> {stats.distanceKM} km
              </p>
              <p>
                <strong>Duration:</strong> {stats.durationHM}
              </p>
              <p>
                <strong>Waypoints:</strong> {routeInfo.waypoints?.length || 0}
              </p>
              <p className={styles.hint}>
                💡 Click on destinations to add to route, then calculate!
              </p>
            </div>
          </div>
        )}

        {/* Feature Examples */}
        <div className={styles.infoCard}>
          <h3>⚙️ Feature Examples</h3>
          <div className={styles.buttonGroup}>
            <button onClick={handleSearchExample} className={styles.demoBtn}>
              🔍 Search Location
            </button>
            <button onClick={handleReverseGeocodeExample} className={styles.demoBtn}>
              📍 Reverse Geocode
            </button>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className={styles.documentation}>
        <div className={styles.docCard}>
          <h3>📚 Getting Started</h3>
          <ol>
            <li>
              <strong>Add destinations in the map</strong> - Pass destination data with latitude/longitude
            </li>
            <li>
              <strong>Search locations</strong> - Use the search bar to find places
            </li>
            <li>
              <strong>Plan routes</strong> - Click markers to add waypoints, then calculate routes
            </li>
            <li>
              <strong>View details</strong> - Click markers to see destination information
            </li>
          </ol>
        </div>

        <div className={styles.docCard}>
          <h3>🔧 Integration Code</h3>
          <pre className={styles.codeBlock}>
{`import AdvancedMap from '@/components/AdvancedMap';

const destinations = [
  {
    id: 1,
    name: 'Destination Name',
    latitude: 16.7089,
    longitude: 74.247,
    type: 'DESTINATION', // or HOTEL, GUIDE, RESTAURANT, etc.
    description: 'Place description',
  },
  // ... more destinations
];

export function MapPage() {
  return (
    <AdvancedMap
      destinations={destinations}
      initialCenter={[16.7089, 74.247]}
      initialZoom={12}
      onMarkerClick={(marker) => console.log('Clicked:', marker)}
      onRouteCalculated={(route) => console.log('Route:', route)}
      showClustering={true}
      showSearch={true}
      showRouting={true}
      height="600px"
    />
  );
}`}
          </pre>
        </div>

        <div className={styles.docCard}>
          <h3>🎯 Features Implemented</h3>
          <ul>
            <li>✅ Real-time location search (Nominatim)</li>
            <li>✅ Route calculation with duration & distance (OpenRouteService)</li>
            <li>✅ Marker clustering for better performance</li>
            <li>✅ Multiple tile layers (CartoDB, OSM, Satellite, etc.)</li>
            <li>✅ Custom marker icons by type</li>
            <li>✅ User geolocation</li>
            <li>✅ Alternative routes</li>
            <li>✅ Distance/duration formatting</li>
            <li>✅ Cache system for performance</li>
            <li>✅ Responsive design</li>
            <li>✅ Google Map-like UX</li>
            <li>✅ Advanced styling and animations</li>
          </ul>
        </div>

        <div className={styles.docCard}>
          <h3>🔐 API Configuration</h3>
          <p>
            All API keys and configuration are centralized in{' '}
            <code>src/config/mapConfig.js</code>
          </p>
          <p>
            <strong>Important:</strong> Get your OpenRouteService API key from{' '}
            <a href="https://openrouteservice.org/" target="_blank" rel="noopener noreferrer">
              https://openrouteservice.org/
            </a>{' '}
            and add it to your .env file
          </p>
          <pre className={styles.codeBlock}>{`REACT_APP_OPENROUTESERVICE_KEY=YOUR_KEY_HERE`}</pre>
        </div>

        <div className={styles.docCard}>
          <h3>📍 Destination Types</h3>
          <div className={styles.typesList}>
            <span className={styles.typeItem}>🏢 DESTINATION</span>
            <span className={styles.typeItem}>🏨 HOTEL</span>
            <span className={styles.typeItem}>👤 GUIDE</span>
            <span className={styles.typeItem}>🍽️ RESTAURANT</span>
            <span className={styles.typeItem}>⭐ ATTRACTION</span>
            <span className={styles.typeItem}>📍 USER_LOCATION</span>
            <span className={styles.typeItem}>▶️ START_POINT</span>
            <span className={styles.typeItem}>⏹️ END_POINT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDemo;
