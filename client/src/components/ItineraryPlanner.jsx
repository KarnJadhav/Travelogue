import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AdvancedMap from './AdvancedMap';
import { generateItinerary, downloadItineraryPdf } from '../services/itineraryService';
import styles from './ItineraryPlanner.module.css';

const interestPresets = ['culture', 'food', 'nature', 'shopping', 'history', 'nightlife'];

export default function ItineraryPlanner() {
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: 'mid',
    pace: 'balanced',
    transportMode: 'car',
    dailyStartTime: '09:00',
    dailyEndTime: '21:00',
    interests: ['culture', 'food'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const mapDestinations = useMemo(() => {
    const days = data?.itinerary?.days || [];
    return days.flatMap((day) =>
      (day.stops || []).map((s, idx) => ({
        id: `${day.day}-${idx}`,
        name: `${s.arrivalTime || '--:--'} ${s.name}`,
        lat: s?.location?.lat,
        lng: s?.location?.lng,
        type: 'DESTINATION',
      }))
    ).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && x.lat && x.lng);
  }, [data]);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const toggleInterest = (value) => {
    setForm((prev) => {
      const has = prev.interests.includes(value);
      return { ...prev, interests: has ? prev.interests.filter((v) => v !== value) : [...prev.interests, value] };
    });
  };

  const onGenerate = async () => {
    setError('');
    if (!form.destination.trim()) {
      setError('Please enter destination.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateItinerary(form);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.wrapper}>
      <Paper className={styles.formCard} elevation={0}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          AI Itinerary Planner
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Destination" value={form.destination} onChange={onChange('destination')} /></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth type="date" label="Start" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={onChange('startDate')} /></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth type="date" label="End" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={onChange('endDate')} /></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth select label="Budget" value={form.budget} onChange={onChange('budget')}><MenuItem value="low">Low</MenuItem><MenuItem value="mid">Mid</MenuItem><MenuItem value="high">High</MenuItem></TextField></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth select label="Pace" value={form.pace} onChange={onChange('pace')}><MenuItem value="relaxed">Relaxed</MenuItem><MenuItem value="balanced">Balanced</MenuItem><MenuItem value="fast">Fast</MenuItem></TextField></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth select label="Transport" value={form.transportMode} onChange={onChange('transportMode')}><MenuItem value="walk">Walk</MenuItem><MenuItem value="bike">Bike</MenuItem><MenuItem value="car">Car</MenuItem></TextField></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth type="time" label="Day Start" InputLabelProps={{ shrink: true }} value={form.dailyStartTime} onChange={onChange('dailyStartTime')} /></Grid>
          <Grid item xs={6} md={2}><TextField fullWidth type="time" label="Day End" InputLabelProps={{ shrink: true }} value={form.dailyEndTime} onChange={onChange('dailyEndTime')} /></Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {interestPresets.map((i) => (
                <Chip key={i} label={i} clickable color={form.interests.includes(i) ? 'primary' : 'default'} onClick={() => toggleInterest(i)} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={onGenerate} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Generate Itinerary'}</Button>
              <Button variant="outlined" disabled={!data?.itinerary} onClick={() => downloadItineraryPdf(data)}>Download PDF</Button>
            </Stack>
            {error && <Typography color="error" mt={1}>{error}</Typography>}
          </Grid>
        </Grid>
      </Paper>

      {data?.itinerary && (
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} md={6}>
            <Paper className={styles.timelineCard} elevation={0}>
              <Typography variant="h6" fontWeight={700}>{data.itinerary.destination}</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>{data.itinerary.summary}</Typography>
              {(data.itinerary.days || []).map((day) => (
                <Box key={day.day} mb={2.5}>
                  <Typography fontWeight={700}>Day {day.day}: {day.title}</Typography>
                  {(day.stops || []).map((stop, idx) => (
                    <Box className={styles.stopItem} key={`${day.day}-${idx}`}>
                      <Typography fontWeight={600}>{stop.arrivalTime} - {stop.departureTime} | {stop.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{stop.address}</Typography>
                      {stop.travelFromPrevious && (
                        <Typography variant="caption" color="text.secondary">
                          Travel: {stop.travelFromPrevious.mode} | {stop.travelFromPrevious.distanceKm} km | {stop.travelFromPrevious.estimatedMinutes} min
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper className={styles.mapCard} elevation={0}>
              <AdvancedMap destinations={mapDestinations} height="560px" showRouting showSearch />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
