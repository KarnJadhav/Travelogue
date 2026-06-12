import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, Stack, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Menu, MenuItem, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../api';
import { buildImageUrl } from '../../utils/imageHelper';

const statusColors = {
  approved: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', text: '#10b981', label: 'Approved' },
  pending: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', label: 'Pending' },
  rejected: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Rejected' },
  draft: { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.2)', text: '#64748b', label: 'Draft' }
};

export default function MyTravelogues() {
  const [travelogues, setTravelogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedTravelogue, setSelectedTravelogue] = useState(null);
  const [error, setError] = useState('');
  const userId = JSON.parse(localStorage.getItem('user') || '{}')._id;

  useEffect(() => {
    fetchTravelogues();
  }, [statusFilter, page]);

  const fetchTravelogues = async () => {
    try {
      setLoading(true);
      setError('');
      const status = statusFilter !== 'all' ? statusFilter : null;
      const query = status ? `?status=${status}&page=${page}&limit=12` : `?page=${page}&limit=12`;
      const response = await API.get(`/travelogue/user/${userId}${query}`);
      
      setTravelogues(response.data.travelogues || []);
      setTotalPages(response.data.pages || 1);
      setTotalCount(response.data.total || 0);
    } catch (err) {
      setError('Failed to fetch travelogues');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/travelogue/${deleteConfirm._id}`);
      setTravelogues(travelogues.filter(t => t._id !== deleteConfirm._id));
      setDeleteConfirm(null);
      setMenuAnchor(null);
    } catch (err) {
      setError('Failed to delete travelogue');
      console.error(err);
    }
  };

  const filteredTravelogues = travelogues.filter((t) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const haystack = `${t.title || ''} ${t.description || ''} ${t.destination || ''} ${t.location || ''}`.toLowerCase();
    return haystack.includes(query);
  });

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F8FAFB', pb: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        
        {/* Header Cover Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 20px 48px rgba(15,23,42,0.06)',
            bgcolor: '#ffffff',
            mt: 2,
            mb: 4,
            p: { xs: 3, sm: 4 },
            border: '1px solid rgba(148, 163, 184, 0.12)'
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box>
              <Typography
                variant="h4"
                fontWeight={800}
                color="#0F172A"
                mb={1}
                sx={{ letterSpacing: '-0.5px', fontFamily: '"Sora", sans-serif' }}
              >
                My Travelogues
              </Typography>
              <Typography variant="body1" color="#64748B" fontWeight={500}>
                Refine, update, and manage your published travel journals and draft logs.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => window.dispatchEvent(new CustomEvent('travelogueSubTab', { detail: { tab: 'create' } }))}
              sx={{
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                px: 3.5,
                py: 1.3,
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 10px 24px rgba(79,138,139,0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5ea1a2 0%, #7cbfc3 100%)',
                  boxShadow: '0 12px 30px rgba(79, 138, 139, 0.35)',
                }
              }}
            >
              Write Travelogue
            </Button>
          </Stack>

          {/* Quick Info Box */}
          <Box
            sx={{
              mt: 4,
              p: 2.5,
              borderRadius: '20px',
              bgcolor: 'rgba(79,138,139,0.06)',
              border: '1px solid rgba(79,138,139,0.1)'
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#4F8A8B" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total stories shared
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ fontFamily: '"Sora", sans-serif', mt: 0.5 }}>
                  {totalCount}
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search your travelogues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  minWidth: { xs: '100%', sm: 300 },
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '12px', 
                    bgcolor: '#fff',
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B' }
                  }
                }}
              />
            </Stack>
          </Box>

          {/* Sliding status selectors */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} sx={{ mt: 3.5 }}>
            {['all', 'draft', 'pending', 'approved', 'rejected'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'contained' : 'outlined'}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'capitalize',
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  fontSize: '0.85rem',
                  ...(statusFilter === status ? {
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(79,138,139,0.25)',
                    borderColor: 'transparent'
                  } : {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    color: '#64748B',
                    '&:hover': {
                      borderColor: '#4F8A8B',
                      bgcolor: 'rgba(79,138,139,0.03)'
                    }
                  })
                }}
              >
                {status}
              </Button>
            ))}
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Content list Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#4F8A8B' }} />
          </Box>
        ) : travelogues.length === 0 ? (
          <Card elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '24px', border: '2px dashed rgba(148, 163, 184, 0.3)' }}>
            <TrendingUpIcon sx={{ fontSize: 54, color: '#4F8A8B', mb: 2, opacity: 0.4 }} />
            <Typography variant="h6" color="#334155" fontWeight={800} mb={1}>
              No travelogues yet
            </Typography>
            <Typography variant="body2" color="#64748B" mb={3}>
              Share your travel journals and itineraries with the world!
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.dispatchEvent(new CustomEvent('travelogueSubTab', { detail: { tab: 'create' } }))}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                px: 4,
                py: 1.2,
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              Write First Story
            </Button>
          </Card>
        ) : (
          <>
            <Grid container spacing={3.5} mb={4}>
              {filteredTravelogues.map(travelogue => {
                const statusInfo = statusColors[travelogue.status] || statusColors.draft;
                const thumbnailUrl = travelogue.images && travelogue.images[0]
                  ? buildImageUrl(travelogue.images[0])
                  : '/no-image.png';

                return (
                  <Grid item xs={12} sm={6} md={4} key={travelogue._id}>
                    <motion.div whileHover={{ y: -6 }} style={{ height: '100%' }}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: '24px',
                          overflow: 'hidden',
                          border: '1px solid rgba(148, 163, 184, 0.15)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
                          bgcolor: '#ffffff',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)'
                          }
                        }}
                      >
                        {/* Image Header with aspect ratio */}
                        <Box sx={{ position: 'relative', pt: '64%', bgcolor: '#f1f5f9' }}>
                          <Box
                            component="img"
                            src={thumbnailUrl}
                            alt={travelogue.title}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.target.src = '/no-image.png';
                            }}
                          />

                          {/* Status Badge */}
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              zIndex: 2,
                              bgcolor: statusInfo.bg,
                              color: statusInfo.text,
                              border: `1px solid ${statusInfo.border}`,
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              px: 0.5
                            }}
                          />

                          {/* Floating vertical menus */}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTravelogue(travelogue);
                              setMenuAnchor(e.currentTarget);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              zIndex: 2,
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                              backdropFilter: 'blur(4px)',
                              color: '#64748B',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              '&:hover': { bgcolor: '#fff' }
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* Content text block */}
                        <CardContent sx={{ flexGrow: 1, p: 2.5, pb: 1 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={800}
                            color="#0f172a"
                            mb={1.2}
                            sx={{
                              fontFamily: '"Sora", sans-serif',
                              fontSize: '1.05rem',
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {travelogue.title}
                          </Typography>

                          {/* Metadata row */}
                          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" gap={1}>
                            {travelogue.location && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LocationOnIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                                <Typography variant="caption" color="#64748B" fontWeight={700}>
                                  {travelogue.location}
                                </Typography>
                              </Stack>
                            )}
                            {travelogue.duration && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <CalendarTodayIcon sx={{ fontSize: 14, color: '#4F8A8B' }} />
                                <Typography variant="caption" color="#64748B" fontWeight={700}>
                                  {travelogue.duration} Days
                                </Typography>
                              </Stack>
                            )}
                          </Stack>

                          <Typography
                            variant="body2"
                            color="#64748B"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.5
                            }}
                          >
                            {travelogue.description}
                          </Typography>
                        </CardContent>

                        {/* Footer row metrics */}
                        <Box sx={{ px: 2.5, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                          <Stack direction="row" spacing={2} justifyContent="space-around">
                            <Stack alignItems="center">
                              <Typography variant="body2" fontWeight={800} color="#4F8A8B">
                                {travelogue.views || 0}
                              </Typography>
                              <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                VIEWS
                              </Typography>
                            </Stack>
                            <Stack alignItems="center">
                              <Typography variant="body2" fontWeight={800} color="#ef4444">
                                {travelogue.likes?.length || 0}
                              </Typography>
                              <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                LIKES
                              </Typography>
                            </Stack>
                            <Stack alignItems="center">
                              <Typography variant="body2" fontWeight={800} color="#eab308">
                                {travelogue.comments?.length || 0}
                              </Typography>
                              <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                COMMENTS
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>

            {filteredTravelogues.length === 0 && (
              <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '18px', border: '1px dashed rgba(148, 163, 184, 0.3)' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#64748B">
                  No matching travelogues found.
                </Typography>
              </Card>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4, mt: 2 }}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  variant="outlined"
                  sx={{ borderRadius: '12px', borderColor: 'rgba(148,163,184,0.3)', color: '#64748B', fontWeight: 700 }}
                >
                  Previous
                </Button>
                <Typography sx={{ alignSelf: 'center', fontWeight: 800, color: '#64748B', fontSize: '0.9rem' }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  variant="outlined"
                  sx={{ borderRadius: '12px', borderColor: 'rgba(148,163,184,0.3)', color: '#64748B', fontWeight: 700 }}
                >
                  Next
                </Button>
              </Stack>
            )}
          </>
        )}
      </Box>

      {/* Dropdown Menu actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: { 
            borderRadius: '12px', 
            boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
            border: '1px solid rgba(148,163,184,0.1)'
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            // Dispatch window event or handle editing
          }}
          sx={{ fontSize: '0.85rem', fontWeight: 600 }}
        >
          <EditIcon sx={{ mr: 1.5, color: '#4F8A8B', fontSize: 18 }} />
          Edit Travelogue
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteConfirm(selectedTravelogue);
            setMenuAnchor(null);
          }}
          sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}
        >
          <DeleteIcon sx={{ mr: 1.5, color: '#ef4444', fontSize: 18 }} />
          Delete Travelogue
        </MenuItem>
      </Menu>

      {/* Delete Confirm Modal */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle fontWeight={800} color="#0f172a" sx={{ fontFamily: '"Sora", sans-serif' }}>
          Delete Travelogue
        </DialogTitle>
        <DialogContent>
          <Typography color="#64748B" fontWeight={500}>
            Are you sure you want to delete "{deleteConfirm?.title}"? This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirm(null)}
            sx={{ borderRadius: '12px', borderColor: 'rgba(148,163,184,0.3)', color: '#64748B', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              borderRadius: '12px',
              bgcolor: '#ef4444',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#dc2626' }
            }}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
