import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Paper, Chip, Avatar, Stack, CircularProgress, TextField, InputAdornment, IconButton, MenuItem, Select, Dialog, DialogTitle, DialogContent, DialogActions, Card, Tab, Tabs } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import PlaceIcon from '@mui/icons-material/Place';
import CallIcon from '@mui/icons-material/Call';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import { fetchHospitals } from '../../common/opentripmap';
import { motion } from 'framer-motion';

const OPENTRIPMAP_API_KEY = import.meta.env.VITE_OPENTRIPMAP_API_KEY || '';

// ===== DYNAMIC DATA STRUCTURE - Can be fetched from API/Database =====
const INDIAN_LOCATIONS = [
  { label: 'Delhi', value: 'delhi', lat: 28.6139, lon: 77.2090, country: 'India' },
  { label: 'Mumbai', value: 'mumbai', lat: 19.0760, lon: 72.8777, country: 'India' },
  { label: 'Bangalore', value: 'bangalore', lat: 12.9716, lon: 77.5946, country: 'India' },
  { label: 'Jaipur', value: 'jaipur', lat: 26.9124, lon: 75.7873, country: 'India' },
  { label: 'Goa', value: 'goa', lat: 15.2993, lon: 73.8243, country: 'India' },
  { label: 'Kolkata', value: 'kolkata', lat: 22.5726, lon: 88.3639, country: 'India' },
  { label: 'Chennai', value: 'chennai', lat: 13.0827, lon: 80.2707, country: 'India' },
  { label: 'Hyderabad', value: 'hyderabad', lat: 17.3850, lon: 78.4867, country: 'India' },
];

// Emergency services with verified universal Indian Numbers
// All numbers are verified and available across all Indian cities, 24/7
const VERIFIED_EMERGENCY_SERVICES = [
  { 
    label: 'Police Emergency', 
    number: '100', 
    icon: 'police', 
    color: '#1976D2',
    description: 'Police control room for emergencies',
    details: 'Crime, accidents, theft - Available 24/7'
  },
  { 
    label: 'Ambulance Emergency', 
    number: '102', 
    icon: 'ambulance', 
    color: '#D32F2F',
    description: 'Ambulance service',
    details: 'Medical emergencies - Available 24/7'
  },
  { 
    label: 'Fire Department', 
    number: '101', 
    icon: 'fire', 
    color: '#FF6F00',
    description: 'Fire and rescue services',
    details: 'Fire, accidents, rescue operations - 24/7'
  },
  { 
    label: 'Women Helpline', 
    number: '1091', 
    icon: 'phone', 
    color: '#7B1FA2',
    description: 'Women in distress helpline',
    details: 'Safety and support for women travelers'
  },
  { 
    label: 'Medical Helpline', 
    number: '104', 
    icon: 'warning', 
    color: '#FF9800',
    description: 'Health and medical guidance',
    details: 'Medical information and health advice'
  },
  { 
    label: 'Disaster Management', 
    number: '1070', 
    icon: 'warning', 
    color: '#F57C00',
    description: 'Disaster and crisis management',
    details: 'Natural disasters and major emergencies'
  },
];

// Create service map for each city (all cities have same verified services)
const EMERGENCY_SERVICES = {
  delhi: VERIFIED_EMERGENCY_SERVICES,
  mumbai: VERIFIED_EMERGENCY_SERVICES,
  bangalore: VERIFIED_EMERGENCY_SERVICES,
  jaipur: VERIFIED_EMERGENCY_SERVICES,
  goa: VERIFIED_EMERGENCY_SERVICES,
  kolkata: VERIFIED_EMERGENCY_SERVICES,
  chennai: VERIFIED_EMERGENCY_SERVICES,
  hyderabad: VERIFIED_EMERGENCY_SERVICES,
};

// Emergency protocols and first aid tips
const EMERGENCY_PROTOCOLS = [
  { title: 'Medical Emergency', icon: '🏥', steps: ['Call 102 for ambulance', 'Provide location details', 'Keep patient calm', 'Note vital signs', 'Have medical history ready'] },
  { title: 'Police Emergency', icon: '🚨', steps: ['Call 100 immediately', 'Stay calm and provide location', 'Describe the incident clearly', 'Note suspect/vehicle details', 'Follow police instructions'] },
  { title: 'Fire Emergency', icon: '🔥', steps: ['Call 101 or 102', 'Evacuate the area immediately', 'Use stairs, never elevators', 'Meet at assembly point', 'Wait for firefighters'] },
  { title: 'Accident/Injury', icon: '⚠️', steps: ['Call 102 for ambulance', 'Do not move injured person', 'Apply basic first aid if trained', 'Keep person conscious', 'Provide clear location details'] },
];

function EmergencySupportPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedLocation, setSelectedLocation] = useState('delhi');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchLoc, setSearchLoc] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [openProtocolDialog, setOpenProtocolDialog] = useState(false);

  // Get icon component based on icon type
  const getIconComponent = (iconType) => {
    const iconProps = { fontSize: 'large', sx: { fontSize: 36 } };
    switch(iconType) {
      case 'police':
        return <LocalPoliceIcon {...iconProps} />;
      case 'ambulance':
        return <LocalHospitalIcon {...iconProps} />;
      case 'fire':
        return <LocalFireDepartmentIcon {...iconProps} />;
      case 'phone':
        return <LocalPhoneIcon {...iconProps} />;
      case 'warning':
        return <WarningIcon {...iconProps} />;
      case 'info':
      default:
        return <InfoIcon {...iconProps} />;
    }
  };

  // Fetch hospitals based on location
  useEffect(() => {
    let loc;
    if (searchLoc) {
      loc = searchLoc;
    } else {
      loc = INDIAN_LOCATIONS.find(l => l.value === selectedLocation);
    }
    if (!loc) return;
    
    setLoading(true);
    fetchHospitals(loc.lat, loc.lon, 5000)
      .then(results => {
        const mapped = results.map(f => ({
          name: f.properties.name || 'Unknown Hospital',
          address: f.properties.address || 'Address not available',
          distance: f.properties.dist ? `${Math.round(f.properties.dist)} m` : 'Distance unknown',
        }));
        setHospitals(mapped.slice(0, 8)); // Limit to 8 hospitals
      })
      .catch(() => setHospitals([]))
      .finally(() => setLoading(false));
  }, [selectedLocation, searchLoc]);

  const emergencyServices = EMERGENCY_SERVICES[selectedLocation] || [];

  const handleSearch = async () => {
    if (!search.trim()) return;
    if (!OPENTRIPMAP_API_KEY) {
      setSearchLoc(null);
      setHospitals([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(search)}&apikey=${OPENTRIPMAP_API_KEY}`);
      const data = await resp.json();
      if (data.lat && data.lon) {
        setSearchLoc({ lat: data.lat, lon: data.lon, value: 'search', label: search });
      } else {
        setSearchLoc(null);
        setHospitals([]);
      }
    } catch {
      setSearchLoc(null);
      setHospitals([]);
    }
    setLoading(false);
  };

  const handleResetSearch = () => {
    setSearch('');
    setSearchLoc(null);
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber.startsWith('+')) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  return (
    <Box sx={{
      p: { xs: 2, md: 4 },
      minHeight: { xs: 'auto', md: '100vh' },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    }}>
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={isMobile ? 2 : 2.5} mb={4} sx={{ bgcolor: '#fff', p: 3, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Avatar sx={{ bgcolor: '#D32F2F', width: 64, height: 64, boxShadow: 3 }}>
            <WarningIcon sx={{ fontSize: 38 }} />
          </Avatar>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h3" fontWeight={900} sx={{ color: '#D32F2F', fontSize: { xs: 28, md: 36 } }}>
              Emergency Support
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
              Quick access to emergency services, hospitals, and safety protocols in India
            </Typography>
          </Box>
        </Stack>
      </motion.div>

      {/* Location Selection */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card sx={{ mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlaceIcon sx={{ color: '#D32F2F' }} /> Select Your Location
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Select
                value={selectedLocation}
                onChange={(e) => { setSelectedLocation(e.target.value); setSearchLoc(null); }}
                size="small"
                sx={{ 
                  minWidth: { xs: '100%', sm: 220 }, 
                  borderRadius: 2, 
                  bgcolor: '#f5f7fa',
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#D32F2F' },
                    '&.Mui-focused fieldset': { borderColor: '#D32F2F', borderWidth: 2 }
                  }
                }}
              >
                {INDIAN_LOCATIONS.map((loc) => (
                  <MenuItem key={loc.value} value={loc.value}>{loc.label}</MenuItem>
                ))}
              </Select>
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search city or place..."
                size="small"
                sx={{ 
                  flex: 1,
                  minWidth: { xs: '100%', sm: 200 },
                  borderRadius: 2,
                  bgcolor: '#f5f7fa',
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#D32F2F' },
                    '&.Mui-focused fieldset': { borderColor: '#D32F2F', borderWidth: 2 }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} edge="end" sx={{ color: '#D32F2F' }}>
                        <SearchIcon />
                      </IconButton>
                      {searchLoc && (
                        <IconButton onClick={handleResetSearch} edge="end" sx={{ color: '#999' }}>
                          ✕
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            {searchLoc && (
              <Typography variant="caption" sx={{ mt: 2, display: 'block', color: '#D32F2F', fontWeight: 600 }}>
                📍 Showing results for "{searchLoc.label}"
              </Typography>
            )}
          </Box>
        </Card>
      </motion.div>

      {/* Tabs Section */}
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, val) => setTabValue(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: '2px solid #f0f0f0',
            bgcolor: '#f8f9fa',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              textTransform: 'none',
              minWidth: { xs: 128, sm: 150 },
              color: '#666',
              '&.Mui-selected': { color: '#D32F2F' }
            },
            '& .MuiTabs-indicator': { backgroundColor: '#D32F2F', height: 3 }
          }}
        >
          <Tab label="🚨 Emergency Contacts" />
          <Tab label="🏥 Nearby Hospitals" />
          <Tab label="📋 Safety Protocols" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Tab 1: Emergency Contacts */}
          {tabValue === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Grid container spacing={3}>
                {emergencyServices.map((service) => (
                  <Grid item xs={12} sm={6} md={4} key={service.label}>
                    <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        sx={{
                          height: '100%',
                          background: `linear-gradient(135deg, ${service.color}15 0%, ${service.color}05 100%)`,
                          border: `2px solid ${service.color}30`,
                          borderRadius: 3,
                          p: 3,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: `0 12px 30px ${service.color}40`,
                            borderColor: service.color,
                            transform: 'translateY(-8px)'
                          }
                        }}
                      >
                        <Avatar 
                          sx={{ 
                            bgcolor: service.color, 
                            width: 64, 
                            height: 64, 
                            mx: 'auto', 
                            mb: 2,
                            boxShadow: `0 4px 15px ${service.color}40`
                          }}
                        >
                          {getIconComponent(service.icon)}
                        </Avatar>
                        <Typography variant="h6" fontWeight={800} sx={{ color: service.color, mb: 0.5 }}>
                          {service.label}
                        </Typography>
                        <Typography variant="h4" fontWeight={900} sx={{ color: service.color, mb: 1, fontSize: '2.2rem' }}>
                          {service.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 500 }}>
                          {service.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: '0.8rem' }}>
                          {service.details}
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleCall(service.number)}
                          sx={{
                            bgcolor: service.color,
                            color: '#fff',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2,
                            width: '100%',
                            '&:hover': { bgcolor: service.color, opacity: 0.9 }
                          }}
                          startIcon={<CallIcon />}
                        >
                          Call Now
                        </Button>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          )}

          {/* Tab 2: Nearby Hospitals */}
          {tabValue === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                  <CircularProgress size={50} sx={{ color: '#D32F2F' }} />
                </Box>
              ) : hospitals.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 6, fontWeight: 500 }}>
                  No hospitals found for this location. Try searching for another area or adjusting filters.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {hospitals.map((hospital, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                      <Card
                        sx={{
                          p: { xs: 2, sm: 3 },
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          borderLeft: '5px solid #388E3C',
                          '&:hover': { boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
                          transition: 'all 0.3s'
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2} sx={{ flex: 1, width: '100%' }}>
                          <Avatar sx={{ bgcolor: '#388E3C', width: 50, height: 50 }}>
                            <LocalHospitalIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1a1a1a' }}>
                              {hospital.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                              📍 {hospital.address}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={hospital.distance}
                          sx={{ 
                            bgcolor: '#E8F5E9', 
                            color: '#388E3C', 
                            fontWeight: 800, 
                            fontSize: '0.9rem',
                            px: 2,
                            mt: { xs: 1.5, sm: 0 },
                            alignSelf: { xs: 'flex-start', sm: 'center' },
                          }}
                        />
                      </Card>
                    </motion.div>
                  ))}
                </Stack>
              )}
            </motion.div>
          )}

          {/* Tab 3: Safety Protocols */}
          {tabValue === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Grid container spacing={3}>
                {EMERGENCY_PROTOCOLS.map((protocol, idx) => (
                  <Grid item xs={12} sm={6} md={3} key={idx}>
                    <motion.div whileHover={{ y: -5 }}>
                      <Card
                        onClick={() => { setSelectedProtocol(protocol); setOpenProtocolDialog(true); }}
                        sx={{
                          height: '100%',
                          cursor: 'pointer',
                          bgcolor: '#f8f9fa',
                          border: '2px solid #e0e0e0',
                          borderRadius: 3,
                          p: 3,
                          textAlign: 'center',
                          transition: 'all 0.3s',
                          '&:hover': {
                            borderColor: '#D32F2F',
                            boxShadow: '0 8px 24px rgba(211,47,47,0.15)',
                            transform: 'translateY(-8px)'
                          }
                        }}
                      >
                        <Typography sx={{ fontSize: '3rem', mb: 1 }}>
                          {protocol.icon}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#D32F2F', mb: 1.5 }}>
                          {protocol.title}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{
                            color: '#D32F2F',
                            borderColor: '#D32F2F',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2,
                            '&:hover': { bgcolor: '#ffebee', borderColor: '#D32F2F' }
                          }}
                        >
                          View Steps →
                        </Button>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          )}
        </Box>
      </Box>

      {/* Protocol Dialog */}
      <Dialog open={openProtocolDialog} onClose={() => setOpenProtocolDialog(false)} maxWidth="sm" fullWidth>
        {selectedProtocol && (
          <>
            <DialogTitle sx={{ bgcolor: '#f8f9fa', fontWeight: 800, fontSize: '1.4rem', color: '#D32F2F' }}>
              {selectedProtocol.icon} {selectedProtocol.title}
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {selectedProtocol.steps.map((step, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: '#D32F2F', width: 32, height: 32, fontWeight: 800, color: '#fff' }}>
                      {idx + 1}
                    </Avatar>
                    <Box sx={{ pt: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#1a1a1a' }}>
                        {step}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Button onClick={() => setOpenProtocolDialog(false)} variant="contained" sx={{ bgcolor: '#D32F2F', color: '#fff', fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default EmergencySupportPanel;
