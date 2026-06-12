import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const earningsData = [
  { month: 'Sep', earnings: 1200, bookings: 18 },
  { month: 'Oct', earnings: 1800, bookings: 22 },
  { month: 'Nov', earnings: 2100, bookings: 25 },
  { month: 'Dec', earnings: 2340, bookings: 28 },
  { month: 'Jan', earnings: 1980, bookings: 20 },
];

export default function EarningsCharts() {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
      <Paper elevation={3} sx={{ flex: 1, p: 3, borderRadius: 4 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>Monthly Earnings</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="earnings" stroke="#1976d2" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
      <Paper elevation={3} sx={{ flex: 1, p: 3, borderRadius: 4 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>Bookings Trend</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="bookings" fill="#43a047" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
