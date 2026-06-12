import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import dayjs from 'dayjs';

// 1-hour slots, 0-23
function getSlotsForDay(bookings, date) {
  const slots = Array(24).fill('free');
  const dayStart = dayjs(date).startOf('day');
  const dayEnd = dayjs(date).endOf('day');
  bookings.forEach(b => {
    const bStart = dayjs(b.startDateTime);
    const bEnd = dayjs(b.endDateTime);
    if (bEnd.isBefore(dayStart) || bStart.isAfter(dayEnd)) return;
    let startHour = Math.max(0, bStart.isBefore(dayStart) ? 0 : bStart.hour());
    let endHour = Math.min(23, bEnd.isAfter(dayEnd) ? 23 : bEnd.hour() - (bEnd.minute() === 0 && bEnd.second() === 0 ? 1 : 0));
    for (let h = startHour; h <= endHour; h++) slots[h] = 'booked';
  });
  return slots;
}

export default function SlotPicker({ bookings, date, onSelectSlot }) {
  const slots = getSlotsForDay(bookings, date);
  return (
    <Box mt={2}>
      <Typography variant="subtitle2" mb={1}>Select an available hour slot:</Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {slots.map((status, h) => (
          <Button
            key={h}
            variant={status === 'booked' ? 'outlined' : 'contained'}
            color={status === 'booked' ? 'error' : 'success'}
            size="small"
            disabled={status === 'booked'}
            onClick={() => onSelectSlot(h)}
          >
            {h}:00
          </Button>
        ))}
      </Box>
    </Box>
  );
}
