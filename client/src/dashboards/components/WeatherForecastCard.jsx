// WeatherForecastCard.jsx
// Premium weather forecast card for dashboard
import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import ThunderstormRoundedIcon from '@mui/icons-material/ThunderstormRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import NightlightRoundedIcon from '@mui/icons-material/NightlightRounded';
import { motion } from 'framer-motion';

const API_KEY = String(import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim();
const DEFAULT_LOCATION = 'Santorini, Greece';

function getIconByWeatherCodeAndTemp(code, temp, isNight = false) {
  if (code >= 200 && code < 300) return <ThunderstormRoundedIcon sx={{ color: '#94a3b8', fontSize: 40 }} />;
  if (code >= 300 && code < 600) return <WaterDropRoundedIcon sx={{ color: '#38bdf8', fontSize: 40 }} />;
  if (code >= 600 && code < 700) return <AcUnitRoundedIcon sx={{ color: '#bae6fd', fontSize: 40 }} />;
  if (code >= 700 && code < 800) return <CloudQueueRoundedIcon sx={{ color: '#cbd5f5', fontSize: 40 }} />;
  if (code === 800) {
    if (isNight) return <NightlightRoundedIcon sx={{ color: '#fbbf24', fontSize: 40 }} />;
    if (temp >= 35) return <WbSunnyRoundedIcon sx={{ color: '#fb7185', fontSize: 40 }} />;
    if (temp <= 0) return <AcUnitRoundedIcon sx={{ color: '#bae6fd', fontSize: 40 }} />;
    return <WbSunnyRoundedIcon sx={{ color: '#fcd34d', fontSize: 40 }} />;
  }
  if (code > 800) {
    if (temp <= 0) return <AcUnitRoundedIcon sx={{ color: '#bae6fd', fontSize: 40 }} />;
    return <CloudQueueRoundedIcon sx={{ color: '#93c5fd', fontSize: 40 }} />;
  }
  return <CloudQueueRoundedIcon sx={{ color: '#93c5fd', fontSize: 40 }} />;
}

export default function WeatherForecastCard({ onClick, clickable }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = DEFAULT_LOCATION;

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      setError('');
      if (!API_KEY) {
        setError('Weather API is not configured. Set VITE_OPENWEATHER_API_KEY in client/.env.');
        setLoading(false);
        return;
      }
      try {
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoRes.json();
        if (!geoData[0]) throw new Error('Location not found');
        const { lat, lon } = geoData[0];

        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const weatherData = await weatherRes.json();

        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const forecastData = await forecastRes.json();

        const days = [];
        const usedDays = new Set();
        for (const entry of forecastData.list) {
          const date = new Date(entry.dt * 1000);
          const day = date.toLocaleDateString(undefined, { weekday: 'short' });
          const isNight = date.getHours() < 6 || date.getHours() > 18;
          if (!usedDays.has(day) && date.getHours() === 12) {
            days.push({
              day,
              temp: Math.round(entry.main.temp),
              code: entry.weather[0].id,
              isNight,
            });
            usedDays.add(day);
          }
          if (days.length === 5) break;
        }

        setWeather({
          temp: Math.round(weatherData.main.temp),
          code: weatherData.weather[0].id,
          desc: weatherData.weather[0].main,
          location: `${geoData[0].name}, ${geoData[0].country}`,
          isNight: weatherData.weather[0].icon && weatherData.weather[0].icon.includes('n'),
        });
        setForecast(days);
      } catch (err) {
        setError('Unable to fetch weather.');
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <Card
        sx={{
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
          minWidth: 0,
          maxWidth: '100%',
          width: '100%',
          mb: { xs: 2, md: 4 },
          background: 'linear-gradient(135deg, #0f172a 0%, #0b3b4a 55%, #134e4a 100%)',
          border: '1px solid rgba(255,255,255,0.18)',
          px: { xs: 2, sm: 3 },
          py: { xs: 2.25, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -40,
            right: -40,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          },
          '&:hover': clickable
            ? {
                boxShadow: '0 28px 60px rgba(15, 23, 42, 0.3)',
                transform: 'translateY(-8px)',
              }
            : {},
        }}
        onClick={clickable ? onClick : undefined}
      >
        <CardContent sx={{ p: 0, position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="center" mb={2.5}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <CloudQueueRoundedIcon sx={{ color: '#ffffff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff', letterSpacing: '0.3px' }}>
                Weather outlook
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                Your next destination
              </Typography>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Loading...</Typography>
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
              <Typography sx={{ color: '#fca5a5', fontWeight: 600 }}>{error}</Typography>
            </Box>
          ) : weather ? (
            <>
              <Box
                display="flex"
                alignItems="center"
                justifyContent={{ xs: 'flex-start', sm: 'space-between' }}
                flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                mb={3}
                pb={3}
                borderBottom="1px solid rgba(255,255,255,0.2)"
              >
                <Box display="flex" flexDirection="column" alignItems="center" mr={2}>
                  {getIconByWeatherCodeAndTemp(weather.code, weather.temp, weather.isNight)}
                  <Typography
                    variant="h3"
                    fontWeight={900}
                    sx={{
                      color: '#ffffff',
                      lineHeight: 1,
                      fontSize: { xs: '2rem', sm: '2.5rem' },
                      textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}
                  >
                    {weather.temp} deg
                  </Typography>
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography sx={{ color: '#ffffff', fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1rem' }, wordBreak: 'break-word' }}>
                    {weather.location}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      mt: 0.5,
                    }}
                  >
                    {weather.desc}
                  </Typography>
                </Box>
              </Box>
              <Box>
                {forecast.map((d) => (
                  <Box
                    key={d.day}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1.5}
                    p={1.2}
                    borderRadius="10px"
                    sx={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.15)',
                      }
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        minWidth: 0,
                      }}
                    >
                      {d.day}
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {getIconByWeatherCodeAndTemp(d.code, d.temp, d.isNight)}
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        ml={1.5}
                        sx={{
                          color: '#ffffff',
                          fontSize: '1rem',
                        }}
                      >
                        {d.temp} C
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
