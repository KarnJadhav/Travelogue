import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';

export default function TouristSettings() {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight={{ xs: 'auto', sm: '60vh' }}
      px={{ xs: 0, sm: 1 }}
    >
      <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>Settings</Typography>
        <FormControlLabel
          control={<Switch checked={notifications} onChange={e => setNotifications(e.target.checked)} />}
          label="Enable Notifications"
        />
        <FormControlLabel
          control={<Switch checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />}
          label="Dark Mode (UI only)"
        />
        <Button variant="outlined" color="error" sx={{ mt: 3 }} onClick={() => {
          localStorage.clear();
          window.location.href = '/login';
        }}>
          Logout
        </Button>
      </Paper>
    </Box>
  );
}
