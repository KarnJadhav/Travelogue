import React from 'react';
import { Paper, Typography, Box, Button, TextField, Grid } from '@mui/material';

export default function Notifications() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Notifications & Announcements
      </Typography>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Send Announcement
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField label="Announcement" fullWidth multiline minRows={2} />
          </Grid>
          <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Button variant="contained" color="primary">
              Send
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Sent Notifications
        </Typography>
        <Typography color="text.secondary">No notifications sent yet.</Typography>
      </Paper>
    </Box>
  );
}
