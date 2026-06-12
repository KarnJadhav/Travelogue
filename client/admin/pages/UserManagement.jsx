import React, { useEffect, useState } from 'react';
import api from '../../src/api';
import { toAbsoluteAssetUrl } from '../../src/config/runtime';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import { motion } from 'framer-motion';
import GuideInfoDialog from '../components/GuideInfoDialog';

const roleColors = {
  tourist: { bg: '#dbeafe', fg: '#1d4ed8' },
  guide: { bg: '#dcfce7', fg: '#15803d' },
  hotel: { bg: '#ede9fe', fg: '#6d28d9' },
  hospital: { bg: '#fee2e2', fg: '#b91c1c' },
};

const statusColors = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  active: { bg: '#dcfce7', fg: '#166534' },
  disabled: { bg: '#f3f4f6', fg: '#4b5563' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c' },
};

const cardSx = {
  borderRadius: '14px',
  p: 2.25,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 16px 32px rgba(15,23,42,0.05)',
};

const getUploadUrl = (path = '') => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return toAbsoluteAssetUrl(path);
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [guideInfo, setGuideInfo] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [openingProofGuideId, setOpeningProofGuideId] = useState('');

  const handleOpenGuideProof = async (guideId, fallbackProofPath = '') => {
    const normalizedGuideId = String(guideId || '').trim();
    const fallbackUrl = getUploadUrl(fallbackProofPath);

    if (!normalizedGuideId) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      alert('Identity proof is not available.');
      return;
    }

    if (openingProofGuideId === normalizedGuideId) return;
    setOpeningProofGuideId(normalizedGuideId);
    try {
      const res = await api.get(`/adminGuide/identity-proof-url/${normalizedGuideId}`);
      const proofUrl = String(res?.data?.url || '').trim() || fallbackUrl;
      if (!proofUrl) {
        alert('Identity proof is not available.');
        return;
      }
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(err?.response?.data?.message || 'Failed to open identity proof.');
      }
    } finally {
      setOpeningProofGuideId('');
    }
  };

  const handleEditUser = async (user) => {
    setSelectedUser(user);
    setDialogOpen(true);
    setGuideInfo(null);

    if (user.role === 'guide' && user.guideId) {
      setGuideLoading(true);
      try {
        const res = await api.get(`/guide/profile/${user._id}`);
        setGuideInfo(res.data.guide);
      } catch (err) {
        setGuideInfo(null);
      }
      setGuideLoading(false);
    } else {
      setGuideLoading(false);
      setGuideInfo(null);
    }
  };

  const refetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setUsers([]);
    }
    setLoading(false);
  };

  const handleApproveGuide = async () => {
    if (!guideInfo?._id) return;
    setApproving(true);
    try {
      const res = await api.post(`/adminGuide/action/${guideInfo._id}`, { action: 'approve' });
      if (res?.data?.message === 'Guide approved') {
        alert('Guide approved successfully.');
        setDialogOpen(false);
        await refetchUsers();
      } else {
        alert('Failed to approve guide.');
      }
    } catch (err) {
      alert('Failed to approve guide.');
    }
    setApproving(false);
  };

  const handleRejectGuide = async () => {
    if (!guideInfo?._id) return;
    setRejecting(true);
    try {
      const res = await api.post(`/adminGuide/action/${guideInfo._id}`, { action: 'reject' });
      if (res?.data?.message === 'Guide rejected') {
        alert('Guide rejected.');
        await refetchUsers();
        setGuideInfo((prev) => (prev ? { ...prev, rejected: true, approved: false } : prev));
      } else {
        alert('Failed to reject guide.');
      }
    } catch (err) {
      alert('Failed to reject guide.');
    }
    setRejecting(false);
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data.users || []);
      } catch (err) {
        setUsers([]);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <Paper elevation={0} sx={{ ...cardSx, mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
              <GroupIcon fontSize="small" />
            </Box>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>User Management</Typography>
          </Stack>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>Manage tourists, guides, hotels and hospitals with fast moderation controls.</Typography>
        </Paper>
      </motion.div>

      <Paper elevation={0} sx={{ ...cardSx, mb: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Search by name or email"
              value={search}
              size="small"
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>) }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="tourist">Tourist</MenuItem>
                <MenuItem value="guide">Guide</MenuItem>
                <MenuItem value="hotel">Hotel</MenuItem>
                <MenuItem value="hospital">Hospital</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />} sx={{ textTransform: 'none' }}>
              Add User
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer sx={{ p: 2.25, overflowX: 'auto' }}>
            <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '15%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ width: '27%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ width: '11%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ width: '11%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ width: '18%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ID Proof</TableCell>
                  <TableCell sx={{ width: '18%', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No users found.</TableCell></TableRow>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const roleColor = roleColors[user.role] || { bg: '#f3f4f6', fg: '#374151' };
                    const statusColor = statusColors[user.status] || { bg: '#f3f4f6', fg: '#374151' };
                    const proofUrl = getUploadUrl(user.guideIdentityProof);
                    const guideIdText = String(user.guideId || '');
                    const isProofOpening = openingProofGuideId === guideIdText;
                    return (
                      <TableRow key={user._id || idx} hover sx={{ '& td': { py: 1.4, fontSize: '13px' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
                        <TableCell sx={{ color: '#334155' }}>{user.email}</TableCell>
                        <TableCell><Chip label={user.role} size="small" sx={{ bgcolor: roleColor.bg, color: roleColor.fg, borderRadius: '8px', fontWeight: 600, fontSize: '0.72rem' }} /></TableCell>
                        <TableCell><Chip label={user.status} size="small" sx={{ bgcolor: statusColor.bg, color: statusColor.fg, borderRadius: '8px', fontWeight: 600, fontSize: '0.72rem' }} /></TableCell>
                        <TableCell>
                          {user.role === 'guide' ? (
                            proofUrl ? (
                              <Button
                                onClick={() => handleOpenGuideProof(user.guideId, user.guideIdentityProof)}
                                size="small"
                                variant="outlined"
                                disabled={isProofOpening}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.72rem', py: 0.25 }}
                              >
                                {isProofOpening ? 'Opening...' : 'View proof'}
                              </Button>
                            ) : (
                              <Chip label="Missing" size="small" color="warning" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 600 }} />
                            )
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton size="small" color="primary" onClick={() => handleEditUser(user)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)}><DeleteIcon fontSize="small" /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
          {loading ? (
            <Typography sx={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', py: 2 }}>Loading...</Typography>
          ) : filteredUsers.length === 0 ? (
            <Typography sx={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', py: 2 }}>No users found.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {filteredUsers.map((user, idx) => {
                const roleColor = roleColors[user.role] || { bg: '#f3f4f6', fg: '#374151' };
                const statusColor = statusColors[user.status] || { bg: '#f3f4f6', fg: '#374151' };
                const proofUrl = getUploadUrl(user.guideIdentityProof);
                const guideIdText = String(user.guideId || '');
                const isProofOpening = openingProofGuideId === guideIdText;
                return (
                  <Paper key={user._id || idx} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 1.35 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{user.name}</Typography>
                        <Typography sx={{ fontSize: '11px', color: '#64748b' }}>{user.email}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={() => handleEditUser(user)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip label={user.role} size="small" sx={{ bgcolor: roleColor.bg, color: roleColor.fg, borderRadius: '8px', fontWeight: 600 }} />
                      <Chip label={user.status} size="small" sx={{ bgcolor: statusColor.bg, color: statusColor.fg, borderRadius: '8px', fontWeight: 600 }} />
                      {user.role === 'guide' && (
                        proofUrl ? (
                          <Chip
                            onClick={() => handleOpenGuideProof(user.guideId, user.guideIdentityProof)}
                            clickable
                            label={isProofOpening ? 'Opening...' : 'View ID proof'}
                            size="small"
                            color="success"
                            variant="outlined"
                            disabled={isProofOpening}
                            sx={{ borderRadius: '8px', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip label="ID proof missing" size="small" color="warning" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 600 }} />
                        )
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Paper>

      <GuideInfoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        guide={selectedUser?.role === 'guide' ? guideInfo : selectedUser}
        loading={guideLoading}
        onApprove={handleApproveGuide}
        onReject={handleRejectGuide}
        approving={approving}
        rejecting={rejecting}
        isGuide={selectedUser?.role === 'guide'}
      />
    </Box>
  );
}
