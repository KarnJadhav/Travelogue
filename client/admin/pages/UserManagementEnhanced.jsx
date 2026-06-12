import React, { useEffect, useState } from 'react';
import api from '../../src/api';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Stack,
  Avatar,
  useTheme,
  alpha,
  CircularProgress,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import { motion } from 'framer-motion';
import GuideInfoDialog from '../components/GuideInfoDialog';
import BulkActionToolbar from '../components/BulkActionToolbar';
import { notificationManager } from '../services/notificationService';
import { exportToCSV, formatDataForExport } from '../services/exportService';
import { formatDate, toSentenceCase, debounce } from '../services/utilityService';

const roleColors = {
  tourist: { label: 'tourist', color: 'primary', sx: { bgcolor: '#e0e7ff', color: '#2563eb', fontWeight: 600 } },
  guide: { label: 'guide', color: 'success', sx: { bgcolor: '#d1fae5', color: '#059669', fontWeight: 600 } },
  hotel: { label: 'hotel', color: 'secondary', sx: { bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 600 } },
  hospital: { label: 'hospital', color: 'error', sx: { bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 } },
};

const statusColors = {
  pending: { label: 'pending', color: 'warning', sx: { bgcolor: '#fef9c3', color: '#b45309', fontWeight: 600 } },
  active: { label: 'active', color: 'success', sx: { bgcolor: '#d1fae5', color: '#059669', fontWeight: 600 } },
  disabled: { label: 'disabled', color: 'default', sx: { bgcolor: '#f3f4f6', color: '#6b7280', fontWeight: 600 } },
};

export default function UserManagement() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [guideInfo, setGuideInfo] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
      notificationManager.success(`Loaded ${res.data.users?.length || 0} users`);
    } catch (err) {
      setUsers([]);
      notificationManager.error('Failed to load users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelect = (userId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.size === filteredUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredUsers.map(u => u._id)));
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
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      setUsers(users.filter(u => u._id !== user._id));
      notificationManager.success(`${user.name} deleted successfully`);
    } catch (err) {
      notificationManager.error(`Failed to delete ${user.name}`);
    }
  };

  const handleBulkAction = async (actionId, options = {}) => {
    if (selected.size === 0) return;
    setActionLoading(true);

    try {
      const selectedIds = Array.from(selected);

      switch (actionId) {
        case 'delete':
          if (!window.confirm(`Delete ${selected.size} users?`)) {
            setActionLoading(false);
            return;
          }
          await api.post('/admin/users/bulk-delete', { userIds: selectedIds });
          setUsers(users.filter(u => !selectedIds.includes(u._id)));
          notificationManager.success(`${selected.size} users deleted`);
          break;

        case 'disable':
          await api.post('/admin/users/bulk-update', {
            userIds: selectedIds,
            updates: { status: 'disabled' },
          });
          setUsers(
            users.map(u =>
              selectedIds.includes(u._id) ? { ...u, status: 'disabled' } : u
            )
          );
          notificationManager.success(`${selected.size} users disabled`);
          break;

        case 'enable':
          await api.post('/admin/users/bulk-update', {
            userIds: selectedIds,
            updates: { status: 'active' },
          });
          setUsers(
            users.map(u =>
              selectedIds.includes(u._id) ? { ...u, status: 'active' } : u
            )
          );
          notificationManager.success(`${selected.size} users enabled`);
          break;

        case 'export':
          const exportData = formatDataForExport(
            filteredUsers.filter(u => selectedIds.includes(u._id)),
            ['name', 'email', 'role', 'status', 'createdAt']
          );
          exportToCSV(exportData, `users-${new Date().toISOString().split('T')[0]}`);
          notificationManager.success('Users exported successfully');
          break;

        default:
          break;
      }

      setSelected(new Set());
    } catch (error) {
      notificationManager.error('Bulk action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const bulkActions = [
    { id: 'delete', label: 'Delete', color: 'error', icon: <DeleteIcon />, requiresReason: true },
    { id: 'disable', label: 'Disable', color: 'warning', icon: <BlockIcon /> },
    { id: 'enable', label: 'Enable', color: 'success', icon: <CheckCircleOutlineIcon /> },
    { id: 'export', label: 'Export', color: 'primary', icon: <FileDownloadIcon /> },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, bgcolor: theme.palette.mode === 'light' ? 'background.default' : 'transparent' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              User Management
            </Typography>
            <Typography color="text.secondary">
              Manage all users, roles, and permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </motion.div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={bulkActions}
        onAction={handleBulkAction}
        loading={actionLoading}
      />

      {/* Filters */}
      <Paper
        elevation={1}
        sx={{
          p: 2.5,
          borderRadius: 2,
          mb: 3,
          background: theme.palette.mode === 'light'
            ? '#ffffff'
            : alpha('#ffffff', 0.05),
          border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        }}
      >
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search users"
              placeholder="Name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              size="small"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">All Roles</MenuItem>
                {Object.keys(roleColors).map(role => (
                  <MenuItem key={role} value={role}>{toSentenceCase(role)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">All Status</MenuItem>
                {Object.keys(statusColors).map(status => (
                  <MenuItem key={status} value={status}>{toSentenceCase(status)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
            > 
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} md={2} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary">
              {filteredUsers.length} of {users.length} users
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">No users found</Typography>
        </Paper>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.size === filteredUsers.length && filteredUsers.length > 0}
                      indeterminate={selected.size > 0 && selected.size < filteredUsers.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user, idx) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ display: 'table-row' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(user._id)}
                        onChange={() => handleSelect(user._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: theme.palette.primary.main,
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {user.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={toSentenceCase(user.role)}
                        size="small"
                        {...roleColors[user.role]?.sx}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={toSentenceCase(user.status)}
                        size="small"
                        {...statusColors[user.status]?.sx}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        title="View"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>
      )}

      {/* User Details Dialog */}
      {selectedUser && (
        <GuideInfoDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          user={selectedUser}
          guideInfo={guideInfo}
          loading={guideLoading}
        />
      )}
    </Box>
  );
}

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
