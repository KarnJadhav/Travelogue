import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';

const BOOKED_STYLES = {
  bgcolor: '#fee2e2',
  color: '#991b1b',
  borderColor: '#ef4444',
};
const PARTIAL_STYLES = {
  bgcolor: '#fef3c7',
  color: '#92400e',
  borderColor: '#f59e0b',
};
const AVAILABLE_STYLES = {
  bgcolor: '#ecfdf5',
  color: '#065f46',
  borderColor: '#a7f3d0',
};
const TOUR_DAY_STYLES = {
  bgcolor: '#dbeafe',
  color: '#1e3a8a',
  borderColor: '#60a5fa',
};

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'accepted']);

const isBusyBooking = (booking) => ACTIVE_BOOKING_STATUSES.has(booking?.status || 'pending');

const toDateKey = (value) => {
  const date = dayjs(value);
  if (!date.isValid()) return '';
  return date.format('YYYY-MM-DD');
};

// bookings: array of { startDateTime, endDateTime }
export default function GuideAvailabilityCalendar({
  rateType = 'hourly',
  onSelectDate,
  selectedDate,
  bookings = [],
  guideTourDateKeys = []
}) {
  const busyBookings = bookings.filter(isBusyBooking);
  const guideTourDaySet = React.useMemo(
    () =>
      new Set(
        (Array.isArray(guideTourDateKeys) ? guideTourDateKeys : [])
          .map((dateKey) => String(dateKey || '').trim())
          .filter(Boolean)
      ),
    [guideTourDateKeys]
  );

  // Helper: get day status (full, partial, free) and available hours
  function getDayStatus(date) {
    const dayStart = dayjs(date).startOf('day');
    const dayEnd = dayjs(date).endOf('day');
    let busyHours = Array(24).fill(false);
    busyBookings.forEach(b => {
      const bStart = dayjs(b.startDateTime);
      const bEnd = dayjs(b.endDateTime);
      // If booking overlaps this day
      if (bEnd.isBefore(dayStart) || bStart.isAfter(dayEnd)) return;
      let startHour = Math.max(0, bStart.isBefore(dayStart) ? 0 : bStart.hour());
      let endHour = Math.min(23, bEnd.isAfter(dayEnd) ? 23 : bEnd.hour() - (bEnd.minute() === 0 && bEnd.second() === 0 ? 1 : 0));
      for (let h = startHour; h <= endHour; h++) busyHours[h] = true;
    });
    const busyCount = busyHours.filter(Boolean).length;
    let status = 'free';
    if (rateType !== 'hourly' && busyCount > 0) status = 'full';
    else if (busyCount === 24) status = 'full';
    else if (busyCount > 0) status = 'partial';
    const availableHours = busyHours.map((b, i) => !b ? i : null).filter(v => v !== null);
    const isTourDay = guideTourDaySet.has(toDateKey(dayStart));
    return { status, availableHours, isTourDay };
  }

  function getStatusStyles(status, isTourDay) {
    if (status === 'full') return BOOKED_STYLES;
    if (status === 'partial') return PARTIAL_STYLES;
    if (isTourDay) return TOUR_DAY_STYLES;
    return AVAILABLE_STYLES;
  }

  function AvailabilityDay(props) {
    const { day, outsideCurrentMonth, disabled, ...other } = props;
    const { status, availableHours, isTourDay } = getDayStatus(day);
    const statusStyles = getStatusStyles(status, isTourDay);
    const isFull = status === 'full';
    const tooltipTitle = isFull
      ? 'Booked all day'
      : status === 'partial'
        ? `Partly booked${isTourDay ? ' + Guide trip day' : ''}. Free hours: ${availableHours.length > 0 ? availableHours.map(h => `${h}:00`).join(', ') : 'None'}`
        : isTourDay
          ? 'Guide-organized trip day'
          : 'Available';

    return (
      <Tooltip title={tooltipTitle} arrow>
        <span>
          <PickersDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            disabled={disabled || isFull || isTourDay}
            sx={{
              borderRadius: 1.5,
              border: outsideCurrentMonth ? '1px solid transparent' : `1px solid ${statusStyles.borderColor}`,
              backgroundColor: outsideCurrentMonth ? 'transparent' : statusStyles.bgcolor,
              color: outsideCurrentMonth ? 'text.disabled' : statusStyles.color,
              fontWeight: status === 'free' && !isTourDay ? 600 : 800,
              textDecoration: isFull ? 'line-through' : 'none',
              '&:hover': {
                backgroundColor: status === 'full'
                  ? BOOKED_STYLES.bgcolor
                  : status === 'partial'
                    ? '#fde68a'
                    : isTourDay
                      ? '#bfdbfe'
                    : '#d1fae5',
              },
              '&.Mui-selected': {
                backgroundColor: '#2563eb',
                color: '#fff',
                borderColor: '#2563eb',
                '&:hover': { backgroundColor: '#1d4ed8' },
              },
              '&.Mui-disabled': {
                opacity: outsideCurrentMonth ? 0.35 : 1,
                backgroundColor: outsideCurrentMonth ? 'transparent' : statusStyles.bgcolor,
                color: outsideCurrentMonth ? 'text.disabled' : statusStyles.color,
              },
            }}
          />
        </span>
      </Tooltip>
    );
  }

  const legendItems = [
    { label: 'Busy', styles: BOOKED_STYLES },
    { label: 'Partly booked', styles: PARTIAL_STYLES },
    { label: 'Guide trip day', styles: TOUR_DAY_STYLES },
    { label: 'Available', styles: AVAILABLE_STYLES },
  ];

  return (
    <Box>
      <Typography variant="subtitle1" mb={1} sx={{ fontWeight: 700, color: '#1f2937' }}>
        Guide Availability
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <StaticDatePicker
          displayStaticWrapperAs="desktop"
          value={selectedDate ? dayjs(selectedDate) : null}
          onChange={(date) => onSelectDate?.(date)}
          shouldDisableDate={(date) => {
            const { status, isTourDay } = getDayStatus(date);
            return status === 'full' || isTourDay;
          }}
          slots={{ day: AvailabilityDay }}
        />
      </LocalizationProvider>
      <Box mt={2} display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
        {legendItems.map((item) => (
          <Box key={item.label} display="flex" alignItems="center" gap={0.75}>
            <Box
              width={16}
              height={16}
              borderRadius={1}
              sx={{
                bgcolor: item.styles.bgcolor,
                border: `1px solid ${item.styles.borderColor}`,
              }}
            />
            <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
