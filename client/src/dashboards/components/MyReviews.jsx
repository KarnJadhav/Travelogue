import React, { useEffect, useState } from 'react';
import api from '../../api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Modal from '@mui/material/Modal';
import Button from '../../common/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Rating from '@mui/material/Rating';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editFields, setEditFields] = useState({ rating: 0, comment: '', report: '' });
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Open edit review modal
  const handleOpenEdit = (review) => {
    setSelectedReview(review);
    setEditFields({
      rating: review.rating,
      comment: review.comment || '',
      report: review.report || ''
    });
    setOpenEdit(true);
  };

  // Submit review edit
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/review/${selectedReview._id}`, {
        rating: editFields.rating,
        comment: editFields.comment,
        report: editFields.report
      });
      setSnackbar({ open: true, message: 'Review updated successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to update review.', severity: 'error' });
    } finally {
      setOpenEdit(false);
      setSelectedReview(null);
      // Refresh reviews
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/review/user/${user._id}/reviews`);
      setReviews(res.data.reviews || []);
    }
  };

  // Open delete confirmation
  const handleOpenDelete = (reviewId) => {
    setDeleteReviewId(reviewId);
    setOpenDelete(true);
  };

  // Confirm delete review
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/review/${deleteReviewId}`);
      setSnackbar({ open: true, message: 'Review deleted successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to delete review.', severity: 'error' });
    } finally {
      setOpenDelete(false);
      setDeleteReviewId(null);
      // Refresh reviews
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/review/user/${user._id}/reviews`);
      setReviews(res.data.reviews || []);
    }
  };

  useEffect(() => {
    async function fetchReviews() {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user._id) return;
        const res = await api.get(`/review/user/${user._id}/reviews`);
        setReviews(res.data.reviews || []);
      } catch (err) {
        setReviews([]);
      }
    }
    fetchReviews();
  }, []);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} mb={2}>
        My Reviews
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" mb={3}>
        Manage your reviews and ratings
      </Typography>
      {reviews.length === 0 ? (
        <Typography>No reviews found.</Typography>
      ) : (
        <>
          {reviews.map((review) => (
            <Box key={review._id} sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 2, p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography fontWeight={700} fontSize={20} mb={1}>{review.place || 'Tour'}</Typography>
                <Chip label={review.status} color={review.status === 'pending' ? 'warning' : review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'error' : 'default'} size="small" sx={{ mb: 1 }} />
                <Typography fontSize={15} color="text.secondary">{new Date(review.createdAt).toLocaleDateString()} </Typography>
                <Typography fontSize={15} color="text.secondary">Guide: {review.guideId?.name || review.guideId}</Typography>
                <Rating value={review.rating} readOnly size="small" sx={{ mb: 1 }} />
                <Typography fontSize={16}>{review.comment}</Typography>
                {review.report && <Typography fontSize={13} color="error">Report: {review.report}</Typography>}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {/* Edit/Delete buttons for pending reviews */}
                {review.status === 'pending' && (
                  <Box mt={2} sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => handleOpenEdit(review)} className="bg-yellow-500 hover:bg-yellow-600">Edit</Button>
                    <Button onClick={() => handleOpenDelete(review._id)} className="bg-red-600 hover:bg-red-700">Delete</Button>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
          {/* Edit Review Modal */}
          <Modal open={openEdit} onClose={() => setOpenEdit(false)}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: '#fff', borderRadius: 2, boxShadow: 4, p: 3, minWidth: 320 }}>
              <Typography variant="h6" mb={2}>Edit Review</Typography>
              <form onSubmit={handleSubmitEdit}>
                <Rating value={editFields.rating} onChange={(_, v) => setEditFields(f => ({ ...f, rating: v }))} size="large" sx={{ mb: 2 }} />
                <TextField label="Comment" fullWidth margin="normal" value={editFields.comment} onChange={e => setEditFields(f => ({ ...f, comment: e.target.value }))} />
                <TextField label="Report" fullWidth margin="normal" value={editFields.report} onChange={e => setEditFields(f => ({ ...f, report: e.target.value }))} />
                <Box mt={2} sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save</Button>
                  <Button onClick={() => setOpenEdit(false)} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
                </Box>
              </form>
            </Box>
          </Modal>

          {/* Delete Review Modal */}
          <Modal open={openDelete} onClose={() => setOpenDelete(false)}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: '#fff', borderRadius: 2, boxShadow: 4, p: 3, minWidth: 320 }}>
              <Typography variant="h6" mb={2}>Delete Review</Typography>
              <Typography mb={3}>Are you sure you want to delete this review?</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Delete</Button>
                <Button onClick={() => setOpenDelete(false)} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
              </Box>
            </Box>
          </Modal>

          {/* Snackbar for user feedback */}
          <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
}
