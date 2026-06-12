// WeatherSearchPage.jsx
// Page to search and display weather for any destination
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';


const API_KEY = String(import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim();

function getIconByWeatherCode(code) {
  // OpenWeatherMap icon code mapping (simplified)
  if (code >= 200 && code < 700) return <CloudQueueRoundedIcon sx={{ color: '#90caf9', fontSize: 32 }} />; // Rain, snow, etc
  if (code === 800) return <WbSunnyRoundedIcon sx={{ color: '#FDB813', fontSize: 32 }} />; // Clear
  if (code > 800) return <CloudQueueRoundedIcon sx={{ color: '#90caf9', fontSize: 32 }} />; // Clouds
  return <WbSunnyRoundedIcon sx={{ color: '#FDB813', fontSize: 32 }} />;
}

export default function WeatherSearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');


  // Real search handler
  const handleSearch = async () => {
    if (!API_KEY) {
      setError('Weather API is not configured. Set VITE_OPENWEATHER_API_KEY in client/.env.');
      return;
    }
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      // 1. Get geocoding for city name
      const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`);
      const geoData = await geoRes.json();
      if (!geoData[0]) throw new Error('Location not found');
      const { lat, lon, name, country } = geoData[0];
      // 2. Get current weather
      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const weatherData = await weatherRes.json();
      // 3. Get 5-day forecast
      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
      const forecastData = await forecastRes.json();
      // Group forecast by day (get one per day, midday)
      const days = [];
      const usedDays = new Set();
      for (const entry of forecastData.list) {
        const date = new Date(entry.dt * 1000);
        const day = date.toLocaleDateString(undefined, { weekday: 'short' });
        if (!usedDays.has(day) && date.getHours() === 12) {
          days.push({
            day,
            temp: Math.round(entry.main.temp),
            code: entry.weather[0].id,
          });
          usedDays.add(day);
        }
        if (days.length === 5) break;
      }
      setWeather({
        location: `${name}, ${country}`,
        temp: Math.round(weatherData.main.temp),
        code: weatherData.weather[0].id,
        desc: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        wind: Math.round(weatherData.wind.speed),
        forecast: days,
      });
    } catch (err) {
      setError('Unable to fetch weather.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={6}>
      <Typography variant="h4" fontWeight={800} mb={3} align="center">
        Search Weather by Destination
      </Typography>
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Enter city or destination"
          variant="outlined"
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleSearch} disabled={loading || !query} sx={{ minWidth: 120 }}>
          {loading ? <CircularProgress size={22} /> : 'Search'}
        </Button>
      </Box>
      {error && <Typography color="error.main" mb={2}>{error}</Typography>}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
          <CircularProgress />
        </Box>
      )}
      {weather && !loading && (
        <Card sx={{ borderRadius: 4, boxShadow: 2, bgcolor: '#fafdff', mt: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>{weather.location}</Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {getIconByWeatherCode(weather.code)}
              <Typography variant="h2" fontWeight={900} color="#FDB813">{weather.temp}&deg;C</Typography>
              <Typography color="text.secondary" fontWeight={500} textTransform="capitalize">{weather.desc}</Typography>
            </Box>
            <Box display="flex" gap={4} mb={2}>
              <Typography variant="body1" color="text.secondary">Humidity: <b>{weather.humidity}%</b></Typography>
              <Typography variant="body1" color="text.secondary">Wind: <b>{weather.wind} km/h</b></Typography>
            </Box>
            <Box mt={2}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>5-Day Forecast</Typography>
              <Box display="flex" gap={2}>
                {weather.forecast.map((d) => (
                  <Box key={d.day} display="flex" flexDirection="column" alignItems="center" bgcolor="#f5faff" borderRadius={2} px={2} py={1} minWidth={60}>
                    <Typography fontWeight={700}>{d.day}</Typography>
                    {getIconByWeatherCode(d.code)}
                    <Typography fontWeight={700} color="#FDB813">{d.temp}&deg;C</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
