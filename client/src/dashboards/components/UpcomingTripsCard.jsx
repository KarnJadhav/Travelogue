// Upcoming Trips summary card with dates and status
// Layout logic: Card summarizing upcoming trips with destination, date, and status. Uses MUI Card, Chip, and Button. Animated entrance with Framer Motion.
import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { motion } from 'framer-motion';

// Dummy data
const upcomingTrips = [
  {
    destination: 'Santorini',
    date: '2026-04-15',
    status: 'Confirmed',
  },
  {
    destination: 'Kyoto',
    date: '2026-06-02',
    status: 'Pending',
  },
];

export default function UpcomingTripsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <Card sx={{ borderRadius: 4, boxShadow: 2, minWidth: 320, maxWidth: 400, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Upcoming Trips
          </Typography>
          {upcomingTrips.length === 0 ? (
            <Typography color="text.secondary">No upcoming trips.</Typography>
          ) : (
            upcomingTrips.map((trip, idx) => (
              <Box key={trip.destination + idx} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {trip.destination}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(trip.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
                <Chip
                  label={trip.status}
                  color={trip.status === 'Confirmed' ? 'success' : 'warning'}
                  size="small"
                  sx={{ mt: 0.5, fontWeight: 600 }}
                />
              </Box>
            ))
          )}
          <Button variant="contained" color="primary" size="small" sx={{ borderRadius: 2 }}>
            View All Trips
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
