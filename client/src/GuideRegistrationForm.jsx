import React, { useState } from 'react';
import api from '../src/api';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';

const PHONE_REGEX = /^\d{10}$/;
const normalizePhoneNumber = (phone) => String(phone || '').replace(/\D/g, '');

export default function GuideRegistrationForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    bio: '',
    experienceYears: '',
    languages: '',
    identityProof: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? normalizePhoneNumber(value).slice(0, 10) : value;
    setForm(prev => ({ ...prev, [name]: nextValue }));
  };

  const handleIdentityProofChange = e => {
    setForm(prev => ({ ...prev, identityProof: e.target.files?.[0] || null }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (!form.identityProof) {
      setError('Identity proof is required for guide registration.');
      setLoading(false);
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (form.confirmPassword !== form.password) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    const phone = normalizePhoneNumber(form.phone);
    if (!PHONE_REGEX.test(phone)) {
      setError('Enter a 10-digit mobile number.');
      setLoading(false);
      return;
    }
    try {
      const submitData = new FormData();
      Object.entries({
        name: form.name,
        email: form.email,
        password: form.password,
        phone,
        bio: form.bio,
        experienceYears: form.experienceYears,
        languages: form.languages,
        role: 'guide',
      }).forEach(([key, value]) => submitData.append(key, value));
      submitData.append('identityProof', form.identityProof);

      await api.post('/register', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Registration submitted! Awaiting admin approval.');
      setForm({
        name: '', email: '', password: '', confirmPassword: '', phone: '', bio: '', experienceYears: '', languages: '', identityProof: null,
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: 2 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>Guide Registration</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          fullWidth
          required
          helperText="Enter exactly 10 digits"
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10 }}
          sx={{ mb: 2 }}
        />
        <TextField label="Bio" name="bio" value={form.bio} onChange={handleChange} fullWidth multiline rows={2} required sx={{ mb: 2 }} />
        <TextField label="Experience (years)" name="experienceYears" value={form.experienceYears} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
        <TextField label="Known languages" name="languages" value={form.languages} onChange={handleChange} fullWidth required helperText="Separate multiple languages with commas." sx={{ mb: 2 }} />
        <Button variant="outlined" component="label" fullWidth sx={{ mb: 2, py: 1.2, fontWeight: 700 }}>
          {form.identityProof?.name || 'Upload identity proof PDF or image *'}
          <input hidden type="file" accept="application/pdf,image/*,.pdf" onChange={handleIdentityProofChange} aria-required="true" />
        </Button>
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ py: 1.5, fontWeight: 700 }}>
          {loading ? <CircularProgress size={24} /> : 'Register as Guide'}
        </Button>
      </form>
    </Box>
  );
}
