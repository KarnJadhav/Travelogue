import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Checkbox,
  Tabs,
  Tab,
  Stack,
  alpha,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { motion } from 'framer-motion';
import api from '../../src/api';
import { notificationManager } from '../services/notificationService';
import { exportToCSV } from '../services/exportService';
import BulkActionToolbar from '../components/BulkActionToolbar';

const cardSx = {
  borderRadius: '14px',
  p: 2.25,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 16px 32px rgba(15, 23, 42, 0.05)',
};

const controlSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
  '& .MuiInputLabel-root': {
    fontSize: '12px',
    color: '#64748b',
  },
};

const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [reviewType, setReviewType] = useState('guide');
  const [selectedReview, setSelectedReview] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkApproveDialog, setBulkApproveDialog] = useState(false);
  const [bulkHideDialog, setBulkHideDialog] = useState(false);
  const [bulkFlagDialog, setBulkFlagDialog] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    hidden: '',
    flagged: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const apiBase = reviewType === 'hotel' ? '/adminHotelReview' : '/adminReview';
  const placeHeader = reviewType === 'hotel' ? 'Hotel' : 'Place';

  const fetchReviews = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.hidden !== '') params.append('hidden', filters.hidden);
      if (filters.flagged !== '') params.append('flagged', filters.flagged);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`${apiBase}/all-reviews?${params}`);
      setReviews(response.data.reviews || []);
      setPagination((prev) => ({ ...prev, page }));
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`${apiBase}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchReviews(1);
    fetchStats();
    setSelectedReviews(new Set());
    setSelectedReview(null);
  }, [reviewType]);

  useEffect(() => {
    fetchReviews(1);
  }, [filters]);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const response = await api.post(`${apiBase}/scan-all`);
      alert(`Scanned ${response.data.scanned} reviews. Flagged: ${response.data.flagged} reviews`);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error scanning reviews');
    } finally {
      setScanning(false);
    }
  };

  const handleHide = async (reviewId) => {
    const reason = prompt('Enter reason for hiding:');
    if (!reason) return;
    try {
      await api.put(`${apiBase}/hide/${reviewId}`, { reason });
      alert('Review hidden');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error hiding review');
    }
  };

  const handleUnhide = async (reviewId) => {
    try {
      await api.put(`${apiBase}/unhide/${reviewId}`);
      alert('Review unhidden');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error unhiding review');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure?')) return;
    const reason = prompt('Enter reason for deletion:');
    if (!reason) return;
    try {
      await api.delete(`${apiBase}/delete/${reviewId}`, { data: { reason } });
      alert('Review deleted');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error deleting review');
    }
  };

  const handleRestore = async (reviewId) => {
    try {
      await api.put(`${apiBase}/restore/${reviewId}`);
      notificationManager.success('Review restored successfully');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error restoring review');
    }
  };

  const handleSelectReview = (reviewId) => {
    const updated = new Set(selectedReviews);
    if (updated.has(reviewId)) {
      updated.delete(reviewId);
    } else {
      updated.add(reviewId);
    }
    setSelectedReviews(updated);
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map((r) => r._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteReason.trim()) {
      notificationManager.error('Please provide a reason for deletion');
      return;
    }
    try {
      await api.post(`${apiBase}/bulk-delete`, {
        reviewIds: Array.from(selectedReviews),
        reason: bulkDeleteReason,
      });
      notificationManager.success(`${selectedReviews.size} reviews deleted`);
      setSelectedReviews(new Set());
      setBulkDeleteDialog(false);
      setBulkDeleteReason('');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error deleting reviews');
    }
  };

  const handleBulkApprove = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'approve',
      });
      notificationManager.success(`${selectedReviews.size} reviews approved`);
      setSelectedReviews(new Set());
      setBulkApproveDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error approving reviews');
    }
  };

  const handleBulkHide = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'hide',
      });
      notificationManager.success(`${selectedReviews.size} reviews hidden`);
      setSelectedReviews(new Set());
      setBulkHideDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error hiding reviews');
    }
  };

  const handleBulkFlag = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'flag',
      });
      notificationManager.success(`${selectedReviews.size} reviews flagged`);
      setSelectedReviews(new Set());
      setBulkFlagDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error flagging reviews');
    }
  };

  const handleBulkExport = () => {
    if (selectedReviews.size === 0) {
      notificationManager.warning('Please select reviews to export');
      return;
    }
    const selectedData = reviews.filter((r) => selectedReviews.has(r._id));
    const exportData = selectedData.map((r) => ({
      Type: reviewType === 'hotel' ? 'Hotel' : 'Guide',
      Target: r.place || r.hotelId?.name || r.guideId?.name || 'Unknown',
      Rating: r.rating,
      Comment: r.comment,
      Status: r.status,
      Hidden: r.isHidden ? 'Yes' : 'No',
      Flagged: r.aiModeration?.isFlagged ? 'Yes' : 'No',
      'Risk Score': r.aiModeration?.confidence || 'N/A',
      Reviewer: r.userId?.name || r.touristId?.name || 'Unknown',
      Date: new Date(r.createdAt).toLocaleDateString(),
    }));
    exportToCSV(exportData, 'reviews-export');
    notificationManager.success('Reviews exported successfully');
  };

  const clearSelection = () => {
    setSelectedReviews(new Set());
  };

  const getRiskBadgeColor = (confidence) => {
    if (confidence >= 80) return '#dc2626';
    if (confidence >= 50) return '#f59e0b';
    if (confidence >= 30) return '#eab308';
    return '#16a34a';
  };

  const getRiskBadge = (review) => {
    const isFlagged = review?.aiModeration?.isFlagged;
    const confidence = review?.aiModeration?.confidence ?? 0;
    if (!isFlagged) {
      return { label: 'Safe', tone: '#166534', bg: '#dcfce7', caption: 'No risk detected' };
    }
    if (confidence >= 80) {
      return { label: 'High Risk', tone: '#b91c1c', bg: '#fee2e2', caption: `Confidence ${confidence}%` };
    }
    if (confidence >= 50) {
      return { label: 'Medium Risk', tone: '#92400e', bg: '#fef3c7', caption: `Confidence ${confidence}%` };
    }
    return { label: 'Low Risk', tone: '#854d0e', bg: '#fef9c3', caption: `Confidence ${confidence}%` };
  };

  const safeCount = reviews.filter((r) => !r?.aiModeration?.isFlagged).length;
  const flaggedCount = reviews.filter((r) => r?.aiModeration?.isFlagged).length;
  const hiddenCount = reviews.filter((r) => r?.isHidden).length;

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Paper elevation={0} sx={{ ...cardSx, mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', mb: 0.45 }}>Review Moderation Console</Typography>
          <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mb: 1.25 }}>
            AI-assisted trust and safety dashboard for guide and hotel feedback.
          </Typography>
          <Tabs
            value={reviewType}
            onChange={(event, value) => setReviewType(value)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '12.5px',
                fontWeight: 600,
                textTransform: 'none',
              },
            }}
          >
            <Tab label="Guide Reviews" value="guide" />
            <Tab label="Hotel Reviews" value="hotel" />
          </Tabs>
        </Paper>
      </motion.div>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Total Reviews', value: stats.totalReviews, color: '#2563eb' },
            { label: 'Visible', value: stats.visibleReviews, color: '#16a34a' },
            { label: 'Hidden', value: stats.hiddenReviews, color: '#dc2626' },
            { label: 'Flagged', value: stats.flaggedReviews, color: '#d97706' },
            { label: 'Deleted', value: stats.deletedReviews, color: '#7c3aed' },
          ].map((item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={2}
              key={item.label}
              sx={{ flexBasis: { lg: '20%' }, maxWidth: { lg: '20%' } }}
            >
              <Card elevation={0} sx={{ ...cardSx, p: 0, height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5 }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
        <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={8}>
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Moderation Filters
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#6b7280', mt: 0.25 }}>
              Filter by status, visibility, and AI signals to quickly find risky reviews.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setFilters({ status: '', hidden: '', flagged: '', search: '' })}
            >
              Clear
            </Button>
            <Button variant="contained" size="small" onClick={handleScanAll} disabled={scanning} startIcon={scanning ? <CircularProgress size={16} /> : <RateReviewIcon fontSize="small" />}>
              {scanning ? 'Scanning...' : 'AI Scan All'}
            </Button>
            <Button variant="outlined" size="small" onClick={() => { fetchReviews(pagination.page); fetchStats(); }}>
              Refresh
            </Button>
          </Grid>
        </Grid>

        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder={`Search by ${placeHeader.toLowerCase()} or comment`}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              sx={controlSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={controlSx}>
              <InputLabel shrink>Review Status</InputLabel>
              <Select
                label="Review Status"
                value={filters.status}
                displayEmpty
                renderValue={(value) => {
                  if (!value) return 'All Status';
                  return value.charAt(0).toUpperCase() + value.slice(1);
                }}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={controlSx}>
              <InputLabel shrink>Visibility</InputLabel>
              <Select
                label="Visibility"
                value={filters.hidden}
                displayEmpty
                renderValue={(value) => {
                  if (value === '') return 'All Visibility';
                  if (value === 'true') return 'Hidden Only';
                  return 'Visible Only';
                }}
                onChange={(e) => setFilters({ ...filters, hidden: e.target.value })}
              >
                <MenuItem value="">All Visibility</MenuItem>
                <MenuItem value="true">Hidden Only</MenuItem>
                <MenuItem value="false">Visible Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={controlSx}>
              <InputLabel shrink>AI Signal</InputLabel>
              <Select
                label="AI Signal"
                value={filters.flagged}
                displayEmpty
                renderValue={(value) => {
                  if (value === '') return 'All AI Signals';
                  if (value === 'true') return 'Flagged Only';
                  return 'Safe Only';
                }}
                onChange={(e) => setFilters({ ...filters, flagged: e.target.value })}
              >
                <MenuItem value="">All AI Signals</MenuItem>
                <MenuItem value="true">Flagged Only</MenuItem>
                <MenuItem value="false">Safe Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ ...cardSx, mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#374151', mb: 0.75 }}>AI Moderation Guide</Typography>
            <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
              Safe means no risky content detected. Flagged reviews are detected as potential abuse or toxicity.
            </Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip label={`Safe: ${safeCount}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }} />
              <Chip label={`Flagged: ${flaggedCount}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }} />
              <Chip label={`Hidden: ${hiddenCount}`} size="small" sx={{ borderRadius: '8px', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600 }} />
              <Chip label="Risk bands: Low (30+), Medium (50+), High (80+)" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {selectedReviews.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedReviews.size}
          actions={[
            { label: 'Approve', icon: <CheckCircleIcon fontSize="small" />, onClick: () => setBulkApproveDialog(true), color: 'success' },
            { label: 'Hide', icon: <VisibilityOffIcon fontSize="small" />, onClick: () => setBulkHideDialog(true), color: 'warning' },
            { label: 'Flag', icon: <FlagIcon fontSize="small" />, onClick: () => setBulkFlagDialog(true), color: 'error' },
            { label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => setBulkDeleteDialog(true), color: 'error' },
            { label: 'Export', icon: <FileDownloadIcon fontSize="small" />, onClick: handleBulkExport, color: 'primary' },
          ]}
          onClear={clearSelection}
        />
      )}

      <Paper elevation={0} sx={{ ...cardSx, p: 0 }}>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer sx={{ p: 2.5, overflowX: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : reviews.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: '#6b7280' }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#374151', mb: 0.5 }}>
                  No reviews found
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#9ca3af' }}>
                  Try adjusting filters or refresh to load new data.
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 1060 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedReviews.size > 0 && selectedReviews.size < reviews.length}
                      checked={selectedReviews.size === reviews.length && reviews.length > 0}
                      onChange={handleSelectAll}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ width: 120, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>{placeHeader}</TableCell>
                  <TableCell align="center" sx={{ width: 70, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Rating</TableCell>
                  <TableCell sx={{ width: 300, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Comment</TableCell>
                  <TableCell sx={{ width: 120, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ width: 150, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>AI Risk</TableCell>
                  <TableCell align="right" sx={{ width: 130, fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review._id} hover sx={{ '& td': { py: 1.5, fontSize: '14px' }, bgcolor: selectedReviews.has(review._id) ? alpha('#2563eb', 0.05) : 'transparent' }}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedReviews.has(review._id)} onChange={() => handleSelectReview(review._id)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{review.place || review.hotelId?.name || review.guideId?.name || 'Unknown'}</TableCell>
                    <TableCell align="center">{review.rating}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {review.comment?.substring(0, 55)}...
                    </TableCell>
                    <TableCell>
                      <Chip label={review.status} size="small" sx={{ borderRadius: '8px', fontWeight: 600, bgcolor: review.status === 'approved' ? '#dcfce7' : review.status === 'pending' ? '#fef3c7' : '#fee2e2', color: review.status === 'approved' ? '#166534' : review.status === 'pending' ? '#92400e' : '#b91c1c' }} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const risk = getRiskBadge(review);
                        return (
                          <Box>
                            <Chip
                              icon={review?.aiModeration?.isFlagged ? <FlagIcon fontSize="small" /> : undefined}
                              label={risk.label}
                              size="small"
                              sx={{ borderRadius: '8px', bgcolor: risk.bg, color: risk.tone, fontWeight: 600, mb: 0.4 }}
                            />
                            <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>{risk.caption}</Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => { setSelectedReview(review); setOpenModal(true); }}
                          sx={{ border: '1px solid #bfdbfe', borderRadius: '8px' }}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                        {!review.isHidden ? (
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleHide(review._id)}
                            sx={{ border: '1px solid #fed7aa', borderRadius: '8px' }}
                          >
                            <VisibilityOffIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleUnhide(review._id)}
                            sx={{ border: '1px solid #bbf7d0', borderRadius: '8px' }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(review._id)}
                          sx={{ border: '1px solid #fecaca', borderRadius: '8px' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            )}
          </TableContainer>
        </Box>

        <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
          {loading ? (
            <Typography sx={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', py: 2 }}>Loading...</Typography>
          ) : reviews.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#374151', mb: 0.5 }}>No reviews found</Typography>
              <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Try changing filters or refresh.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {reviews.map((review) => {
                const risk = getRiskBadge(review);
                return (
                  <Paper key={review._id} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '10px', p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                          {review.place || review.hotelId?.name || review.guideId?.name || 'Unknown'}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Rating: {review.rating}</Typography>
                      </Box>
                      <Chip label={review.status} size="small" sx={{ borderRadius: '8px', fontWeight: 600, bgcolor: review.status === 'approved' ? '#dcfce7' : review.status === 'pending' ? '#fef3c7' : '#fee2e2', color: review.status === 'approved' ? '#166534' : review.status === 'pending' ? '#92400e' : '#b91c1c' }} />
                    </Box>

                    <Typography sx={{ fontSize: '13px', color: '#374151', mb: 1 }}>
                      {review.comment?.substring(0, 100)}...
                    </Typography>

                    <Box sx={{ mb: 1.25 }}>
                      <Chip
                        icon={review?.aiModeration?.isFlagged ? <FlagIcon fontSize="small" /> : undefined}
                        label={risk.label}
                        size="small"
                        sx={{ borderRadius: '8px', bgcolor: risk.bg, color: risk.tone, fontWeight: 600, mr: 1 }}
                      />
                      <Typography component="span" sx={{ fontSize: '11px', color: '#6b7280' }}>{risk.caption}</Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button size="small" variant="outlined" onClick={() => { setSelectedReview(review); setOpenModal(true); }}>View</Button>
                      {!review.isHidden ? (
                        <Button size="small" variant="outlined" color="warning" onClick={() => handleHide(review._id)}>Hide</Button>
                      ) : (
                        <Button size="small" variant="outlined" color="success" onClick={() => handleUnhide(review._id)}>Show</Button>
                      )}
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(review._id)}>Delete</Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Paper>

      <Dialog open={bulkDeleteDialog} onClose={() => setBulkDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete {selectedReviews.size} reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth multiline rows={3} placeholder="Enter reason for deletion..." value={bulkDeleteReason} onChange={(e) => setBulkDeleteReason(e.target.value)} label="Deletion reason" size="small" />
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={() => setBulkDeleteDialog(false)}>Cancel</Button>
          <Button size="small" variant="contained" color="error" onClick={handleBulkDelete} disabled={!bulkDeleteReason.trim()}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkApproveDialog} onClose={() => setBulkApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve {selectedReviews.size} reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>Are you sure you want to approve all selected reviews?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={() => setBulkApproveDialog(false)}>Cancel</Button>
          <Button size="small" variant="contained" color="success" onClick={handleBulkApprove}>Approve All</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkHideDialog} onClose={() => setBulkHideDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hide {selectedReviews.size} reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>Are you sure you want to hide all selected reviews?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={() => setBulkHideDialog(false)}>Cancel</Button>
          <Button size="small" variant="contained" color="warning" onClick={handleBulkHide}>Hide All</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkFlagDialog} onClose={() => setBulkFlagDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flag {selectedReviews.size} reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>Are you sure you want to flag all selected reviews for review?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={() => setBulkFlagDialog(false)}>Cancel</Button>
          <Button size="small" variant="contained" color="error" onClick={handleBulkFlag}>Flag All</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedReview && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>{placeHeader}</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{selectedReview.place || selectedReview.hotelId?.name || selectedReview.guideId?.name || 'Unknown'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Rating</Typography>
                <Typography sx={{ fontSize: '14px' }}>{selectedReview.rating}/5</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Comment</Typography>
                <Typography sx={{ fontSize: '14px', p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  {selectedReview.comment}
                </Typography>
              </Box>
              {selectedReview.aiModeration && (
                <Paper sx={{ p: 2, borderRadius: '12px', border: '1px solid #e5e7eb', bgcolor: selectedReview.aiModeration.isFlagged ? '#fff7ed' : '#f0fdf4' }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, mb: 1 }}>AI Analysis</Typography>
                  <Typography sx={{ fontSize: '13px' }}>Status: {selectedReview.aiModeration.isFlagged ? 'Flagged (Needs review)' : 'Safe (No major risk)'}</Typography>
                  <Typography sx={{ fontSize: '13px' }}>Confidence: {selectedReview.aiModeration.confidence}%</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    Risk Level: {selectedReview.aiModeration.confidence >= 80 ? 'High' : selectedReview.aiModeration.confidence >= 50 ? 'Medium' : selectedReview.aiModeration.confidence >= 30 ? 'Low' : 'Safe'}
                  </Typography>
                  {selectedReview.aiModeration.reason && <Typography sx={{ fontSize: '13px' }}>Reason: {selectedReview.aiModeration.reason}</Typography>}
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" onClick={() => setOpenModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewManagement;
