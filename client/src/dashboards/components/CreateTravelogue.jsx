import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box, Button, TextField, Typography, Rating, Chip, Stack, Paper, Alert, Snackbar, IconButton, Tooltip, Stepper, Step, StepLabel, Card, Divider, InputAdornment, useTheme
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/SaveAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GroupIcon from '@mui/icons-material/Group';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const steps = ['Write Story', 'Media Upload', 'Trip Details', 'Review & Publish'];
const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];

export default function CreateTravelogue() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  // Scroll to top when step changes for better UX
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    location: '',
    rating: 0,
    tags: [],
    startDate: '',
    endDate: '',
    travelersCount: 1,
    estimatedCost: '',
    season: '',
    highlights: []
  });

  const [media, setMedia] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      background:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      borderColor: alpha(theme.palette.text.primary, 0.08),
      '&:hover fieldset': { borderColor: '#4F8A8B', borderWidth: '1.5px' },
      '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' }
    }
  };

  const sectionCardSx = {
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    bgcolor: '#ffffff',
    boxShadow: '0 10px 30px rgba(15,23,42,0.03)',
    p: { xs: 2, md: 2.5 }
  };

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDate = useMemo(() => dayjs(todayIso), [todayIso]);
  const computedDuration = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return '';

    const start = new Date(`${formData.startDate}T00:00:00`);
    const end = new Date(`${formData.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : '';
  }, [formData.startDate, formData.endDate]);

  const datePickerFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(79,138,139,0.18)',
      boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
      '&:hover fieldset': { borderColor: '#4F8A8B' },
      '&.Mui-focused fieldset': { borderColor: '#4F8A8B', borderWidth: '2px' }
    },
    '& .MuiInputBase-input': {
      fontWeight: 600,
      color: '#0F172A'
    }
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    setMedia([...media, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setMedia([...media, ...validFiles]);
  };

  const handleRemoveMedia = (idx) => {
    setMedia(media.filter((_, i) => i !== idx));
  };

  const handleAddTag = () => {
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag && !formData.tags.includes(cleanTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, cleanTag]
      });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToDelete)
    });
  };

  const handleAddHighlight = () => {
    const cleanHighlight = highlightInput.trim();
    if (cleanHighlight && !formData.highlights.includes(cleanHighlight)) {
      setFormData({
        ...formData,
        highlights: [...formData.highlights, cleanHighlight]
      });
      setHighlightInput('');
    }
  };

  const handleDeleteHighlight = (highlight) => {
    setFormData({
      ...formData,
      highlights: formData.highlights.filter(h => h !== highlight)
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let nextValue = value;

      if (name === 'travelersCount') {
        const parsed = Number.parseInt(nextValue, 10);
        nextValue = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
      }

      if ((name === 'startDate' || name === 'endDate') && nextValue && nextValue > todayIso) {
        nextValue = todayIso;
      }

      const next = { ...prev, [name]: nextValue };

      if (name === 'startDate' && next.endDate && next.endDate < next.startDate) {
        next.endDate = next.startDate;
      }

      if (name === 'endDate' && next.startDate && next.endDate < next.startDate) {
        next.startDate = next.endDate;
      }

      return next;
    });
  };

  const handleStartDateChange = (newValue) => {
    setFormData((prev) => {
      if (!newValue || !dayjs(newValue).isValid()) {
        return { ...prev, startDate: '', endDate: '' };
      }

      let nextStart = dayjs(newValue).startOf('day');
      if (nextStart.isAfter(todayDate, 'day')) {
        nextStart = todayDate;
      }

      const nextStartIso = nextStart.format('YYYY-MM-DD');
      let nextEndIso = prev.endDate;
      if (nextEndIso && dayjs(nextEndIso).isBefore(nextStart, 'day')) {
        nextEndIso = nextStartIso;
      }

      return {
        ...prev,
        startDate: nextStartIso,
        endDate: nextEndIso
      };
    });
  };

  const handleEndDateChange = (newValue) => {
    setFormData((prev) => {
      if (!newValue || !dayjs(newValue).isValid()) {
        return { ...prev, endDate: '' };
      }

      let nextEnd = dayjs(newValue).startOf('day');
      if (nextEnd.isAfter(todayDate, 'day')) {
        nextEnd = todayDate;
      }

      if (prev.startDate) {
        const start = dayjs(prev.startDate).startOf('day');
        if (nextEnd.isBefore(start, 'day')) {
          nextEnd = start;
        }
      }

      return {
        ...prev,
        endDate: nextEnd.format('YYYY-MM-DD')
      };
    });
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (asDraft = false) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formData[key].forEach(item => submitData.append(key, item));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      if (computedDuration) {
        submitData.append('duration', String(computedDuration));
      }

      // Add media files
      media.forEach(file => {
        submitData.append('media', file);
      });

      const endpoint = asDraft ? '/travelogue/draft' : '/travelogue/create';
      await api.post(endpoint, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setTimeout(() => {
        // Reset form
        setFormData({
          title: '', description: '', destination: '', location: '', rating: 0, tags: [],
          startDate: '', endDate: '', travelersCount: 1, estimatedCost: '',
          season: '', highlights: []
        });
        setMedia([]);
        setActiveStep(0);
        // Switch back to feed view
        window.dispatchEvent(new CustomEvent('travelogueSubTab', { detail: { tab: 'explore' } }));
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit travelogue.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) return formData.title.trim() && formData.description.trim() && formData.destination.trim();
    if (activeStep === 1) return media.length > 0;
    if (activeStep === 2) return formData.startDate && formData.endDate && !!computedDuration;
    return true;
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'auto',
        bgcolor: '#F8FAFB',
        pb: 2
      }}
    >
      <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        
        {/* Header Cover Banner */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(15,23,42,0.05)',
            background: '#ffffff',
            color: '#0F172A',
            mt: 1,
            mb: 2,
            border: '1px solid rgba(148, 163, 184, 0.12)'
          }}
        >
          {/* Cover Artwork */}
          <Box
              sx={{
                height: { xs: 92, sm: 104, md: 114 },
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                p: { xs: 2, sm: 2.5, md: 3 },
                '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '320px',
                height: '100%',
                background: 'radial-gradient(circle, rgba(79, 138, 139, 0.2) 0%, transparent 70%)',
                pointerEvents: 'none'
              }
            }}
          >
            <Stack direction="row" spacing={3} alignItems="center" sx={{ zIndex: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '12px',
                  bgcolor: 'rgba(79,138,139,0.08)',
                  border: '1px solid rgba(79,138,139,0.15)',
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 24, color: '#4F8A8B' }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.5px',
                    fontFamily: '"Sora", sans-serif',
                    fontSize: { xs: '1.3rem', md: '1.8rem' }
                  }}
                >
                  Create a Travelogue
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: '0.86rem', mt: 0.2, fontWeight: 500 }}>
                  Craft a beautiful step-by-step travel journal complete with photos, reels, and tips.
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Stepper Navigation */}
          <Box sx={{ p: { xs: 2, sm: 2.2, md: 2.4 }, bgcolor: '#fff' }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '14px',
                border: '1px solid rgba(79, 138, 139, 0.15)',
                bgcolor: 'rgba(79, 138, 139, 0.04)',
                mb: 2
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight={800} color="#4F8A8B">
                  Step {activeStep + 1} of {steps.length} - {steps[activeStep]}
                </Typography>
                <Typography variant="caption" color="#64748B" fontWeight={700}>
                  PROGRESS CHRONOLOGY
                </Typography>
              </Stack>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#64748B',
                          '&.Mui-active': { color: '#4F8A8B' },
                          '&.Mui-completed': { color: '#10b981' }
                        },
                        '& .MuiStepIcon-root': {
                          color: '#e2e8f0',
                          '&.Mui-active': { color: '#4F8A8B' },
                          '&.Mui-completed': { color: '#10b981' }
                        }
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <AnimatePresence exitBeforeEnter>
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={9}>
                
                {/* Step 1: Write Story */}
                {activeStep === 0 && (
              <motion.div key={0} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} color="#0f172a" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Tell Us Your Story
                    </Typography>
                    <Stack spacing={3}>
                      <TextField
                        label="Journey Title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g. Hiking through the peaks of Himalayas"
                        sx={inputSx}
                      />
                      <TextField
                        label="Destination / Country"
                        name="destination"
                        value={formData.destination}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g. Manali, Himachal Pradesh, India"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnIcon sx={{ color: '#4F8A8B' }} />
                            </InputAdornment>
                          )
                        }}
                        sx={inputSx}
                      />
                      <TextField
                        label="Travel Experience Description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Share your personal memories, routes taken, recommendations, local cuisines, and advice..."
                        sx={inputSx}
                      />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#475569">
                          RATE YOUR TRIP EXPERIENCE
                        </Typography>
                        <Rating
                          value={formData.rating}
                          onChange={(e, newValue) => setFormData({ ...formData, rating: newValue })}
                          size="large"
                          emptyIcon={<StarIcon style={{ opacity: 0.25 }} fontSize="inherit" />}
                          sx={{ '& .MuiRating-icon': { fontSize: '2.5rem' } }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                </motion.div>
                )}

                {/* Step 2: Media Upload */}
                {activeStep === 1 && (
              <motion.div key={1} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} color="#0f172a" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Add Photos & Videos
                    </Typography>
                    
                    {/* Drag-and-Drop Area */}
                    <Box
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current.click()}
                      sx={{
                        border: isDragOver ? '2px dashed #4F8A8B' : '2px dashed rgba(148,163,184,0.4)',
                        borderRadius: '20px',
                        p: 5,
                        textAlign: 'center',
                        bgcolor: isDragOver ? 'rgba(79,138,139,0.04)' : 'rgba(148,163,184,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        mb: 4,
                        '&:hover': {
                          borderColor: '#4F8A8B',
                          bgcolor: 'rgba(79,138,139,0.02)'
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleMediaChange}
                      />
                      <CloudUploadIcon sx={{ color: isDragOver ? '#4F8A8B' : '#94A3B8', fontSize: 50, mb: 1.5 }} />
                      <Typography fontWeight={800} color="#334155" sx={{ fontSize: '1rem' }} mb={0.5}>
                        Drag & drop trip files here
                      </Typography>
                      <Typography variant="caption" color="#64748B" fontWeight={500}>
                        Supports JPEG, PNG, MP4. Click to choose folder files.
                      </Typography>
                    </Box>

                    {/* Previews grid */}
                    {media.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} mb={2.5} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Selected Media ({media.length})
                        </Typography>
                        <Grid container spacing={2}>
                          {media.map((file, idx) => {
                            const isImage = file.type.startsWith('image/');
                            const url = URL.createObjectURL(file);
                            return (
                              <Grid item xs={6} sm={4} key={idx}>
                                <Card
                                  elevation={0}
                                  sx={{
                                    position: 'relative',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(148,163,184,0.15)',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                    height: 140
                                  }}
                                >
                                  {isImage ? (
                                    <Box
                                      component="img"
                                      src={url}
                                      alt={file.name}
                                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 800 }}>REEL</Typography>
                                    </Box>
                                  )}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveMedia(idx)}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      bgcolor: 'rgba(239, 68, 68, 0.95)',
                                      color: '#fff',
                                      width: 22,
                                      height: 22,
                                      zIndex: 3,
                                      '&:hover': { bgcolor: '#ef4444' }
                                    }}
                                  >
                                    <CloseIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 0.8, bgcolor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                                    <Typography variant="caption" color="#fff" noWrap display="block" sx={{ fontSize: '0.65rem' }}>
                                      {file.name}
                                    </Typography>
                                  </Box>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                </motion.div>
                )}

                {/* Step 3: Trip Details */}
                {activeStep === 2 && (
              <motion.div key={2} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3.5} color="#0f172a" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Additional Trip Details
                    </Typography>
                    
                    <Stack spacing={3.5}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container spacing={3.5}>
                          <Grid item xs={12} sm={6}>
                            <DatePicker
                              label="Start Date"
                              value={formData.startDate ? dayjs(formData.startDate) : null}
                              onChange={handleStartDateChange}
                              disableFuture
                              maxDate={todayDate}
                              format="DD MMM YYYY"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  helperText: 'Only past dates or today',
                                  sx: datePickerFieldSx
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DatePicker
                              label="End Date"
                              value={formData.endDate ? dayjs(formData.endDate) : null}
                              onChange={handleEndDateChange}
                              disableFuture
                              minDate={formData.startDate ? dayjs(formData.startDate) : undefined}
                              maxDate={todayDate}
                              format="DD MMM YYYY"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  helperText: 'Only past dates or today',
                                  sx: datePickerFieldSx
                                }
                              }}
                            />
                          </Grid>
                        </Grid>
                      </LocalizationProvider>

                      <Grid container spacing={3.5}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Duration (Auto Calculated)"
                            value={computedDuration ? `${computedDuration} day(s)` : ''}
                            placeholder="Select start and end date"
                            fullWidth
                            InputProps={{ readOnly: true }}
                            sx={inputSx}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Travelers Count"
                            type="number"
                            name="travelersCount"
                            placeholder="e.g. 2"
                            value={formData.travelersCount}
                            onChange={handleInputChange}
                            fullWidth
                            inputProps={{ min: 1, step: 1 }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <GroupIcon sx={{ color: '#4F8A8B', fontSize: 18 }} />
                                </InputAdornment>
                              )
                            }}
                            helperText="Minimum 1 traveler"
                            sx={inputSx}
                          />
                        </Grid>
                      </Grid>

                      <Grid container spacing={3.5}>
                        <Grid item xs={12}>
                          <TextField
                            select
                            label="Best Season"
                            name="season"
                            value={formData.season}
                            onChange={handleInputChange}
                            fullWidth
                            SelectProps={{ native: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <WbSunnyIcon sx={{ color: '#4F8A8B', fontSize: 18 }} />
                                </InputAdornment>
                              )
                            }}
                            sx={inputSx}
                          >
                            <option value="">Choose Season</option>
                            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                          </TextField>
                        </Grid>
                      </Grid>

                      <TextField
                        label="Estimated Budget (INR / Local)"
                        type="number"
                        name="estimatedCost"
                        placeholder="e.g. 25000"
                        value={formData.estimatedCost}
                        onChange={handleInputChange}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <MonetizationOnIcon sx={{ color: '#4F8A8B', fontSize: 18 }} />
                            </InputAdornment>
                          )
                        }}
                        sx={inputSx}
                      />

                      {/* Key highlights composer */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#475569">
                          ADD HIGHLIGHT MOMENTS
                        </Typography>
                        <Stack direction="row" spacing={1.5} mb={2}>
                          <TextField
                            size="small"
                            value={highlightInput}
                            onChange={(e) => setHighlightInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHighlight(); } }}
                            placeholder="e.g. Scuba diving, Sunset dinner, Local tour guides"
                            fullWidth
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                          />
                          <Button 
                            onClick={handleAddHighlight} 
                            variant="outlined" 
                            sx={{ borderRadius: '12px', borderColor: 'rgba(79, 138, 139, 0.4)', color: '#4F8A8B', px: 3, fontWeight: 700 }}
                          >
                            Add
                          </Button>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap gap={1}>
                          {formData.highlights.map((h) => (
                          <motion.div layout>
                            <Chip
                              key={h}
                              label={h}
                              onDelete={() => handleDeleteHighlight(h)}
                              sx={{
                                borderRadius: '10px',
                                fontWeight: 700,
                                bgcolor: 'rgba(79,138,139,0.06)',
                                color: '#4F8A8B',
                                border: '1px solid rgba(79,138,139,0.1)'
                              }}
                            />
                          </motion.div>
                          ))}
                        </Stack>
                      </Box>

                      {/* Keywords Input */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="#475569">
                          KEYWORDS / TAGS
                        </Typography>
                        <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
                          <TextField
                            size="small"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                            placeholder="e.g. adventure, solo-trip, budget-hotel"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, width: '100%' }}
                          />
                          <Button 
                            onClick={handleAddTag} 
                            variant="outlined" 
                            sx={{ borderRadius: '12px', borderColor: 'rgba(79, 138, 139, 0.4)', color: '#4F8A8B', px: 2, fontWeight: 700 }}
                          >
                            Add
                          </Button>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap gap={1}>
                          {formData.tags.map((tag) => (
                          <motion.div layout>
                            <Chip
                              key={tag}
                              label={tag}
                              onDelete={() => handleDeleteTag(tag)}
                              sx={{
                                borderRadius: '10px',
                                fontWeight: 700,
                                bgcolor: 'rgba(245, 158, 11, 0.06)',
                                color: '#d97706',
                                border: '1px solid rgba(245, 158, 11, 0.12)'
                              }}
                            />
                          </motion.div>
                          ))}
                        </Stack>
                      </Box>
                    </Stack>
                </Box>
              </motion.div>
                )}

                {/* Step 4: Review Details */}
                {activeStep === 3 && (
                  <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3.5} color="#0f172a" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Review Summary
                    </Typography>
                    
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 3, 
                        borderRadius: '16px', 
                        bgcolor: '#f8fafc', 
                        border: '1px solid rgba(148,163,184,0.1)' 
                      }}
                    >
                      <Grid container spacing={3.5}>
                        <Grid item xs={12}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>TITLE</Typography>
                          <Typography variant="h6" fontWeight={800} color="#0f172a">{formData.title || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>DESTINATION</Typography>
                          <Typography variant="body1" fontWeight={600} color="#1e293b">{formData.destination || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>RATING SCORE</Typography>
                          <Rating value={formData.rating} readOnly size="small" />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>DESCRIPTION</Typography>
                          <Typography variant="body2" color="#334155" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {formData.description || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>DURATION</Typography>
                          <Typography variant="body1" fontWeight={700} color="#1e293b">{computedDuration || '—'} Day(s)</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>TRAVELERS COUNT</Typography>
                          <Typography variant="body1" fontWeight={700} color="#1e293b">{formData.travelersCount} Person(s)</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>ESTIMATED COST</Typography>
                          <Typography variant="body1" fontWeight={700} color="#1e293b">₹{formData.estimatedCost || '0'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography fontWeight={700} color="#64748B" fontSize="0.75rem" sx={{ letterSpacing: '0.5px' }}>MEDIA ATTACHMENTS</Typography>
                          <Typography variant="body1" fontWeight={700} color="#10b981">{media.length} files selected</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>
                )}

                {/* Stepper Buttons Row */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, justifyContent: 'space-between' }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    sx={{
                      borderRadius: '12px',
                      py: 1.3,
                      px: 3,
                      fontWeight: 700,
                      borderColor: 'rgba(148,163,184,0.3)',
                      color: '#64748B',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#4F8A8B',
                        color: '#4F8A8B',
                        bgcolor: 'rgba(79,138,139,0.03)'
                      }
                    }}
                  >
                    Back
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {activeStep === 3 && (
                      <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        sx={{
                          borderRadius: '12px',
                          py: 1.3,
                          px: 3,
                          fontWeight: 700,
                          borderColor: 'rgba(79, 138, 139, 0.4)',
                          color: '#4F8A8B',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#4F8A8B',
                            bgcolor: 'rgba(79, 138, 139, 0.05)'
                          }
                        }}
                      >
                        Save Draft
                      </Button>
                    )}

                    {activeStep < 3 ? (
                      <Button
                        disabled={!isStepValid()}
                        onClick={handleNext}
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          borderRadius: '12px',
                          py: 1.3,
                          px: 4,
                          fontWeight: 700,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                          boxShadow: '0 8px 24px rgba(79,138,139,0.25)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5ea1a2 0%, #7cbfc3 100%)',
                          }
                        }}
                      >
                        Next Step
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        sx={{
                          borderRadius: '12px',
                          py: 1.3,
                          px: 4,
                          fontWeight: 700,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          }
                        }}
                      >
                        {loading ? 'Publishing...' : 'Publish Travelogue'}
                      </Button>
                    )}
                  </Box>
                </Box>

              </Grid>

              {/* Sidebar Help Card Checklist */}
              <Grid item xs={12} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '24px',
                    border: '1px solid rgba(79,138,139,0.15)',
                    bgcolor: 'rgba(79,138,139,0.03)',
                    p: 3,
                    position: { md: 'sticky' },
                    top: 100
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={2} sx={{ fontFamily: '"Sora", sans-serif' }}>
                    Setup Advice
                  </Typography>
                  <Stack spacing={2} mb={2.5}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4F8A8B', mt: 0.8, flexShrink: 0 }} />
                      <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.4 }}>
                        A solid, interesting title captures search interest.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4F8A8B', mt: 0.8, flexShrink: 0 }} />
                      <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.4 }}>
                        Add up to 10 photos or short clips of locations.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4F8A8B', mt: 0.8, flexShrink: 0 }} />
                      <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.4 }}>
                        Provide cost estimates and days spent to guide other travelers.
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Divider sx={{ my: 2.5 }} />

                  <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1} sx={{ fontFamily: '"Sora", sans-serif' }}>
                    Review Policy
                  </Typography>
                  <Typography variant="body2" color="#64748B" sx={{ lineHeight: 1.5 }}>
                    Submissions are moderated within 24 hours to guarantee genuine experiences and prevent spam.
                  </Typography>
                </Card>
              </Grid>
              </Grid>
            </AnimatePresence>

            </Box>
        </Paper>

      </Box>

      {/* Snackbar Notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%', borderRadius: '12px' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ width: '100%', borderRadius: '12px' }}>
          Travelogue submitted successfully! 🎉
        </Alert>
      </Snackbar>
    </Box>
  );
}
