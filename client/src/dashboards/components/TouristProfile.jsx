import React, { useState, useEffect } from 'react';
import TouristProfileEdit from './TouristProfileEdit';
import api from '../../api';
import { Box, CircularProgress, Alert } from '@mui/material';

export default function TouristProfile({ user: initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch latest tourist profile from backend on mount
  useEffect(() => {
    if (!initialUser?._id) return;

    const fetchTouristProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/tourist/${initialUser._id}`);
        // Merge backend response with any existing user data
        setUser({ ...initialUser, ...res.data });
      } catch (err) {
        console.error('Failed to fetch tourist profile:', err);
        // Fallback to initial user data if fetch fails
        setUser(initialUser);
      } finally {
        setLoading(false);
      }
    };

    fetchTouristProfile();
  }, [initialUser?._id]);

  const handleSave = async (updatedData) => {
    // Update local state after save
    setUser({ ...user, ...updatedData });
  };

  if (!initialUser?._id) {
    return (
      <Alert severity="warning" sx={{ borderRadius: '16px' }}>
        No user data available
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#4F8A8B' }} />
        </Box>
      )}
      {!loading && <TouristProfileEdit user={user} onSave={handleSave} />}
    </Box>
  );
}


