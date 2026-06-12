import React from 'react';
import { Container, Paper, Typography, Divider, Switch, FormControlLabel, Button, Box, TextField } from '@mui/material';

export default function Settings() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Platform Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            General
          </Typography>
          <FormControlLabel control={<Switch defaultChecked />} label="Enable Platform" />
          <FormControlLabel control={<Switch />} label="Maintenance Mode" />
        </Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel control={<Switch defaultChecked />} label="Email Notifications" />
          <FormControlLabel control={<Switch />} label="Push Notifications" />
        </Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Branding
          </Typography>
          <TextField label="Platform Name" defaultValue="Travelogue" fullWidth sx={{ mb: 2 }} />
          <TextField label="Support Email" defaultValue="support@travelogue.com" fullWidth />
        </Box>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" color="secondary">Reset</Button>
          <Button variant="contained" color="primary">Save Changes</Button>
        </Box>
      </Paper>
    </Container>
  );
}
