import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const toRoutingProfile = (mode = '') => {
  const normalized = String(mode || '').toLowerCase();
  if (normalized.includes('walk')) return 'walking';
  if (normalized.includes('bike') || normalized.includes('cycle')) return 'cycling';
  return 'driving';
};

function FitToStops({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [map, points]);

  return null;
}

function ResizeMapOnLayout({ trigger }) {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timeout);
  }, [map, trigger]);

  return null;
}

export default function ItineraryRouteMap({
  stops = [],
  selectedStopId = '',
  onStopClick = () => {},
  transportMode = 'car',
  height = 560,
}) {
  const [routePoints, setRoutePoints] = useState([]);

  const normalizedStops = useMemo(
    () =>
      stops.filter(
        (stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lon))
      ),
    [stops]
  );

  const points = useMemo(
    () => normalizedStops.map((stop) => [Number(stop.lat), Number(stop.lon)]),
    [normalizedStops]
  );

  const routingProfile = useMemo(() => {
    const firstStopMode = normalizedStops.find((stop) => stop?.transportFromPrev?.mode)?.transportFromPrev?.mode;
    return toRoutingProfile(firstStopMode || transportMode);
  }, [normalizedStops, transportMode]);

  useEffect(() => {
    if (normalizedStops.length < 2) {
      setRoutePoints([]);
      return;
    }

    const controller = new AbortController();

    const fetchRoadRoute = async () => {
      try {
        const routeCoordinates = normalizedStops
          .map((stop) => `${Number(stop.lon)},${Number(stop.lat)}`)
          .join(';');
        const url = `https://router.project-osrm.org/route/v1/${routingProfile}/${routeCoordinates}?overview=full&geometries=geojson`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Route service unavailable');

        const data = await response.json();
        const geometry = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(geometry) || geometry.length < 2) throw new Error('No route geometry');

        const nextRoute = geometry
          .map(([lon, lat]) => [Number(lat), Number(lon)])
          .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
        setRoutePoints(nextRoute.length > 1 ? nextRoute : []);
      } catch {
        if (!controller.signal.aborted) {
          setRoutePoints([]);
        }
      }
    };

    fetchRoadRoute();
    return () => controller.abort();
  }, [normalizedStops, routingProfile]);

  const displayPath = routePoints.length > 1 ? routePoints : points;

  if (normalizedStops.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'grid',
          placeItems: 'center',
          background: '#f8fafc',
          borderTop: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No map locations available for this day.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height, width: '100%', '.leaflet-container': { height: '100%', width: '100%' } }}>
      <MapContainer center={points[0]} zoom={12} scrollWheelZoom zoomControl style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitToStops points={displayPath} />
        <ResizeMapOnLayout trigger={`${height}-${displayPath.length}`} />

        {displayPath.length > 1 && (
          <Polyline
            positions={displayPath}
            pathOptions={{
              color: '#0f766e',
              weight: routePoints.length > 1 ? 5 : 4,
              opacity: routePoints.length > 1 ? 0.9 : 0.8,
              dashArray: routePoints.length > 1 ? undefined : '7 6',
              lineJoin: 'round',
            }}
          />
        )}

        {normalizedStops.map((stop, index) => {
          const isActive = selectedStopId === stop.id;
          return (
            <CircleMarker
              key={stop.id}
              center={[Number(stop.lat), Number(stop.lon)]}
              radius={isActive ? 10 : 7}
              pathOptions={{
                color: isActive ? '#0f172a' : '#0f766e',
                fillColor: isActive ? '#14b8a6' : '#0ea5a4',
                fillOpacity: 0.95,
                weight: isActive ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onStopClick(stop),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {index + 1}. {stop.name}
              </Tooltip>
              <Popup>
                <strong>{stop.name}</strong>
                <br />
                {stop.start} - {stop.end}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <Box
        sx={{
          position: 'absolute',
          right: 10,
          top: 10,
          zIndex: 500,
          border: '1px solid #c6d8e0',
          borderRadius: '999px',
          px: 1.1,
          py: 0.45,
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#27566a',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {routePoints.length > 1 ? 'Road route' : 'Approx route'}
      </Box>
    </Box>
  );
}
