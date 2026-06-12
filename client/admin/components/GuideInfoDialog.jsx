import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Chip, Box, CircularProgress } from '@mui/material';
import api from '../../src/api';
import { toAbsoluteAssetUrl } from '../../src/config/runtime';

const getUploadUrl = (path = '') => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return toAbsoluteAssetUrl(path);
};

const isImageProof = (path = '') => /\.(png|jpe?g|webp|gif)$/i.test(path.split('?')[0]);

export default function GuideInfoDialog({ open, onClose, guide, loading, onApprove, onReject, approving, rejecting, isGuide }) {
  const [openingProof, setOpeningProof] = React.useState(false);
  const languageText = Array.isArray(guide?.languages)
    ? guide.languages
        .map((language) => (typeof language === 'string' ? language : language?.name))
        .filter(Boolean)
        .join(', ')
    : guide?.languages || '';
  const identityProof = guide?.identityProof || guide?.identityProofUrl || '';
  const identityProofUrl = getUploadUrl(identityProof);
  const hasImageProof = isImageProof(identityProof);

  const handleOpenIdentityProof = async () => {
    const fallbackUrl = identityProofUrl;
    const guideId = String(guide?._id || '');

    if (!guideId) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      window.alert('Identity proof is not available.');
      return;
    }

    if (openingProof) return;
    setOpeningProof(true);
    try {
      const res = await api.get(`/adminGuide/identity-proof-url/${guideId}`);
      const proofUrl = String(res?.data?.url || '').trim() || fallbackUrl;
      if (!proofUrl) {
        window.alert('Identity proof is not available.');
        return;
      }
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.alert(err?.response?.data?.message || 'Failed to open identity proof.');
      }
    } finally {
      setOpeningProof(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isGuide ? 'Guide Information' : 'User Information'}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : guide ? (
          <Box>
            <Typography variant="h6" fontWeight={700}>{isGuide ? guide.userId?.name : guide.name}</Typography>
            <Typography color="text.secondary" mb={1}>{isGuide ? guide.userId?.email : guide.email}</Typography>
            {isGuide && guide.rejected && (
              <Chip label="Rejected" color="error" sx={{ mb: 2 }} />
            )}
            {isGuide && !guide.rejected && (
              <Chip label={guide.approved ? 'Approved' : 'Pending'} color={guide.approved ? 'success' : 'warning'} sx={{ mb: 2 }} />
            )}
            {isGuide ? (
              <>
                <Typography><b>Bio:</b> {guide.bio || '-'}</Typography>
                <Typography><b>Experience:</b> {guide.experienceYears || 0} years</Typography>
                <Typography><b>Languages:</b> {languageText || '-'}</Typography>
                <Typography><b>Phone:</b> {guide.phone || '-'}</Typography>
                <Typography><b>Country:</b> {guide.userId?.country || '-'}</Typography>
                <Box sx={{ mt: 2, mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Identity Proof</Typography>
                  {identityProofUrl ? (
                    <Box
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        p: 1.25,
                        bgcolor: '#f8fafc',
                      }}
                    >
                      {hasImageProof ? (
                        <Box
                          component="img"
                          src={identityProofUrl}
                          alt="Guide identity proof"
                          sx={{
                            display: 'block',
                            width: '100%',
                            maxHeight: 260,
                            objectFit: 'contain',
                            borderRadius: '10px',
                            bgcolor: '#fff',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            minHeight: 110,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '10px',
                            bgcolor: '#fff',
                            color: '#475569',
                            border: '1px dashed #cbd5e1',
                            textAlign: 'center',
                            px: 2,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700 }}>PDF identity proof uploaded</Typography>
                          <Typography sx={{ fontSize: 13, color: '#64748b' }}>Open the file to verify details.</Typography>
                        </Box>
                      )}
                      <Button
                        onClick={handleOpenIdentityProof}
                        size="small"
                        variant="outlined"
                        disabled={openingProof}
                        sx={{ textTransform: 'none', mt: 1 }}
                      >
                        {openingProof ? 'Opening...' : 'Open identity proof'}
                      </Button>
                    </Box>
                  ) : (
                    <Chip label="No identity proof uploaded" color="warning" variant="outlined" />
                  )}
                </Box>
                <Typography><b>Ratings:</b> {guide.ratings || 0}</Typography>
                <Typography><b>Earnings:</b> {guide.earnings || 0}</Typography>
              </>
            ) : (
              <>
                <Typography><b>Role:</b> {guide.role}</Typography>
                <Typography><b>Status:</b> {guide.status}</Typography>
                <Typography><b>Location:</b> {guide.location || '-'}</Typography>
                <Typography><b>Phone:</b> {guide.phone || '-'}</Typography>
                <Typography><b>Country:</b> {guide.country || '-'}</Typography>
              </>
            )}
          </Box>
        ) : (
          <Typography>No user info found.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        {isGuide && !guide?.approved && (
          <>
            <Button onClick={onReject} color="error" disabled={rejecting}>{rejecting ? 'Rejecting...' : 'Reject'}</Button>
            <Button onClick={onApprove} color="success" variant="contained" disabled={approving}>{approving ? 'Approving...' : 'Approve'}</Button>
          </>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
