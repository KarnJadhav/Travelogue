import React from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'user', headerName: 'User', width: 160 },
  { field: 'comment', headerName: 'Comment', width: 300 },
  { field: 'status', headerName: 'Status', width: 120 },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 200,
    renderCell: () => (
      <>
        <Button size="small" variant="outlined" color="success" sx={{ mr: 1 }}>Approve</Button>
        <Button size="small" variant="outlined" color="error">Delete</Button>
      </>
    ),
  },
];

const rows = [
  { id: 1, user: 'Alice', comment: 'Great trip!', status: 'Pending' },
  { id: 2, user: 'Bob', comment: 'Spam content', status: 'Reported' },
  { id: 3, user: 'Carol', comment: 'Loved it!', status: 'Approved' },
];

export default function CommentModeration() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Comments & Reviews Moderation</Typography>
      <Paper elevation={1} sx={{ height: 400, borderRadius: 3 }}>
        <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick />
      </Paper>
    </Box>
  );
}
