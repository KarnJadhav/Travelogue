import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BookIcon from '@mui/icons-material/Book';
import GroupIcon from '@mui/icons-material/Group';
import HotelIcon from '@mui/icons-material/Hotel';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../../src/api';

const emptyReports = {
  totals: {},
  distributions: {
    roles: [],
    guideStatus: [],
    travelogueStatus: [],
    bookingStatus: [],
  },
  highlights: {},
  trends: {
    userGrowth: [],
    revenue: [],
  },
  recentHotelBookings: [],
};

const surfaceSx = {
  borderRadius: '14px',
  p: 2.25,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 16px 32px rgba(15,23,42,0.05)',
};

const chartColors = ['#2563eb', '#16a34a', '#7c3aed', '#dc2626', '#0891b2', '#f59e0b'];

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatRating = (value) => (Number(value || 0) ? Number(value).toFixed(1) : '0.0');

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function SummaryCard({ label, value, subtitle, icon: Icon, color }) {
  return (
    <Card elevation={0} sx={{ ...surfaceSx, p: 0, height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography sx={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>{label}</Typography>
            <Typography sx={{ color: '#0f172a', fontSize: '1.65rem', fontWeight: 800, mt: 0.55 }}>
              {value}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.78rem', mt: 0.45 }}>{subtitle}</Typography>
          </Box>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              color,
              bgcolor: alpha(color, 0.12),
            }}
          >
            <Icon fontSize="small" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HighlightCard({ title, value, subtitle, fallback }) {
  return (
    <Paper elevation={0} sx={{ ...surfaceSx, height: '100%' }}>
      <Typography sx={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </Typography>
      <Typography sx={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800, mt: 1 }}>
        {value || fallback}
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mt: 0.55 }}>{subtitle || 'No data yet'}</Typography>
    </Paper>
  );
}

export default function AnalyticsReports() {
  const [period, setPeriod] = useState('month');
  const [reports, setReports] = useState(emptyReports);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/adminDashboard/reports?period=${period}`);
        if (!active) return;
        setReports({
          ...emptyReports,
          ...(res.data || {}),
          distributions: {
            ...emptyReports.distributions,
            ...(res.data?.distributions || {}),
          },
          trends: {
            ...emptyReports.trends,
            ...(res.data?.trends || {}),
          },
          recentHotelBookings: res.data?.recentHotelBookings || [],
        });
      } catch (err) {
        if (!active) return;
        setReports(emptyReports);
        setError(err?.response?.data?.message || 'Failed to load admin reports.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();
    return () => {
      active = false;
    };
  }, [period]);

  const roleDistribution = useMemo(
    () => (reports.distributions.roles || []).filter((item) => Number(item.value) > 0),
    [reports.distributions.roles]
  );

  const averageRating = useMemo(() => {
    const guideRating = Number(reports.totals.avgGuideRating) || 0;
    const hotelRating = Number(reports.totals.avgHotelRating) || 0;
    if (guideRating && hotelRating) return (guideRating + hotelRating) / 2;
    return guideRating || hotelRating || 0;
  }, [reports.totals.avgGuideRating, reports.totals.avgHotelRating]);

  const summaryCards = [
    {
      label: 'Registered Users',
      value: loading ? '--' : formatNumber(reports.totals.users),
      subtitle: `${formatNumber(reports.totals.tourists)} tourists, ${formatNumber(reports.totals.guides)} guides`,
      icon: GroupIcon,
      color: '#2563eb',
    },
    {
      label: 'Total Bookings',
      value: loading ? '--' : formatNumber(reports.totals.bookings),
      subtitle: `${formatNumber(reports.totals.guideBookings)} guide, ${formatNumber(reports.totals.hotelBookings)} hotel`,
      icon: HotelIcon,
      color: '#16a34a',
    },
    {
      label: 'Booking Revenue',
      value: loading ? '--' : formatCurrency(reports.totals.revenue),
      subtitle: 'Guide and hotel booking value',
      icon: TrendingUpIcon,
      color: '#7c3aed',
    },
    {
      label: 'Reviews',
      value: loading ? '--' : formatNumber(reports.totals.reviews),
      subtitle: `${formatRating(averageRating)} average rating`,
      icon: RateReviewIcon,
      color: '#f59e0b',
    },
  ];

  const highlights = reports.highlights || {};

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <Paper elevation={0} sx={{ ...surfaceSx, mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                  <AssessmentIcon fontSize="small" />
                </Box>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Analytics & Reports</Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                Real platform data from users, bookings, reviews, hotels, guides, and travelogues.
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={period}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) setPeriod(value);
              }}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontSize: '12px',
                  px: 1.4,
                  borderRadius: '8px !important',
                },
              }}
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="year">Year</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>
      </motion.div>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <SummaryCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={3}>
          <HighlightCard
            title="Most Viewed Travelogue"
            value={highlights.mostViewedTravelogue?.title}
            subtitle={
              highlights.mostViewedTravelogue
                ? `${formatNumber(highlights.mostViewedTravelogue.value)} views - ${highlights.mostViewedTravelogue.subtitle}`
                : ''
            }
            fallback="No travelogues"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <HighlightCard
            title="Popular Destination"
            value={highlights.popularDestination?.title}
            subtitle={
              highlights.popularDestination
                ? `${formatNumber(highlights.popularDestination.value)} travelogues - ${highlights.popularDestination.subtitle}`
                : ''
            }
            fallback="No destination"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <HighlightCard
            title="Top Guide"
            value={highlights.topGuide?.title}
            subtitle={
              highlights.topGuide
                ? `${formatNumber(highlights.topGuide.value)} bookings - ${formatCurrency(highlights.topGuide.revenue)}`
                : ''
            }
            fallback="No guide bookings"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <HighlightCard
            title="Top Hotel"
            value={highlights.topHotel?.title}
            subtitle={
              highlights.topHotel
                ? `${formatNumber(highlights.topHotel.value)} bookings - ${formatCurrency(highlights.topHotel.revenue)}`
                : ''
            }
            fallback="No hotel bookings"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ ...surfaceSx, height: 380 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Revenue Trend</Typography>
              <Chip size="small" label={formatCurrency(reports.totals.revenue)} sx={{ borderRadius: '8px', bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 700 }} />
            </Stack>
            {loading ? (
              <Box sx={{ height: 300, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={reports.trends.revenue || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hotelRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="guideRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#94a3b8', 0.25)} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                  <Area type="monotone" dataKey="hotelRevenue" name="Hotel revenue" stroke="#2563eb" fill="url(#hotelRevenue)" strokeWidth={2.2} />
                  <Area type="monotone" dataKey="guideRevenue" name="Guide revenue" stroke="#16a34a" fill="url(#guideRevenue)" strokeWidth={2.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ ...surfaceSx, height: 380 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', mb: 1.5 }}>User Distribution</Typography>
            {loading ? (
              <Box sx={{ height: 300, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : roleDistribution.length === 0 ? (
              <Typography sx={{ color: '#64748b', fontSize: '0.86rem' }}>No users yet.</Typography>
            ) : (
              <>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleDistribution} dataKey="value" nameKey="label" innerRadius={58} outerRadius={86} paddingAngle={2}>
                        {roleDistribution.map((entry, index) => (
                          <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatNumber(value), 'Users']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={1}>
                  {roleDistribution.map((item, index) => (
                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: chartColors[index % chartColors.length] }} />
                        <Typography sx={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{item.label}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{formatNumber(item.value)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ ...surfaceSx, height: 360 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', mb: 1.5 }}>User Growth</Typography>
            {loading ? (
              <Box sx={{ height: 280, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reports.trends.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha('#94a3b8', 0.25)} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatNumber(value), 'New users']} />
                  <Bar dataKey="tourists" name="Tourists" stackId="users" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="guides" name="Guides" stackId="users" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="hotels" name="Hotels" stackId="users" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ ...surfaceSx, minHeight: 360 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <BookIcon sx={{ color: '#2563eb' }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Operational Status</Typography>
            </Stack>
            {loading ? (
              <Box sx={{ height: 250, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 800, mb: 1 }}>Guide Verification</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(reports.distributions.guideStatus || []).map((item, index) => (
                      <Chip key={item.label} label={`${item.label}: ${formatNumber(item.value)}`} sx={{ borderRadius: '8px', bgcolor: alpha(chartColors[index], 0.12), color: chartColors[index], fontWeight: 700 }} />
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 800, mb: 1 }}>Travelogues</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(reports.distributions.travelogueStatus || []).map((item, index) => (
                      <Chip key={item.label} label={`${item.label}: ${formatNumber(item.value)}`} sx={{ borderRadius: '8px', bgcolor: alpha(chartColors[index + 1], 0.12), color: chartColors[index + 1], fontWeight: 700 }} />
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 800, mb: 1 }}>Bookings</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(reports.distributions.bookingStatus || []).map((item, index) => (
                      <Chip key={item.label} label={`${item.label}: ${formatNumber(item.value)}`} sx={{ borderRadius: '8px', bgcolor: alpha(chartColors[index % chartColors.length], 0.12), color: chartColors[index % chartColors.length], fontWeight: 700 }} />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ ...surfaceSx, p: 0, mt: 2.5, overflow: 'hidden' }}>
        <Box sx={{ p: 2.25, borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Recent Hotel Bookings</Typography>
          <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.4 }}>
            Latest tourist hotel bookings from the live booking collection.
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (reports.recentHotelBookings || []).length === 0 ? (
          <Box sx={{ p: 2.25 }}>
            <Typography sx={{ color: '#64748b', fontSize: '0.86rem' }}>No hotel bookings yet.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Tourist</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Hotel</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Stay</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Room</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Status</TableCell>
                  <TableCell align="right" sx={{ color: '#64748b', fontWeight: 800, fontSize: '12px' }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reports.recentHotelBookings || []).map((booking) => (
                  <TableRow key={booking.id} hover sx={{ '& td': { py: 1.45, fontSize: '13px' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {booking.touristName}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#64748b' }}>{booking.touristEmail || 'No email'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0f172a' }}>{booking.hotelName}</TableCell>
                    <TableCell sx={{ color: '#334155' }}>
                      {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
                    </TableCell>
                    <TableCell sx={{ color: '#334155' }}>
                      {booking.roomType} x {booking.roomCount || 1}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status}
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          bgcolor: booking.status === 'cancelled' ? '#fee2e2' : booking.status === 'completed' ? '#dcfce7' : '#fef3c7',
                          color: booking.status === 'cancelled' ? '#b91c1c' : booking.status === 'completed' ? '#166534' : '#92400e',
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: '#0f5132' }}>
                      {formatCurrency(booking.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
