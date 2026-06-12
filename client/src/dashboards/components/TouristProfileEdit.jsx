import React, { useState, useRef, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import api from '../../api';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  Avatar,
  IconButton,
  Modal,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Chip,
  Tooltip
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import LanguageIcon from '@mui/icons-material/LanguageOutlined';
import SaveIcon from '@mui/icons-material/SaveAltOutlined';
import EditIcon from '@mui/icons-material/Edit';
import PublicIcon from '@mui/icons-material/Public';
import CakeIcon from '@mui/icons-material/CakeOutlined';
import WcIcon from '@mui/icons-material/WcOutlined';
import InterestsIcon from '@mui/icons-material/InterestsOutlined';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { toAbsoluteAssetUrl } from '../../config/runtime';

const languageOptions = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Other'];
const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function TouristProfileEdit({ user, onSave }) {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return '';
    return toAbsoluteAssetUrl(avatar);
  };

  const initialForm = {
    fullName: user?.fullName || user?.name || '',
    avatar: user?.avatar || '',
    dob: user?.dob || '',
    gender: user?.gender || '',
    language: user?.language || '',
    nationality: user?.nationality || user?.country || '',
    interests: user?.interests || '',
    phone: user?.phone || '',
  };

  const [form, setForm] = useState(initialForm);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [openEdit, setOpenEdit] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    setForm(initialForm);
    setAvatarPreview(getAvatarUrl(user?.avatar));
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post(`/tourist/avatar/${user?._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const avatarUrl = res.data.avatar;
      setAvatarPreview(getAvatarUrl(avatarUrl));
      setForm((prev) => ({ ...prev, avatar: avatarUrl }));

      setSnackbarMsg('Avatar updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (err) {
      setSnackbarMsg('Failed to upload avatar');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await api.put(`/tourist/${user?._id}`, form);

      setSnackbarMsg('Profile updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      if (onSave) onSave(res.data);
      setOpenEdit(false);

    } catch (err) {
      setSnackbarMsg(err?.response?.data?.error || 'Failed to save profile');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // Profile Completion
  const profileFields = [
    form.fullName,
    form.phone,
    form.nationality,
    form.dob,
    form.gender,
    form.language,
    form.interests,
  ];

  const completion =
    (profileFields.filter(Boolean).length / profileFields.length) * 100;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F8FAFB', pb: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* Premium Profile Container */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(79,138,139,0.12)',
            bgcolor: '#ffffff',
            mt: 1.5,
          }}
        >
          {/* Cover Section */}
          <Box
            sx={{
              height: { xs: 160, sm: 180, md: 200 },
              background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 50%, #5FA59D 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '40%',
                height: '100%',
                background: 'radial-gradient(circle at 100% 50%, rgba(249,237,105,0.15), transparent)',
                pointerEvents: 'none'
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: 300,
                height: 300,
                background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)',
                pointerEvents: 'none'
              }
            }}
          />

          {/* Main Content Grid */}
          <Grid container spacing={0} sx={{ position: 'relative' }}>
            {/* Left Section - Profile */}
            <Grid item xs={12} md={8} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, position: 'relative', mt: { xs: -6, sm: -7, md: -8 } }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                {/* Avatar */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={avatarPreview || '/default-avatar.png'}
                    sx={{
                      width: { xs: 100, sm: 120, md: 140 },
                      height: { xs: 100, sm: 120, md: 140 },
                      border: '5px solid #ffffff',
                      boxShadow: '0 20px 60px rgba(79,138,139,0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'scale(1.08)',
                      }
                    }}
                  />
                  <input
                    accept="image/*"
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                  />
                  <Tooltip title="Upload new photo" placement="top">
                    <IconButton
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploading}
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: '#4F8A8B',
                        color: '#fff',
                        width: { xs: 40, md: 52 },
                        height: { xs: 40, md: 52 },
                        border: '4px solid #fff',
                        '&:hover': {
                          bgcolor: '#3d6a6b',
                          transform: 'scale(1.1)',
                          boxShadow: '0 12px 24px rgba(79,138,139,0.3)'
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 8px 24px rgba(79,138,139,0.25)'
                      }}
                    >
                      <PhotoCamera sx={{ fontSize: { xs: 18, md: 24 } }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* User Info */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: '#1a1a1a',
                      mb: 0.5,
                      letterSpacing: '0.5px',
                      fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.2rem' }
                    }}
                  >
                    {form.fullName || user?.name || 'Tourist'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#6B7280',
                      fontWeight: 500,
                      fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.95rem' },
                      mb: 1
                    }}
                  >
                    {user?.email || 'Email not provided'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    {user?.country && (
                      <Chip
                        icon={<PublicIcon />}
                        label={user.country}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#4F8A8B',
                          color: '#4F8A8B',
                          fontWeight: 600,
                          backgroundColor: 'rgba(79,138,139,0.05)',
                          '& .MuiChip-icon': {
                            color: '#4F8A8B !important',
                            marginRight: '4px'
                          }
                        }}
                      />
                    )}
                    {form.language && (
                      <Chip
                        icon={<LanguageIcon />}
                        label={form.language}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#F9ED69',
                          color: '#B8860B',
                          fontWeight: 600,
                          backgroundColor: 'rgba(249,237,105,0.1)',
                          '& .MuiChip-icon': {
                            color: '#B8860B !important',
                            marginRight: '4px'
                          }
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2, opacity: 0.6 }} />

              {/* Profile Completion */}
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body1" fontWeight={700} color="#1a1a1a" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                    Profile Completion
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{
                        color: '#4F8A8B',
                        fontSize: { xs: '0.9rem', md: '1.1rem' }
                      }}
                    >
                      {Math.round(completion)}%
                    </Typography>
                    {completion === 100 && (
                      <Tooltip title="Profile Complete!" placement="right">
                        <CheckCircleIcon sx={{ color: '#10b981', fontSize: { xs: 18, md: 22 } }} />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={completion}
                  sx={{
                    height: 10,
                    borderRadius: 10,
                    backgroundColor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4F8A8B 0%, #6BA8AC 100%)',
                      borderRadius: 10,
                    }
                  }}
                />
              </Box>

              {/* Profile Information Cards */}
              <Box>
                <Typography variant="h6" fontWeight={800} mb={2} color="#1a1a1a" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: { xs: '0.75rem', md: '0.9rem' } }}>
                  Personal Information
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    {
                      icon: <PhoneIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Phone',
                      value: form.phone || '—',
                      bgColor: 'linear-gradient(135deg, rgba(79,138,139,0.06), rgba(107,168,172,0.06))'
                    },
                    {
                      icon: <CakeIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Date of Birth',
                      value: form.dob ? new Date(form.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—',
                      bgColor: 'linear-gradient(135deg, rgba(249,237,105,0.06), rgba(249,237,105,0.03))'
                    },
                    {
                      icon: <PublicIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Nationality',
                      value: form.nationality || '—',
                      bgColor: 'linear-gradient(135deg, rgba(79,138,139,0.06), rgba(107,168,172,0.06))'
                    },
                    {
                      icon: <WcIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Gender',
                      value: form.gender || '—',
                      bgColor: 'linear-gradient(135deg, rgba(249,237,105,0.06), rgba(249,237,105,0.03))'
                    },
                    {
                      icon: <LanguageIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Language',
                      value: form.language || '—',
                      bgColor: 'linear-gradient(135deg, rgba(79,138,139,0.06), rgba(107,168,172,0.06))'
                    },
                    {
                      icon: <InterestsIcon sx={{ color: '#4F8A8B', fontSize: 22 }} />,
                      label: 'Interests',
                      value: form.interests || '—',
                      bgColor: 'linear-gradient(135deg, rgba(249,237,105,0.06), rgba(249,237,105,0.03))'
                    },
                  ].map((item, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          background: item.bgColor,
                          border: '1.5px solid rgba(79,138,139,0.08)',
                          borderRadius: '16px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          height: '100%',
                          cursor: 'default',
                          '&:hover': {
                            transform: 'translateY(-6px)',
                            boxShadow: '0 16px 40px rgba(79,138,139,0.15)',
                            borderColor: 'rgba(79,138,139,0.2)',
                            background: item.bgColor
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" alignItems="flex-start" gap={1.5}>
                            <Box sx={{ 
                              mt: 0.3, 
                              p: 0.8, 
                              borderRadius: '12px',
                              backgroundColor: 'rgba(79,138,139,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 32,
                              minHeight: 32
                            }}>
                              {item.icon}
                            </Box>
                            <Box flex={1} minWidth={0}>
                              <Typography 
                                variant="caption" 
                                fontWeight={700} 
                                color="text.secondary" 
                                display="block" 
                                mb={0.4}
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: { xs: '0.6rem', md: '0.7rem' } }}
                              >
                                {item.label}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={700} 
                                color="#1a1a1a"
                                sx={{ fontSize: { xs: '0.85rem', md: '1rem' }, wordBreak: 'break-word' }}
                              >
                                {item.value}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

            {/* Right Section - Quick Stats */}
            <Grid item xs={12} md={4} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, bgcolor: '#F8FAFB', borderLeft: { md: '1px solid rgba(79,138,139,0.1)' } }}>
              <Typography variant="h6" fontWeight={800} mb={2} color="#1a1a1a" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: { xs: '0.75rem', md: '0.9rem' } }}>
                Quick Stats
              </Typography>

              {/* Stats Cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Trips Joined', value: '0', icon: '🌍', color: '#4F8A8B' },
                  { label: 'Destinations', value: '0', icon: '📍', color: '#6BA8AC' },
                  { label: 'My Reviews', value: '0', icon: '⭐', color: '#F9ED69' },
                  { label: 'Member Since', value: new Date(user?.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) || '2024', icon: '📅', color: '#4F8A8B' },
                ].map((stat, idx) => (
                  <Card
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '14px',
                      border: '1px solid rgba(79,138,139,0.1)',
                      background: 'linear-gradient(135deg, rgba(79,138,139,0.03), rgba(107,168,172,0.03))',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: 'rgba(79,138,139,0.2)',
                        boxShadow: '0 8px 24px rgba(79,138,139,0.1)'
                      }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, display: 'block', mb: 0.3, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                          {stat.value}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>{stat.icon}</Typography>
                    </Box>
                  </Card>
                ))}
              </Box>

              <Divider sx={{ my: 2, opacity: 0.5 }} />

              {/* Verification Badge */}
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '14px',
                  border: '1.5px solid rgba(16, 185, 129, 0.2)',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02))',
                  textAlign: 'center'
                }}
              >
                <Box sx={{ mb: 0.8 }}>
                  <CheckCircleIcon sx={{ fontSize: { xs: 32, md: 40 }, color: user?.isVerified ? '#10b981' : '#D1D5DB' }} />
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: user?.isVerified ? '#10b981' : '#6B7280', mb: 0.3, fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
                  {user?.isVerified ? 'Verified Account' : 'Verify Your Email'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                  {user?.isVerified ? 'Your email is verified' : 'Complete your verification'}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ opacity: 0.6 }} />

          {/* Action Buttons */}
          <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 }, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              sx={{
                borderRadius: '12px',
                py: 1,
                px: 2.5,
                fontWeight: 700,
                borderColor: '#E5E7EB',
                color: '#6B7280',
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#4F8A8B',
                  color: '#4F8A8B',
                  bgcolor: 'rgba(79,138,139,0.05)',
                }
              }}
            >
              View Travelogues
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setOpenEdit(true)}
              sx={{
                borderRadius: '12px',
                py: 1,
                px: 2.5,
                fontWeight: 700,
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                boxShadow: '0 8px 24px rgba(79,138,139,0.25)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: '0 12px 36px rgba(79,138,139,0.35)',
                  transform: 'translateY(-2px)',
                  background: 'linear-gradient(135deg, #3d6a6b 0%, #5FA59D 100%)',
                }
              }}
            >
              Edit Profile
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Edit Modal */}
      <Modal 
        open={openEdit} 
        onClose={() => setOpenEdit(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: { xs: '95%', sm: '90%', md: 500 },
            maxHeight: '85vh',
            overflowY: 'auto',
            bgcolor: '#fff',
            borderRadius: '24px',
            boxShadow: '0 25px 100px rgba(0,0,0,0.15)',
            p: { xs: 2.5, sm: 3 },
          }}
        >
          {/* Modal Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={800} color="#1a1a1a" sx={{ letterSpacing: '0.3px', fontSize: { xs: '1.3rem', md: '1.5rem' } }}>
              Edit Profile
            </Typography>
            <IconButton
              onClick={() => setOpenEdit(false)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#F3F4F6',
                color: '#6B7280',
                '&:hover': { 
                  bgcolor: '#E5E7EB',
                  color: '#1a1a1a'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2.5, opacity: 0.6 }} />

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '0.95rem',
                    fontWeight: 500
                  },
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 0.6
                  }
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Nationality"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              />

              <TextField
                select
                fullWidth
                label="Gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              >
                {genderOptions.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Preferred Language"
                name="language"
                value={form.language}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              >
                {languageOptions.map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Travel Interests"
                name="interests"
                value={form.interests}
                onChange={handleChange}
                variant="outlined"
                multiline
                rows={4}
                placeholder="e.g., Adventure, Cultural, Beach, Mountains..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                    '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' },
                  },
                }}
              />

              {/* Action Buttons */}
              <Box display="flex" gap={2} mt={1.5}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setOpenEdit(false)}
                  sx={{
                    borderRadius: '12px',
                    py: 1.2,
                    fontWeight: 700,
                    borderColor: '#E5E7EB',
                    color: '#6B7280',
                    border: '2px solid',
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#4F8A8B',
                      color: '#4F8A8B',
                      bgcolor: 'rgba(79,138,139,0.05)',
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={saving}
                  startIcon={<SaveIcon />}
                  sx={{
                    borderRadius: '12px',
                    py: 1.2,
                    fontWeight: 700,
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                    boxShadow: '0 8px 24px rgba(79,138,139,0.25)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 12px 36px rgba(79,138,139,0.35)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': {
                      opacity: 0.7,
                      cursor: 'not-allowed'
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </form>
        </Box>
      </Modal>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
