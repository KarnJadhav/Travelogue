import React from 'react';
import { Paper, Typography, Box, Avatar, LinearProgress, alpha } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { motion } from 'framer-motion';

export default function StatsCard({
  label,
  value,
  icon: Icon,
  color = '#2563eb',
  trend = null,
  trendValue = null,
  percentage = null,
  subtitle = null,
  onClick = null,
  loading = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22 }}
      style={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '14px',
          p: 2.25,
          minHeight: 158,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 14px 32px rgba(15,23,42,0.05)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 0 auto 0',
            height: 3,
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.55)})`,
          },
        }}
        onClick={onClick}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
          <Typography sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.35 }}>{label}</Typography>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 34, height: 34 }}>
            {Icon && <Icon fontSize="small" />}
          </Avatar>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1.55rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            {loading ? '...' : value}
          </Typography>
          {subtitle && <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mt: 0.45 }}>{subtitle}</Typography>}
        </Box>

        {typeof percentage === 'number' || typeof percentage === 'string' ? (
          <Box sx={{ mb: 0.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Progress</Typography>
              <Typography sx={{ color, fontSize: '0.7rem', fontWeight: 600 }}>{percentage}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Number(percentage) || 0}
              sx={{
                height: 6,
                borderRadius: 999,
                backgroundColor: alpha(color, 0.12),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 999,
                },
              }}
            />
          </Box>
        ) : null}

        {trend !== null && trendValue !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, mt: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, color: trend === 'up' ? '#16a34a' : '#dc2626' }}>
              {trend === 'up' ? <TrendingUpIcon sx={{ fontSize: '0.9rem' }} /> : <TrendingDownIcon sx={{ fontSize: '0.9rem' }} />}
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{Math.abs(trendValue)}%</Typography>
            </Box>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>month over month</Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
}
