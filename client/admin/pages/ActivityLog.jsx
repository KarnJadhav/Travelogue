import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Avatar,
  Button,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import { motion } from 'framer-motion';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  ThumbDown as RejectIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Block as BlockIcon,
  LockOpen as UnblockIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { formatDateTime, formatTimeAgo, toSentenceCase, getStatusColor } from '../services/utilityService';
import { exportToCSV } from '../services/exportService';
import { getActivityLog } from '../services/adminService';

const ACTIVITY_ICONS = {
  create: { icon: '➕', color: '#22c55e' },
  update: { icon: '✏️', color: '#3b82f6' },
  delete: { icon: '🗑️', color: '#ef4444' },
  approve: { icon: '✅', color: '#22c55e' },
  reject: { icon: '❌', color: '#ef4444' },
  hide: { icon: '👁️', color: '#fbbf24' },
  unhide: { icon: '👁️', color: '#22c55e' },
  block: { icon: '🚫', color: '#ef4444' },
  unblock: { icon: '✅', color: '#22c55e' },
  login: { icon: '🔐', color: '#3b82f6' },
  logout: { icon: '🚪', color: '#94a3b8' },
  default: { icon: '○', color: '#6b7280' },
};

export default function ActivityLog() {
  const theme = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    user: '',
    startDate: '',
    endDate: '',
  });
  const [filteredActivities, setFilteredActivities] = useState([]);

  useEffect(() => {
    fetchActivityLog();
  }, []);

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      const response = await getActivityLog();
      setActivities(response.data.activities || []);
      setFilteredActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching activity log:', error);
      // Use mock data for demo
      const mockActivities = generateMockActivities();
      setActivities(mockActivities);
      setFilteredActivities(mockActivities);
    }
    setLoading(false);
  };

  const generateMockActivities = () => {
    const types = ['approve', 'reject', 'delete', 'hide', 'update', 'create'];
    const items = ['Guide', 'Review', 'Travelogue', 'User', 'Destination'];
    const activities = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setHours(date.getHours() - i);
      
      activities.push({
        id: `activity-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        item: items[Math.floor(Math.random() * items.length)],
        itemId: `id-${i}`,
        itemName: `${items[Math.floor(Math.random() * items.length)]} #${i}`,
        user: `Admin User`,
        userId: '1',
        description: `${types[Math.floor(Math.random() * types.length)]} action on ${items[Math.floor(Math.random() * items.length)]}`,
        timestamp: date.toISOString(),
        details: {},
      });
    }
    return activities;
  };

  useEffect(() => {
    let filtered = [...activities];

    if (filters.type) {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    if (filters.user) {
      filtered = filtered.filter(a => a.user.toLowerCase().includes(filters.user.toLowerCase()));
    }

    if (filters.startDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(a => new Date(a.timestamp) <= endDate);
    }

    setFilteredActivities(filtered);
  }, [filters, activities]);

  const handleExport = () => {
    const exportData = filteredActivities.map(a => ({
      'Type': toSentenceCase(a.type),
      'Item': `${a.item} - ${a.itemName}`,
      'User': a.user,
      'Description': a.description,
      'Timestamp': formatDateTime(a.timestamp),
    }));
    exportToCSV(exportData, `activity-log-${new Date().toISOString().split('T')[0]}`);
  };

  const getActivityIcon = (type) => {
    return ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;
  };

  const activityStats = React.useMemo(() => {
    return {
      total: activities.length,
      today: activities.filter(a => {
        const actDate = new Date(a.timestamp);
        const today = new Date();
        return actDate.toDateString() === today.toDateString();
      }).length,
    };
  }, [activities]);

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Activity Log
        </Typography>
        <Typography color="text.secondary">
          Track all admin actions and system activities
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Activities', value: activityStats.total, color: '#3b82f6' },
          { label: "Today's Activities", value: activityStats.today, color: '#22c55e' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)}, ${alpha(stat.color, 0.05)})`,
                  border: `1px solid ${alpha(stat.color, 0.2)}`,
                }}
              >
                <Typography color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color }}>
                  {stat.value}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Activity Type"
              select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              size="small"
            >
              <MenuItem value="">All Types</MenuItem>
              {['create', 'update', 'delete', 'approve', 'reject', 'hide', 'block'].map(type => (
                <MenuItem key={type} value={type}>{toSentenceCase(type)}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Admin Name"
              placeholder="Search..."
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="From"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="To"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setFilters({ type: '', user: '', startDate: '', endDate: '' })}
              >
                Clear Filters
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Activity Timeline */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredActivities.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No activities found</Typography>
        </Paper>
      ) : (
        <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Timeline position="alternate">
            {filteredActivities.map((activity, index) => {
              const icon = getActivityIcon(activity.type);
              return (
                <TimelineItem key={activity.id}>
                  <TimelineOppositeContent color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDateTime(activity.timestamp)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {formatTimeAgo(activity.timestamp)}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot
                      sx={{
                        bgcolor: icon.color,
                        boxShadow: `0 0 0 4px ${alpha(icon.color, 0.1)}`,
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {icon.icon}
                    </TimelineDot>
                    {index !== filteredActivities.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ pb: 2 }}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          bgcolor: alpha(icon.color, 0.05),
                          border: `1px solid ${alpha(icon.color, 0.2)}`,
                          borderRadius: 2,
                          p: 2,
                        }}
                      >
                        <CardContent sx={{ p: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Chip
                                label={toSentenceCase(activity.type)}
                                size="small"
                                sx={{
                                  bgcolor: alpha(icon.color, 0.2),
                                  color: icon.color,
                                  fontWeight: 600,
                                  mb: 1,
                                }}
                              />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {activity.itemName}
                              </Typography>
                            </Box>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: alpha(icon.color, 0.2),
                                color: icon.color,
                                fontSize: '0.75rem',
                              }}
                            >
                              {activity.user.charAt(0)}
                            </Avatar>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            By {activity.user} • {formatTimeAgo(activity.timestamp)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        </Paper>
      )}
    </Box>
  );
}
