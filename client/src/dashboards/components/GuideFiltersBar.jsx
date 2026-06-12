import React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Slider,
  Chip,
  Stack,
  Button,
  InputAdornment,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';

export default function GuideFiltersBar({
  search,
  onSearchChange,
  language,
  onLanguageChange,
  minRating,
  onMinRatingChange,
  maxPrice,
  onMaxPriceChange,
  availabilityFilter = 'all',
  onAvailabilityFilterChange = () => {},
  allLanguages,
  onClear,
  guideCount,
}) {
  const [showFilters, setShowFilters] = React.useState(false);
  const [ratingValue, setRatingValue] = React.useState(minRating || 0);
  const [priceValue, setPriceValue] = React.useState(maxPrice || 10000);

  const handleRatingChange = (event, value) => {
    setRatingValue(value);
    onMinRatingChange(value || '');
  };

  const handlePriceChange = (event, value) => {
    setPriceValue(value);
    onMaxPriceChange(value || '');
  };

  const activeFilters = [
    search && `Search: "${search}"`,
    language !== 'All Languages' && `Language: ${language}`,
    minRating && `Rating: ${minRating}★+`,
    maxPrice && `Price: ₹0-${maxPrice}`,
  ].filter(Boolean).length + (availabilityFilter !== 'all' ? 1 : 0);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main Filter Bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          p: 3,
          bgcolor: '#ffffff',
          borderRadius: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          mb: 2,
        }}
      >
        {/* Search Field */}
        <TextField
          placeholder="Search by name, location, or language..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            flex: { md: 1 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#f8f9fa',
              transition: 'all 0.3s ease',
              '&:hover': { backgroundColor: '#f0f2f5' },
              '&.Mui-focused': {
                backgroundColor: '#fff',
                boxShadow: '0 0 0 3px rgba(79, 138, 139, 0.1)',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#4F8A8B', mr: 1 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Language Select */}
        <Select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          size="small"
          sx={{
            minWidth: 180,
            borderRadius: 2,
            backgroundColor: '#f8f9fa',
            transition: 'all 0.3s ease',
            '&:hover': { backgroundColor: '#f0f2f5' },
            '&.Mui-focused': {
              backgroundColor: '#fff',
              boxShadow: '0 0 0 3px rgba(79, 138, 139, 0.1)',
            },
          }}
        >
          <MenuItem value="All Languages">All Languages</MenuItem>
          {allLanguages.map((lang) => (
            <MenuItem key={lang} value={lang}>
              {lang}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={availabilityFilter}
          onChange={(e) => onAvailabilityFilterChange(e.target.value)}
          size="small"
          sx={{
            minWidth: 170,
            borderRadius: 2,
            backgroundColor: '#f8f9fa',
            transition: 'all 0.3s ease',
            '&:hover': { backgroundColor: '#f0f2f5' },
            '&.Mui-focused': {
              backgroundColor: '#fff',
              boxShadow: '0 0 0 3px rgba(79, 138, 139, 0.1)',
            },
          }}
        >
          <MenuItem value="all">All Availability</MenuItem>
          <MenuItem value="available">Available Now</MenuItem>
          <MenuItem value="unavailable">Unavailable</MenuItem>
        </Select>

        {/* Toggle Filters Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowFilters(!showFilters)}
          sx={{
            borderRadius: 2,
            borderColor: '#4F8A8B',
            color: '#4F8A8B',
            fontWeight: 700,
            minWidth: 140,
            '&:hover': {
              backgroundColor: 'rgba(79, 138, 139, 0.08)',
            },
          }}
          startIcon={<TuneIcon />}
        >
          {showFilters ? 'Hide' : 'More'} Filters
          {activeFilters > 0 && (
            <Chip
              label={activeFilters}
              size="small"
              sx={{
                ml: 1,
                height: 20,
                backgroundColor: '#4F8A8B',
                color: 'white',
              }}
            />
          )}
        </Button>

        {/* Clear All */}
        {activeFilters > 0 && (
          <Button
            variant="text"
            size="small"
            onClick={onClear}
            sx={{
              color: '#ef4444',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
              },
            }}
            startIcon={<CloseIcon sx={{ fontSize: 18 }} />}
          >
            Clear
          </Button>
        )}
      </Stack>

      {/* Expanded Filters */}
      <Collapse in={showFilters}>
        <Box
          sx={{
            p: 3,
            bgcolor: '#f8f9fa',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
            mb: 2,
          }}
        >
          <Stack spacing={3}>
            {/* Rating Slider */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Minimum Rating
                </Typography>
                <Chip
                  label={`${ratingValue}★ & up`}
                  size="small"
                  sx={{
                    backgroundColor: '#fbbf24',
                    color: '#78350f',
                    fontWeight: 700,
                  }}
                />
              </Stack>
              <Slider
                value={ratingValue}
                onChange={handleRatingChange}
                min={0}
                max={5}
                step={0.5}
                marks={[
                  { value: 0, label: '0★' },
                  { value: 2.5, label: '2.5★' },
                  { value: 5, label: '5★' },
                ]}
                valueLabelDisplay="auto"
                sx={{
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#4F8A8B',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#4F8A8B',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#e5e7eb',
                  },
                }}
              />
            </Box>

            {/* Price Slider */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Maximum Price
                </Typography>
                <Chip
                  label={`₹0 - ₹${priceValue}/day`}
                  size="small"
                  sx={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    fontWeight: 700,
                  }}
                />
              </Stack>
              <Slider
                value={priceValue}
                onChange={handlePriceChange}
                min={0}
                max={10000}
                step={100}
                marks={[
                  { value: 0, label: '₹0' },
                  { value: 5000, label: '₹5k' },
                  { value: 10000, label: '₹10k' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `₹${value}`}
                sx={{
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#4F8A8B',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#4F8A8B',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#e5e7eb',
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>
      </Collapse>

      {/* Results Count */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          {guideCount} {guideCount === 1 ? 'guide' : 'guides'} found
        </Typography>
        {activeFilters > 0 && (
          <Typography variant="caption" sx={{ color: '#4F8A8B', fontWeight: 600 }}>
            {activeFilters} active filter{activeFilters !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
