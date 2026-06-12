import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  IconButton,
  InputAdornment,
  Slider,
  Typography,
  Paper
} from '@mui/material';
import {
  ClearAll as ClearAllIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  FilterAlt as FilterAltIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const statusOptions = [
  { value: 'pending', label: 'Pending', color: '#FFA500' },
  { value: 'confirmed', label: 'Confirmed', color: '#4CAF50' },
  { value: 'completed', label: 'Completed', color: '#2196F3' },
  { value: 'cancelled', label: 'Cancelled', color: '#F44336' },
];

const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'status', label: 'By Status' },
];

const BookingFiltersBar = ({
  filters,
  onFilterChange,
  onClearFilters,
  totalBookings,
  filteredCount,
  bookings = []
}) => {
  const [expandFilters, setExpandFilters] = useState(false);

  // Get unique guides from bookings
  const uniqueGuides = useMemo(() => {
    const guides = {};
    bookings.forEach(booking => {
      if (booking.guideId) {
        const guideId = booking.guideId._id || booking.guideId;
        const guideName = booking.guideId.name || 'Unknown Guide';
        if (!guides[guideId]) {
          guides[guideId] = { id: guideId, name: guideName };
        }
      }
    });
    return Object.values(guides);
  }, [bookings]);

  const handleStatusChange = (status) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const handleGuideChange = (guideId) => {
    const newGuideIds = filters.guideIds.includes(guideId)
      ? filters.guideIds.filter(id => id !== guideId)
      : [...filters.guideIds, guideId];
    onFilterChange({ ...filters, guideIds: newGuideIds });
  };

  const handlePriceChange = (event, newValue) => {
    onFilterChange({ ...filters, priceRange: newValue });
  };

  const handleDateChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const activeFiltersCount = [
    filters.searchQuery,
    filters.statuses.length > 0,
    filters.guideIds.length > 0,
    filters.priceRange[1] < 10000,
    filters.startDate,
    filters.endDate,
    filters.sortBy !== 'date-desc'
  ].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(79, 138, 139, 0.15)',
          p: 3,
          mb: 3,
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Filter Header with Stats */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: expandFilters ? 2 : 0,
            pb: 2,
            borderBottom: expandFilters ? '1px solid rgba(79, 138, 139, 0.1)' : 'none'
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <FilterAltIcon sx={{ color: '#4F8A8B' }} />
              Filters & Search
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredCount} of {totalBookings} bookings
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {activeFiltersCount > 0 && (
              <Chip
                label={`${activeFiltersCount} active`}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
            )}
            <IconButton
              onClick={() => setExpandFilters(!expandFilters)}
              size="small"
              sx={{
                color: '#4F8A8B',
                '&:hover': { bgcolor: 'rgba(79, 138, 139, 0.1)' }
              }}
            >
              {expandFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>
        </Box>

        {/* Collapsible Filters Section */}
        <Collapse in={expandFilters} timeout="auto">
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search by destination, guide name, or booking ID..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#4F8A8B', mr: 1 }} />
                  </InputAdornment>
                ),
                endAdornment: filters.searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                      edge="end"
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(79, 138, 139, 0.1)'
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 16px rgba(79, 138, 139, 0.15)',
                    borderColor: '#4F8A8B'
                  }
                }
              }}
            />

            {/* Status Filter */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
                Booking Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {statusOptions.map((status) => (
                  <Chip
                    key={status.value}
                    label={status.label}
                    onClick={() => handleStatusChange(status.value)}
                    variant={filters.statuses.includes(status.value) ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: status.color,
                      color: filters.statuses.includes(status.value) ? 'white' : status.color,
                      backgroundColor: filters.statuses.includes(status.value)
                        ? status.color
                        : 'transparent',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: status.color,
                        color: 'white',
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 12px ${status.color}40`
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Guide Filter */}
            {uniqueGuides.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
                  Filter by Guide
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {uniqueGuides.map((guide) => (
                    <Chip
                      key={guide.id}
                      label={guide.name}
                      onClick={() => handleGuideChange(guide.id)}
                      variant={filters.guideIds.includes(guide.id) ? 'filled' : 'outlined'}
                      sx={{
                        borderColor: '#4F8A8B',
                        color: filters.guideIds.includes(guide.id) ? 'white' : '#4F8A8B',
                        backgroundColor: filters.guideIds.includes(guide.id)
                          ? '#4F8A8B'
                          : 'transparent',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: '#4F8A8B',
                          color: 'white',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(79, 138, 139, 0.3)'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Price Range Filter */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
              </Typography>
              <Slider
                range
                min={0}
                max={10000}
                step={100}
                value={filters.priceRange}
                onChange={handlePriceChange}
                valueLabelDisplay="auto"
                sx={{
                  color: '#4F8A8B',
                  '& .MuiSlider-thumb': {
                    boxShadow: '0 2px 8px rgba(79, 138, 139, 0.4)',
                    '&:hover': {
                      boxShadow: '0 2px 12px rgba(79, 138, 139, 0.6)'
                    }
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: 'rgba(79, 138, 139, 0.1)'
                  }
                }}
              />
            </Box>

            {/* Date Range Filter */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="From Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&.Mui-focused fieldset': {
                      borderColor: '#4F8A8B'
                    }
                  }
                }}
              />
              <TextField
                label="To Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&.Mui-focused fieldset': {
                      borderColor: '#4F8A8B'
                    }
                  }
                }}
              />
            </Box>

            {/* Sort By */}
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#4F8A8B'
                    }
                  }
                }}
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Action Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ClearAllIcon />}
                onClick={onClearFilters}
                sx={{
                  borderColor: '#4F8A8B',
                  color: '#4F8A8B',
                  fontWeight: 600,
                  borderRadius: '12px',
                  '&:hover': {
                    backgroundColor: 'rgba(79, 138, 139, 0.05)',
                    borderColor: '#4F8A8B'
                  }
                }}
              >
                Clear All Filters
              </Button>
              <Button
                variant="contained"
                onClick={() => setExpandFilters(false)}
                sx={{
                  background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                  fontWeight: 600,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(79, 138, 139, 0.3)'
                  }
                }}
              >
                Apply Filters
              </Button>
            </Stack>
          </Stack>
        </Collapse>
      </Paper>
    </motion.div>
  );
};

export default BookingFiltersBar;
