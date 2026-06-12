import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Checkbox,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { notificationManager } from '../services/notificationService';
import BulkActionToolbar from '../components/BulkActionToolbar';

const categories = ['Beach', 'Mountain', 'Heritage', 'Urban', 'Adventure', 'Cultural', 'Religious', 'Nature'];

export default function DestinationManagement() {
  const theme = useTheme();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedDestinations, setSelectedDestinations] = useState(new Set());
  const [deleteDestinationDialog, setDeleteDestinationDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: 'enabled',
  });

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API endpoint
      const mockData = [
        { _id: '1', name: 'Goa', category: 'Beach', status: 'enabled', description: 'Beautiful beaches and vibrant nightlife', image: '🏖️' },
        { _id: '2', name: 'Manali', category: 'Mountain', status: 'enabled', description: 'Hill station with scenic beauty and adventure', image: '⛰️' },
        { _id: '3', name: 'Agra', category: 'Heritage', status: 'enabled', description: 'Home to the magnificent Taj Mahal', image: '🏛️' },
        { _id: '4', name: 'Jaipur', category: 'Cultural', status: 'enabled', description: 'The Pink City of India with rich heritage', image: '🏰' },
        { _id: '5', name: 'Kerala', category: 'Nature', status: 'enabled', description: "God's Own Country with backwaters", image: '🌴' },
      ];
      setDestinations(mockData);
      notificationManager.success('Destinations loaded successfully');
    } catch (error) {
      notificationManager.error('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleAddDestination = async () => {
    if (!formData.name || !formData.category || !formData.description) {
      notificationManager.warning('Please fill all required fields');
      return;
    }
    try {
      const newDest = {
        _id: Date.now().toString(),
        ...formData,
        image: '📍',
      };
      setDestinations([...destinations, newDest]);
      notificationManager.success('Destination added successfully');
      setOpenAddDialog(false);
      setFormData({ name: '', description: '', category: '', status: 'enabled' });
    } catch (error) {
      notificationManager.error('Failed to add destination');
    }
  };

  const handleEditDestination = async () => {
    if (!formData.name || !formData.category || !formData.description) {
      notificationManager.warning('Please fill all required fields');
      return;
    }
    try {
      setDestinations(
        destinations.map(d => d._id === selectedDestination._id ? { ...d, ...formData } : d)
      );
      notificationManager.success('Destination updated successfully');
      setOpenEditDialog(false);
      setSelectedDestination(null);
      setFormData({ name: '', description: '', category: '', status: 'enabled' });
    } catch (error) {
      notificationManager.error('Failed to update destination');
    }
  };

  const handleDeleteDestination = async () => {
    try {
      setDestinations(destinations.filter(d => d._id !== selectedDestination._id));
      notificationManager.success('Destination deleted successfully');
      setDeleteDestinationDialog(false);
      setSelectedDestination(null);
    } catch (error) {
      notificationManager.error('Failed to delete destination');
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDestinations(destinations.filter(d => !selectedDestinations.has(d._id)));
      notificationManager.success(`${selectedDestinations.size} destinations deleted`);
      setSelectedDestinations(new Set());
      setBulkDeleteDialog(false);
    } catch (error) {
      notificationManager.error('Failed to delete destinations');
    }
  };

  const handleSelectDestination = (id) => {
    const updated = new Set(selectedDestinations);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedDestinations(updated);
  };

  const handleSelectAll = () => {
    if (selectedDestinations.size === filteredDestinations.length) {
      setSelectedDestinations(new Set());
    } else {
      setSelectedDestinations(new Set(filteredDestinations.map(d => d._id)));
    }
  };

  const openEditModal = (dest) => {
    setSelectedDestination(dest);
    setFormData({
      name: dest.name,
      description: dest.description,
      category: dest.category,
      status: dest.status,
    });
    setOpenEditDialog(true);
  };

  const filteredDestinations = destinations.filter(dest => {
    const matchSearch = dest.name.toLowerCase().includes(search.toLowerCase()) ||
                       dest.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || dest.category === categoryFilter;
    const matchStatus = !statusFilter || dest.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
          🌍 Destination Management
        </Typography>
      </motion.div>

      {/* Search & Filters */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          background: theme.palette.mode === 'light'
            ? '#ffffff'
            : alpha('#ffffff', 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search destinations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              fullWidth
              size="small"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              fullWidth
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormData({ name: '', description: '', category: '', status: 'enabled' });
                setOpenAddDialog(true);
              }}
            >
              Add Destination
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Action Toolbar */}
      {selectedDestinations.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedDestinations.size}
          actions={[
            {
              label: 'Delete',
              icon: DeleteIcon,
              onClick: () => setBulkDeleteDialog(true),
              color: 'error',
            },
          ]}
          onClear={() => setSelectedDestinations(new Set())}
        />
      )}

      {/* Destinations Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredDestinations.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Typography color="text.secondary">No destinations found</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredDestinations.map((dest, idx) => (
              <motion.div
                key={dest._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                style={{ width: '100%' }}
              >
                <Grid item xs={12} sm={6} md={4}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: selectedDestinations.has(dest._id)
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      background: selectedDestinations.has(dest._id)
                        ? alpha(theme.palette.primary.main, 0.05)
                        : alpha('#ffffff', 0.05),
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.palette.mode === 'light'
                          ? '0 8px 24px rgba(0,0,0,0.1)'
                          : '0 8px 24px rgba(0,0,0,0.3)',
                      },
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Checkbox
                          checked={selectedDestinations.has(dest._id)}
                          onChange={() => handleSelectDestination(dest._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {dest.name}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={dest.category}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={dest.status === 'enabled' ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={dest.status === 'enabled' ? 'success' : 'error'}
                          icon={dest.status === 'enabled' ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        />
                      </Box>

                      <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.9rem' }}>
                        {dest.description}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          variant="outlined"
                          onClick={() => openEditModal(dest)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          variant="outlined"
                          onClick={() => {
                            setSelectedDestination(dest);
                            setDeleteDestinationDialog(true);
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </motion.div>
            ))}
          </Grid>
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={openAddDialog || openEditDialog} onClose={() => {
        setOpenAddDialog(false);
        setOpenEditDialog(false);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {openEditDialog ? 'Edit Destination' : 'Add New Destination'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Destination Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Select
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            label="Category"
            sx={{ mb: 2 }}
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
          <Select
            fullWidth
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            label="Status"
          >
            <MenuItem value="enabled">Enabled</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAddDialog(false);
            setOpenEditDialog(false);
          }}>
            Cancel
          </Button>
          <Button
            onClick={openEditDialog ? handleEditDestination : handleAddDestination}
            variant="contained"
            color="primary"
          >
            {openEditDialog ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDestinationDialog} onClose={() => setDeleteDestinationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Destination?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            Are you sure you want to delete <strong>{selectedDestination?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDestinationDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteDestination}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialog} onClose={() => setBulkDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete {selectedDestinations.size} Destinations?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            Are you sure you want to delete all selected destinations? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            variant="contained"
            color="error"
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
