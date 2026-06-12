/**
 * MapLegend.jsx - Interactive map legend with filtering capabilities
 */

import React from 'react';
import { Paper, Typography, Box, Chip, Tooltip } from '@mui/material';
import { POI_CATEGORIES } from '../../services/mapService';

const MapLegend = ({ activeFilters = [], onFilterChange = null, isCollapsed = false }) => {
  const categoryArray = Object.entries(POI_CATEGORIES).filter(([key]) => key !== 'default');

  const toggleFilter = (category) => {
    if (onFilterChange) {
      const newFilters = activeFilters.includes(category)
        ? activeFilters.filter(f => f !== category)
        : [...activeFilters, category];
      onFilterChange(newFilters);
    }
  };

  if (isCollapsed) {
    return (
      <Tooltip title="Map Legend - Click to expand">
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            p: 1.5,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            }
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B' }}>
            📍 Map Info
          </Typography>
        </Paper>
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        p: 2,
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        maxWidth: '280px',
        maxHeight: '60vh',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(79, 138, 139, 0.5)',
          borderRadius: '10px',
          '&:hover': {
            background: 'rgba(79, 138, 139, 0.7)',
          }
        }
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2, pb: 2, borderBottom: '2px solid #f0f0f0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#1a1a1a' }}>
          📍 Map Legend
        </Typography>
        <Typography variant="caption" sx={{ color: '#6B7280', lineHeight: 1.4 }}>
          Click markers to view details. Use filters below to show/hide categories.
        </Typography>
      </Box>

      {/* Destination Marker */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5, display: 'block' }}>
          Markers:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'rgba(79, 138, 139, 0.05)', borderRadius: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            📍
          </Box>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            Destination / Place
          </Typography>
        </Box>
      </Box>

      {/* Category Filters */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1, display: 'block' }}>
          Categories:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {categoryArray.map(([category, data]) => (
            <Chip
              key={category}
              icon={<span>{data.icon}</span>}
              label={data.label}
              onClick={() => toggleFilter(category)}
              variant={activeFilters.includes(category) ? 'filled' : 'outlined'}
              sx={{
                backgroundColor: activeFilters.includes(category) ? data.color : 'transparent',
                color: activeFilters.includes(category) ? 'white' : data.color,
                borderColor: data.color,
                cursor: 'pointer',
                fontSize: '10px',
                height: '24px',
                '& .MuiChip-icon': {
                  marginLeft: '4px',
                  marginRight: '-6px',
                  fontSize: '12px'
                },
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 2px 8px ${data.color}40`
                }
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Tips */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1, borderLeft: '3px solid #4F8A8B' }}>
        <Typography variant="caption" sx={{ color: '#4F8A8B', fontWeight: 600, display: 'block', mb: 0.5 }}>
          💡 Tips:
        </Typography>
        <Typography variant="caption" sx={{ color: '#6B7280', lineHeight: 1.4, display: 'block' }}>
          • Zoom in for more details<br/>
          • Use search to find specific places<br/>
          • Enable location for nearby POIs<br/>
          • Click chips to filter by type
        </Typography>
      </Box>
    </Paper>
  );
};

export default MapLegend;
