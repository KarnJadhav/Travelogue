import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api';

const ReviewModeration = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    hidden: '',
    flagged: '',
    search: ''
  });
  const [pagination, setPagination] = useState({ current: 1, total: 1, limit: 10 });
  const [scanningAll, setScanningAll] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch reviews with current filters
  const fetchReviews = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      
      if (filters.status) params.append('status', filters.status);
      if (filters.hidden !== '') params.append('hidden', filters.hidden);
      if (filters.flagged !== '') params.append('flagged', filters.flagged);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/adminReview/all-reviews?${params}`);
      setReviews(response.data.reviews);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await api.get('/adminReview/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReviews(1);
    fetchStats();
  }, []);

  // Apply filters
  useEffect(() => {
    fetchReviews(1);
  }, [filters]);

  // Scan all reviews for inappropriate content
  const handleScanAll = async () => {
    setScanningAll(true);
    try {
      const response = await api.post('/adminReview/scan-all');
      alert(`✅ Scanned ${response.data.scanned} reviews\n🚩 Flagged: ${response.data.flagged} reviews`);
      fetchReviews(pagination.current);
      fetchStats();
    } catch (error) {
      alert('Error scanning reviews: ' + error.message);
    } finally {
      setScanningAll(false);
    }
  };

  // Scan single review
  const handleScanReview = async (reviewId) => {
    try {
      const response = await api.post(`/adminReview/scan-review/${reviewId}`);
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review scanned and updated');
    } catch (error) {
      alert('Error scanning review: ' + error.message);
    }
  };

  // Hide review
  const handleHideReview = async (reviewId) => {
    const reason = prompt('Enter reason for hiding (optional):');
    try {
      const response = await api.put(`/adminReview/hide/${reviewId}`, {
        reason: reason || 'Hidden by admin',
        notes: ''
      });
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review hidden');
      fetchStats();
    } catch (error) {
      alert('Error hiding review: ' + error.message);
    }
  };

  // Unhide review
  const handleUnhideReview = async (reviewId) => {
    try {
      const response = await api.put(`/adminReview/unhide/${reviewId}`);
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review unhidden');
      fetchStats();
    } catch (error) {
      alert('Error unhiding review: ' + error.message);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review? This action can be reversed.')) return;
    
    const reason = prompt('Enter reason for deletion (optional):');
    try {
      const response = await api.delete(`/adminReview/delete/${reviewId}`, {
        data: {
          reason: reason || 'Deleted by admin',
          notes: ''
        }
      });
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review deleted');
      fetchStats();
    } catch (error) {
      alert('Error deleting review: ' + error.message);
    }
  };

  // Restore review
  const handleRestoreReview = async (reviewId) => {
    try {
      const response = await api.put(`/adminReview/restore/${reviewId}`);
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review restored');
      fetchStats();
    } catch (error) {
      alert('Error restoring review: ' + error.message);
    }
  };

  // Flag review
  const handleFlagReview = async (reviewId) => {
    const reason = prompt('Enter flag reason:');
    if (!reason) return;
    
    try {
      const response = await api.put(`/adminReview/flag/${reviewId}`, {
        reason,
        notes: ''
      });
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review flagged');
    } catch (error) {
      alert('Error flagging review: ' + error.message);
    }
  };

  // Unflag review
  const handleUnflagReview = async (reviewId) => {
    try {
      const response = await api.put(`/adminReview/unflag/${reviewId}`);
      const updatedReviews = reviews.map(r =>
        r._id === reviewId ? response.data.review : r
      );
      setReviews(updatedReviews);
      setSelectedReview(response.data.review);
      alert('✅ Review unflagged');
    } catch (error) {
      alert('Error unflagging review: ' + error.message);
    }
  };

  // Get risk badge color
  const getRiskBadgeColor = (confidence) => {
    if (confidence >= 80) return 'bg-red-100 text-red-800';
    if (confidence >= 50) return 'bg-orange-100 text-orange-800';
    if (confidence >= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRiskLabel = (confidence) => {
    if (confidence >= 80) return 'High Risk';
    if (confidence >= 50) return 'Medium Risk';
    if (confidence >= 30) return 'Low Risk';
    return 'Safe';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header & Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📋 Review Moderation</h1>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalReviews}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600">Visible</p>
              <p className="text-2xl font-bold text-green-600">{stats.visibleReviews}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600">Hidden</p>
              <p className="text-2xl font-bold text-red-600">{stats.hiddenReviews}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
              <p className="text-sm text-gray-600">Flagged</p>
              <p className="text-2xl font-bold text-orange-600">{stats.flaggedReviews}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleScanAll}
            disabled={scanningAll}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {scanningAll ? '🔍 Scanning...' : '🤖 AI Scan All'}
          </button>
          <button
            onClick={fetchStats}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            🔄 Refresh Stats
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by place or comment..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.hidden}
            onChange={(e) => setFilters({ ...filters, hidden: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All (Hidden)</option>
            <option value="true">Hidden Only</option>
            <option value="false">Visible Only</option>
          </select>
          <select
            value={filters.flagged}
            onChange={(e) => setFilters({ ...filters, flagged: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All (Flagged)</option>
            <option value="true">Flagged Only</option>
            <option value="false">Not Flagged</option>
          </select>
        </div>
      </motion.div>

      {/* Reviews List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Reviews ({reviews.length})
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No reviews found</div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reviews.map((review) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`border rounded-lg p-4 cursor-pointer hover:shadow-lg transition ${
                    review.isHidden ? 'bg-gray-50 border-gray-300' : 
                    review.isDeleted ? 'bg-red-50 border-red-200' :
                    review.aiModeration?.isFlagged ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-800">{review.place}</h3>
                        <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{review.comment}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          review.status === 'approved' ? 'bg-green-100 text-green-800' :
                          review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                        </span>

                        {review.isHidden && (
                          <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                            🚫 Hidden
                          </span>
                        )}

                        {review.isDeleted && (
                          <span className="text-xs px-3 py-1 rounded-full bg-red-200 text-red-900 font-semibold">
                            🗑️ Deleted
                          </span>
                        )}

                        {review.aiModeration?.isFlagged && (
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getRiskBadgeColor(review.aiModeration.confidence)}`}>
                            🚩 {getRiskLabel(review.aiModeration.confidence)} ({review.aiModeration.confidence}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600 font-semibold">{review.userId?.name}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => fetchReviews(Math.max(1, pagination.current - 1))}
                  disabled={pagination.current === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span className="px-3 py-1">
                  Page {pagination.current} of {pagination.total}
                </span>
                <button
                  onClick={() => fetchReviews(Math.min(pagination.total, pagination.current + 1))}
                  disabled={pagination.current === pagination.total}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Selected Review Details */}
      {selectedReview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReview(null)}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Review Details</h2>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Review Info */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Place</p>
                  <p className="font-bold text-gray-800">{selectedReview.place}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="font-bold text-yellow-600">{'⭐'.repeat(selectedReview.rating)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Comment</p>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">{selectedReview.comment}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-bold text-gray-800">{selectedReview.userId?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guide</p>
                  <p className="font-bold text-gray-800">{selectedReview.guideId?.name}</p>
                </div>
              </div>

              {/* AI Moderation Info */}
              {selectedReview.aiModeration && (
                <div className={`p-4 rounded-lg border-2 ${
                  selectedReview.aiModeration.isFlagged ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
                }`}>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    🤖 AI Moderation Analysis
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> {selectedReview.aiModeration.isFlagged ? '🚩 FLAGGED' : '✅ SAFE'}</p>
                    <p><strong>Confidence:</strong> {selectedReview.aiModeration.confidence}%</p>
                    {selectedReview.aiModeration.reason && (
                      <p><strong>Reason:</strong> {selectedReview.aiModeration.reason}</p>
                    )}
                    {selectedReview.aiModeration.flaggedWords?.length > 0 && (
                      <p><strong>Flagged Words:</strong> {selectedReview.aiModeration.flaggedWords.join(', ')}</p>
                    )}
                    <p><strong>Checked:</strong> {new Date(selectedReview.aiModeration.checkedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Admin Actions Log */}
              {selectedReview.moderatedAt && (
                <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-300">
                  <h4 className="font-bold mb-2">📝 Moderation Log</h4>
                  <p className="text-sm text-gray-700"><strong>Moderated by:</strong> Admin</p>
                  <p className="text-sm text-gray-700"><strong>Date:</strong> {new Date(selectedReview.moderatedAt).toLocaleString()}</p>
                  {selectedReview.adminNotes && (
                    <p className="text-sm text-gray-700"><strong>Notes:</strong> {selectedReview.adminNotes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleScanReview(selectedReview._id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                >
                  🤖 Scan Now
                </button>

                {!selectedReview.isHidden ? (
                  <button
                    onClick={() => handleHideReview(selectedReview._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    🚫 Hide
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnhideReview(selectedReview._id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    👁️ Unhide
                  </button>
                )}

                {!selectedReview.isDeleted ? (
                  <button
                    onClick={() => handleDeleteReview(selectedReview._id)}
                    className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    🗑️ Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestoreReview(selectedReview._id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    ♻️ Restore
                  </button>
                )}

                {!selectedReview.aiModeration?.isFlagged ? (
                  <button
                    onClick={() => handleFlagReview(selectedReview._id)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    🚩 Flag
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnflagReview(selectedReview._id)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    ⭕ Unflag
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedReview(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ReviewModeration;
