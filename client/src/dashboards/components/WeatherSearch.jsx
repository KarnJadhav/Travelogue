// WeatherSearch.jsx
// Modal wrapper for WeatherSearchPage
import React from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import WeatherSearchPage from './WeatherSearchPage';

export default function WeatherSearch({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box position="absolute" top={8} right={8} zIndex={10}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box p={3} pt={5}>
        <WeatherSearchPage />
      </Box>
    </Dialog>
  );
}
