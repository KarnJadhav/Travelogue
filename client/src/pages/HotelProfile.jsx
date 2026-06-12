

import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/CloudUpload";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import api from "../api";
import { toAbsoluteAssetUrl } from "../config/runtime";

const hotelTypes = ["Resort", "Lodge", "Hostel", "Business hotel", "Guest house", "Apartment", "Homestay", "Other"];

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    bgcolor: "#f8f8f2",
  },
};

const getUploadUrl = (url) => {
  if (!url) return "";
  return toAbsoluteAssetUrl(url);
};

const normalizeAmenities = (value) =>
  String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function HotelProfile({ showHeader = true }) {
  // TODO: Replace with actual userId from auth context
  const userId = localStorage.getItem("userId");

  const [profile, setProfile] = useState({
    ownerName: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    cityState: "",
    hotelType: "",
    amenities: [],
    images: [],
  });
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ open: false, type: 'success', message: '' });
  const [saving, setSaving] = useState(false);
  const [amenityText, setAmenityText] = useState("");
  const fileInputRef = useRef();

  // Fetch full hotel profile from backend
  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/hotel/profile/${userId}`);
      setProfile({
        ownerName: res.data.ownerName || '',
        name: res.data.name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        cityState: res.data.cityState || '',
        hotelType: res.data.hotelType || '',
        amenities: res.data.amenities || [],
        images: res.data.images || []
      });
      setAmenityText((res.data.amenities || []).join(", "));
    } catch (err) {
      setProfile({
        ownerName: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        cityState: '',
        hotelType: '',
        amenities: [],
        images: []
      });
      setAmenityText("");
    }
  };
  useEffect(() => { fetchProfile(); }, [userId]);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  // Upload image file (persist to backend)
  const handleUploadImage = async (e) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", e.target.files[0]);
    try {
      await api.post(`/hotel/images/upload/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchProfile();
      setAlert({ open: true, type: 'success', message: 'Image uploaded successfully.' });
    } catch (err) {
      setAlert({ open: true, type: 'error', message: err?.response?.data?.error || 'Failed to upload image.' });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove image (persist to backend)
  const handleRemoveImage = async (idx) => {
    if (!userId) return;
    const url = profile.images[idx];
    setUploading(true);
    try {
      await api.delete(`/hotel/images/${userId}`, { data: { url } });
      await fetchProfile();
      setAlert({ open: true, type: 'success', message: 'Image removed.' });
    } catch (err) {
      setAlert({ open: true, type: 'error', message: err?.response?.data?.error || 'Failed to remove image.' });
    }
    setUploading(false);
  };

  // Save all profile changes
  const handleSave = async () => {
    if (!userId) {
      setAlert({ open: true, type: 'error', message: 'User not logged in.' });
      return;
    }
    setSaving(true);
    const amenities = normalizeAmenities(amenityText);
    try {
      const res = await api.put(`/hotel/profile/${userId}`,
        {
          ownerName: profile.ownerName,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          cityState: profile.cityState,
          hotelType: profile.hotelType,
          amenities,
          images: profile.images
        }
      );
      setProfile((prev) => ({
        ...prev,
        ...res.data,
        amenities: res.data?.amenities || [],
        images: res.data?.images || [],
      }));
      setAmenityText((res.data?.amenities || []).join(", "));
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            name: res.data?.ownerName || storedUser?.name,
            email: res.data?.email || storedUser?.email,
            phone: res.data?.phone || storedUser?.phone,
          })
        );
      } catch (e) {
        // ignore storage errors
      }
      setAlert({ open: true, type: 'success', message: 'Profile saved successfully.' });
    } catch (err) {
      setAlert({ open: true, type: 'error', message: err?.response?.data?.error || 'Failed to save profile.' });
      setSaving(false);
    }
    setSaving(false);
  };

  const primaryHotelImage = profile.images?.[0] ? getUploadUrl(profile.images[0]) : "";

  return (
    <Box>
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.type} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Box sx={{ maxWidth: 640, mx: 'auto', bgcolor: '#fafaf6', p: { xs: 2.5, md: 4 }, borderRadius: 4, boxShadow: 2 }}>
        {showHeader && (
          <>
            <Typography variant="h4" fontWeight={700} mb={1} sx={{ fontFamily: 'serif' }}>
              Hotel Profile
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" mb={3}>
              Manage your hotel information and verification details
            </Typography>
          </>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <Box mb={2} display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #ccc',
                bgcolor: '#eef2f7',
                display: 'grid',
                placeItems: 'center',
                flex: '0 0 auto',
              }}
            >
              {primaryHotelImage ? (
                <img src={primaryHotelImage} alt="Hotel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ApartmentIcon sx={{ color: '#64748b', fontSize: 34 }} />
              )}
            </Box>
            <Button variant="outlined" component="label" disabled={uploading} sx={{ height: 40 }}>
              {uploading ? 'Uploading...' : 'Update Photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handleUploadImage}
              />
            </Button>
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><BadgeIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Owner/manager full name</Typography>
            <TextField fullWidth name="ownerName" value={profile.ownerName} onChange={handleChange} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><ApartmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Hotel name</Typography>
            <TextField fullWidth name="name" value={profile.name} onChange={handleChange} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Email address</Typography>
            <TextField fullWidth name="email" type="email" value={profile.email} onChange={handleChange} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Mobile number</Typography>
            <TextField fullWidth name="phone" value={profile.phone} onChange={handleChange} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> City/state</Typography>
            <TextField fullWidth name="cityState" value={profile.cityState} onChange={handleChange} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Hotel type</Typography>
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>Hotel type</InputLabel>
              <Select
                label="Hotel type"
                name="hotelType"
                value={profile.hotelType}
                onChange={(event) => setProfile((prev) => ({ ...prev, hotelType: event.target.value }))}
              >
                {hotelTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Hotel address</Typography>
            <TextField fullWidth name="address" value={profile.address} onChange={handleChange} multiline rows={2} sx={inputSx} />
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={1}>Amenities</Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={amenityText}
              onChange={(event) => setAmenityText(event.target.value)}
              placeholder="Wi-Fi, AC, Parking, Restaurant"
              helperText="Enter amenities manually. Separate multiple amenities with commas or new lines."
              sx={inputSx}
            />
          </Box>

          {profile.images.length > 0 && (
            <Box mb={2}>
              <Typography fontWeight={600} mb={1}>Hotel photos</Typography>
              <Box display="flex" flexWrap="wrap" gap={1.25}>
                {profile.images.map((img, index) => {
                  const src = getUploadUrl(img);
                  return (
                    <Box key={img || index} sx={{ position: 'relative', width: 94, height: 70, borderRadius: 2, overflow: 'hidden', border: '1px solid #dbe3ee' }}>
                      <img src={src} alt="Hotel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveImage(index)}
                        sx={{ position: 'absolute', top: 3, right: 3, bgcolor: 'rgba(255,255,255,0.88)', width: 24, height: 24 }}
                      >
                        <DeleteIcon color="error" fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            color="success"
            fullWidth
            sx={{ borderRadius: 8, py: 1.5, fontWeight: 700, fontSize: 18, mt: 2 }}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
          </Button>
        </form>
      </Box>
    </Box>
  );
}
