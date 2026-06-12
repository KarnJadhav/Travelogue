import React from 'react';
import { Paper, Typography, Box, Button, Grid, TextField, Chip } from '@mui/material';

const categories = ['Beach', 'Mountain', 'Heritage', 'City'];
const tags = ['Adventure', 'Family', 'Romantic', 'Budget'];

export default function CategoryTagManagement() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Categories & Tags</Typography>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">Categories</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {categories.map(cat => <Chip key={cat} label={cat} color="primary" />)}
            </Box>
            <TextField label="Add Category" size="small" sx={{ mr: 1 }} />
            <Button variant="contained">Add</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {tags.map(tag => <Chip key={tag} label={tag} color="secondary" />)}
            </Box>
            <TextField label="Add Tag" size="small" sx={{ mr: 1 }} />
            <Button variant="contained">Add</Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
