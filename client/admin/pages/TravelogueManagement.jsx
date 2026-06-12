import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { motion } from 'framer-motion';
import api from '../../src/api';
import { toAbsoluteAssetUrl } from '../../src/config/runtime';

const cardSx = {
  borderRadius: '14px',
  p: 2.25,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 16px 32px rgba(15, 23, 42, 0.05)',
};

const getMediaUrl = (path = '') => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return toAbsoluteAssetUrl(path);
};

export default function TravelogueManagement() {
  const [travelogues, setTravelogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const stats = useMemo(() => {
    const summary = { total: travelogues.length, pending: 0, approved: 0, rejected: 0 };
    travelogues.forEach((t) => {
      if (t.status === 'approved') summary.approved += 1;
      else if (t.status === 'rejected') summary.rejected += 1;
      else summary.pending += 1;
    });
    return summary;
  }, [travelogues]);

  useEffect(() => {
    fetchTravelogues();
  }, []);

  const fetchTravelogues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/adminTravelogue');
      setTravelogues(res.data.travelogues || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to fetch travelogues', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/adminTravelogue/action/${id}`, { action });
      const msg = res?.data?.message || `Travelogue ${action}d successfully`;
      setSnackbar({ open: true, message: msg, severity: 'success' });
      fetchTravelogues();
      setSelected(null);
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to ${action} travelogue`;
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { field: '_id', headerName: 'ID', width: 120 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 240 },
    {
      field: 'creator',
      headerName: 'Creator',
      width: 180,
      valueGetter: (params) => {
        const row = params?.row;
        if (!row) return 'N/A';
        const guide = row.guideId;
        if (!guide) return 'N/A';
        if (typeof guide === 'object' && guide !== null) {
          return guide.name || guide.email || 'N/A';
        }
        return typeof guide === 'string' ? guide : 'N/A';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            borderRadius: '8px',
            fontWeight: 600,
            bgcolor: params.value === 'approved' ? '#dcfce7' : params.value === 'rejected' ? '#fee2e2' : '#fef3c7',
            color: params.value === 'approved' ? '#166534' : params.value === 'rejected' ? '#b91c1c' : '#92400e',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <Tooltip title="View details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setSelected(params.row)}
              sx={{ border: '1px solid #bfdbfe', borderRadius: '8px' }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === 'pending' && (
            <>
              <IconButton
                size="small"
                color="success"
                onClick={() => handleAction(params.row._id, 'approve')}
                sx={{ border: '1px solid #bbf7d0', borderRadius: '8px' }}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleAction(params.row._id, 'reject')}
                sx={{ border: '1px solid #fecaca', borderRadius: '8px' }}
              >
                <CancelOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Paper elevation={0} sx={{ ...cardSx, mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', mb: 0.45 }}>Travelogue Publishing Hub</Typography>
          <Typography sx={{ fontSize: '0.84rem', color: '#64748b' }}>
            Curate, approve and moderate community travel stories in one place.
          </Typography>
        </Paper>
      </motion.div>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total', value: stats.total, color: '#111827' },
          { label: 'Pending', value: stats.pending, color: '#92400e', bg: '#fef3c7' },
          { label: 'Approved', value: stats.approved, color: '#166534', bg: '#dcfce7' },
          { label: 'Rejected', value: stats.rejected, color: '#b91c1c', bg: '#fee2e2' },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card elevation={0} sx={{ ...cardSx, p: 0, height: '100%', bgcolor: item.bg || '#fff' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5 }}>{item.label}</Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ ...cardSx, p: 2.5, overflow: 'hidden' }}>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box sx={{ overflowX: 'auto' }}>
            <DataGrid
              rows={travelogues}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              pageSize={8}
              rowsPerPageOptions={[8]}
              disableSelectionOnClick
              sx={{
                minWidth: 980,
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f8fafc',
                  color: '#6b7280',
                  fontWeight: 600,
                  borderBottom: '1px solid #e5e7eb',
                },
                '& .MuiDataGrid-row': {
                  '&:hover': { bgcolor: '#f8fafc' },
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #eef2f7',
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #e5e7eb',
                  bgcolor: '#ffffff',
                },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {loading ? (
            <Typography sx={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', py: 2 }}>Loading...</Typography>
          ) : travelogues.length === 0 ? (
            <Typography sx={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', py: 2 }}>No travelogues found.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {travelogues.map((t) => (
                <Paper key={t._id} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '10px', p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{t.title}</Typography>
                      <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                        {t.guideId?.name || t.guideId?.email || 'Unknown creator'}
                      </Typography>
                    </Box>
                    <Chip
                      label={t.status}
                      size="small"
                      sx={{
                        borderRadius: '8px',
                        fontWeight: 600,
                        bgcolor: t.status === 'approved' ? '#dcfce7' : t.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: t.status === 'approved' ? '#166534' : t.status === 'rejected' ? '#b91c1c' : '#92400e',
                      }}
                    />
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="outlined" onClick={() => setSelected(t)}>View</Button>
                    {t.status === 'pending' && (
                      <>
                        <Button size="small" variant="contained" color="success" onClick={() => handleAction(t._id, 'approve')}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleAction(t._id, 'reject')}>
                          Reject
                        </Button>
                      </>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Travelogue Details</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, mb: 0.5 }}>{selected.title}</Typography>
              <Typography sx={{ fontSize: '14px', color: '#6b7280', mb: 1.5 }}>
                By: {selected.guideId?.name || 'N/A'} ({selected.guideId?.email || 'N/A'})
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography sx={{ fontSize: '14px', color: '#111827', mb: 2 }}>{selected.description}</Typography>

              <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                  Destination: <b>{selected.location}</b>
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                  Rating: <b>{selected.rating || 'N/A'}</b>
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {selected.tags?.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ borderRadius: '8px' }} />
                ))}
              </Stack>

              <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>Media</Typography>
              <Grid container spacing={2}>
                {selected.images && selected.images.length > 0 ? (
                  selected.images.map((img, idx) => (
                    <Grid item xs={6} sm={4} md={3} key={idx}>
                      <Box sx={{ aspectRatio: '4/3', width: '100%', bgcolor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {img.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video
                            src={getMediaUrl(img)}
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={getMediaUrl(img)}
                            alt="media"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              if (!e.target.dataset.fallback) {
                                e.target.dataset.fallback = 'true';
                                e.target.src = '/no-image-fallback.png';
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>No media uploaded.</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button size="small" variant="outlined" onClick={() => setSelected(null)}>
            Close
          </Button>
          {selected?.status === 'pending' && (
            <>
              <Button
                size="small"
                onClick={() => handleAction(selected._id, 'approve')}
                color="success"
                variant="contained"
                startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                disabled={actionLoading}
              >
                Approve
              </Button>
              <Button
                size="small"
                onClick={() => handleAction(selected._id, 'reject')}
                color="error"
                variant="outlined"
                startIcon={<CancelOutlinedIcon fontSize="small" />}
                disabled={actionLoading}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
