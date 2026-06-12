import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Alert,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  alpha,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import HotelIcon from '@mui/icons-material/Hotel';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DescriptionIcon from '@mui/icons-material/Description';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../../src/api';
import StatsCard from '../components/StatsCard';
import { notificationManager } from '../services/notificationService';

const surfaceSx = {
  borderRadius: '14px',
  p: 2.25,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 16px 32px rgba(15,23,42,0.05)',
};

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    touristCount: 0,
    guideCount: 0,
    hotelCount: 0,
    hospitalCount: 0,
    travelogueCount: 0,
    chatCount: 0,
    pendingGuides: 0,
  });
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [timeRange, setTimeRange] = useState('week');

  const fetchActivityTrend = async (period) => {
    setTrendLoading(true);
    try {
      const res = await api.get(`/adminDashboard/activity-trend?period=${period}`);
      setTrendData(res?.data?.points || []);
    } catch (err) {
      console.error('Error loading trend data:', err);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await api.get('/adminDashboard/dashboard-stats');
        const nextStats = res.data || {};
        setStats(nextStats);
      } catch (err) {
        console.error('Error:', err);
        notificationManager.error('Failed to load dashboard stats');
      }
      setLoading(false);
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setAdminName(user?.name || 'Admin');
    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchActivityTrend(timeRange);
  }, [timeRange]);

  const statCards = [
    { label: 'Total Tourists', value: stats.touristCount, icon: GroupIcon, color: '#2563eb', trend: 'up', trendValue: 12, subtitle: 'Active users' },
    { label: 'Total Guides', value: stats.guideCount, icon: PersonAddAltIcon, color: '#16a34a', trend: 'up', trendValue: 8, subtitle: 'Verified guides' },
    { label: 'Total Hotels', value: stats.hotelCount, icon: HotelIcon, color: '#7c3aed', trend: 'up', trendValue: 5, subtitle: 'Partner hotels' },
    { label: 'Active Chats', value: stats.chatCount, icon: ChatBubbleOutlineIcon, color: '#0891b2', subtitle: 'Ongoing conversations' },
    { label: 'Pending Approvals', value: stats.pendingGuides, icon: WarningAmberIcon, color: '#d97706', percentage: (stats.pendingGuides / Math.max(stats.guideCount, 1) * 100).toFixed(0), subtitle: 'Awaiting review' },
    { label: 'Total Travelogues', value: stats.travelogueCount, icon: DescriptionIcon, color: '#4f46e5', trend: 'up', trendValue: 15, subtitle: 'User stories' },
    { label: 'Emergency Requests', value: 0, icon: ReportProblemIcon, color: '#dc2626', subtitle: 'Critical alerts' },
  ];

  const pieData = [
    { name: 'Tourists', value: stats.touristCount, color: '#2563eb' },
    { name: 'Guides', value: stats.guideCount, color: '#16a34a' },
    { name: 'Hotels', value: stats.hotelCount, color: '#7c3aed' },
    { name: 'Hospitals', value: stats.hospitalCount, color: '#dc2626' },
  ].filter((d) => d.value > 0);
  const distributionTotal = pieData.reduce((sum, item) => sum + item.value, 0);

  const alerts = [
    { id: 1, severity: 'warning', message: `${stats.pendingGuides} guides pending approval`, action: 'Review' },
    { id: 2, severity: 'info', message: 'System running smoothly', action: 'Details' },
  ];
  const totalUsers = (stats.touristCount || 0) + (stats.guideCount || 0);
  const totalServices = (stats.hotelCount || 0) + (stats.hospitalCount || 0);
  const guideApprovalRate = stats.guideCount ? (((stats.guideCount - stats.pendingGuides) / stats.guideCount) * 100).toFixed(1) : '100.0';
  const serviceCoverage = totalUsers ? ((totalServices / totalUsers) * 100).toFixed(1) : '0.0';
  const chatLoad = totalUsers ? ((stats.chatCount / totalUsers) * 100).toFixed(1) : '0.0';
  const metricCards = [
    { label: 'Guide Approval Rate', value: `${guideApprovalRate}%`, progress: Number(guideApprovalRate), color: '#2563eb' },
    { label: 'Service Coverage', value: `${serviceCoverage}%`, progress: Math.min(Number(serviceCoverage), 100), color: '#16a34a' },
    { label: 'Active Chat Load', value: `${chatLoad}%`, progress: Math.min(Number(chatLoad), 100), color: '#7c3aed' },
  ];

  return (
    <Box sx={{ p: 0 }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <Paper
          elevation={0}
          sx={{
            ...surfaceSx,
            mb: 3,
            background:
              'linear-gradient(140deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.95) 55%, rgba(37,99,235,0.82) 100%)',
            color: '#e2e8f0',
            border: 'none',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography sx={{ fontSize: { xs: '1.45rem', md: '1.75rem' }, fontWeight: 700, letterSpacing: '-0.4px' }}>
                Welcome back, {adminName}
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: '#cbd5e1', mt: 0.6, maxWidth: 680 }}>
                Everything important in one place: approvals, trust signals, and growth metrics across your travel platform.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                <Chip label="Live Monitoring" size="small" sx={{ bgcolor: alpha('#22c55e', 0.22), color: '#bbf7d0', borderRadius: '8px', fontWeight: 600 }} />
                <Chip label="SaaS Console" size="small" sx={{ bgcolor: alpha('#60a5fa', 0.22), color: '#dbeafe', borderRadius: '8px', fontWeight: 600 }} />
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ ...surfaceSx, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Platform Activity Trend</Typography>
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                size="small"
                onChange={(_, value) => {
                  if (value) setTimeRange(value);
                }}
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontSize: '12px',
                    px: 1.25,
                    borderRadius: '8px !important',
                  },
                }}
              >
                <ToggleButton value="day">Day</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ height: 290 }}>
              {trendLoading ? (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="u1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.06} />
                      </linearGradient>
                      <linearGradient id="u2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#94a3b8', 0.25)} />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [Number(value).toLocaleString()]}
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 12px 22px rgba(15,23,42,0.10)',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <Area type="monotone" dataKey="usersTotal" stroke="#2563eb" fill="url(#u1)" strokeWidth={2.2} name="Users" />
                    <Area type="monotone" dataKey="servicesTotal" stroke="#16a34a" fill="url(#u2)" strokeWidth={2.2} name="Services" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} useFlexGap flexWrap="wrap">
              <Chip label={`Users: ${(stats.touristCount || 0) + (stats.guideCount || 0)}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }} />
              <Chip label={`Services: ${(stats.hotelCount || 0) + (stats.hospitalCount || 0)}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }} />
              <Chip label={`Travelogues: ${stats.travelogueCount || 0}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600 }} />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ ...surfaceSx, height: '100%' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', mb: 1.5 }}>User Distribution</Typography>
            <Box sx={{ height: 250, mb: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={2}
                    label={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString()]}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 12px 22px rgba(15,23,42,0.10)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {pieData.map((item) => {
                const share = distributionTotal ? ((item.value / distributionTotal) * 100).toFixed(1) : '0.0';
                return (
                  <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: item.color }} />
                      <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{item.name}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                      {item.value} ({share}%)
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ ...surfaceSx, mb: 3 }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', mb: 1.5 }}>System Alerts</Typography>
        <Stack spacing={1.2}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severity}
              action={<Button color="inherit" size="small">{alert.action}</Button>}
              sx={{ borderRadius: '10px' }}
            >
              {alert.message}
            </Alert>
          ))}
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        {metricCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, md: 4 }}>
            <Card elevation={0} sx={{ ...surfaceSx, p: 0 }}>
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', mt: 0.45 }}>{item.value}</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ color: '#16a34a' }} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  sx={{
                    height: 6,
                    borderRadius: 99,
                    backgroundColor: alpha(item.color, 0.14),
                    '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 99 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
