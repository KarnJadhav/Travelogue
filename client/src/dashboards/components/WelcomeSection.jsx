// Welcome section with premium dashboard hero layout
import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { motion } from 'framer-motion';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';

const quotes = [
  "Travel is the only thing you buy that makes you richer.",
  "The world is a book, and those who do not travel read only one page.",
  "Adventure awaits. Go find it!",
  "Collect moments, not things.",
  "To travel is to live.",
  "We travel not to escape life, but for life not to escape us.",
];

export default function WelcomeSection({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const quote = React.useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);
  const firstName = user?.name?.split(' ')[0] || 'Traveler';

  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to explore tab and prefill/search
      window.dispatchEvent(
        new CustomEvent('navigateTab', { 
          detail: { tab: 'Explore Destinations', search: searchQuery } 
        })
      );
    } else {
      window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Explore Destinations' } }));
    }
  };

  const handleStartExploring = () => {
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Explore Destinations' } }));
  };

  const handleViewTrips = () => {
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'My Bookings' } }));
  };

  return (
    <Box sx={{ mb: 5, mt: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.25 }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0b1f2a 0%, #0d2f3b 35%, #133a47 70%, #1e293b 100%)',
            borderRadius: '28px',
            p: { xs: 3, md: 5 },
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(12, 38, 51, 0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: 380,
              height: 380,
              background: 'radial-gradient(circle, rgba(79, 138, 139, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            },
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -100,
              left: -60,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              pointerEvents: 'none',
            }
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} sx={{ position: 'relative', zIndex: 2 }} alignItems="stretch">
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={1.5}>
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(79, 138, 139, 0.4) 0%, rgba(107, 168, 172, 0.2) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TravelExploreIcon sx={{ color: '#F9ED69', fontSize: 26 }} />
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ 
                    color: '#ffffff', 
                    letterSpacing: '-0.6px',
                    fontFamily: '"Sora", sans-serif',
                    fontSize: { xs: '1.8rem', md: '2.4rem' }
                  }}
                >
                  {getGreeting()}, {firstName}
                </Typography>
              </Stack>

              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(248, 250, 252, 0.85)',
                  fontWeight: 500,
                  mb: 3,
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  maxWidth: 620,
                  fontStyle: 'italic',
                  borderLeft: '3px solid #4F8A8B',
                  pl: 2
                }}
              >
                "{quote}"
              </Typography>

              {/* Dynamic Destination Search Console */}
              <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 3.5, maxWidth: 500 }}>
                <TextField
                  fullWidth
                  placeholder="Where is your next adventure?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.6)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button 
                          type="submit"
                          variant="contained" 
                          size="small"
                          sx={{ 
                            borderRadius: '8px', 
                            bgcolor: '#4F8A8B', 
                            color: '#fff', 
                            px: 2.5,
                            py: 0.8,
                            fontWeight: 700,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#6BA8AC' }
                          }}
                        >
                          Search
                        </Button>
                      </InputAdornment>
                    ),
                    sx: {
                      color: '#fff',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(8px)',
                      pr: '6px',
                      pl: 1.5,
                      height: '54px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.12)',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                      },
                      '&.Mui-focused': {
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        borderColor: '#4F8A8B',
                        boxShadow: '0 0 0 4px rgba(79, 138, 139, 0.25)',
                      },
                      '& input::placeholder': {
                        color: 'rgba(255,255,255,0.5)',
                        opacity: 1
                      }
                    }
                  }}
                  variant="outlined"
                  sx={{
                    '& fieldset': { border: 'none' }
                  }}
                />
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={4.5}>
                {['Direct Bookings', 'Live Tour Guides', 'Story Timelines', 'AI Itineraries'].map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.06)',
                      color: 'rgba(248,250,252,0.9)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontWeight: 600,
                      px: 0.8,
                      py: 1.5,
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        borderColor: '#4F8A8B'
                      }
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={2.5} flexWrap="wrap">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="contained"
                    onClick={handleStartExploring}
                    sx={{
                      background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderRadius: '14px',
                      px: 3.5,
                      py: 1.4,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      boxShadow: '0 10px 25px rgba(79, 138, 139, 0.35)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5ea1a2 0%, #7cbfc3 100%)',
                        boxShadow: '0 12px 30px rgba(79, 138, 139, 0.45)',
                      }
                    }}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                  >
                    Start Exploring
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outlined"
                    onClick={handleViewTrips}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderRadius: '14px',
                      px: 3.5,
                      py: 1.4,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: '#ffffff',
                        background: 'rgba(255,255,255,0.08)',
                      }
                    }}
                  >
                    View My Trips
                  </Button>
                </motion.div>
              </Stack>
            </Box>

            <Box
              sx={{
                flex: { xs: '1 1 auto', lg: '0 0 320px' },
                bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: '24px',
                p: 3,
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ color: '#F9ED69', fontWeight: 800, letterSpacing: '1px' }}>
                  Trip Readiness
                </Typography>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 800, mb: 2, fontFamily: '"Sora", sans-serif' }}>
                  Your Gateway Ready
                </Typography>
              </Box>
              
              <Stack spacing={1.5}>
                {[
                  { title: 'Local Guides Online', desc: 'Chat and book verified experts', icon: '👤' },
                  { title: 'Verified Hotels', desc: 'Secure the finest premium stays', icon: '🏨' },
                  { title: 'Travelogue Memories', desc: 'Ready to share your journeys', icon: '📸' },
                ].map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: 'rgba(15, 23, 42, 0.35)',
                      borderRadius: '16px',
                      p: 2,
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: 'rgba(15, 23, 42, 0.5)',
                        borderColor: 'rgba(79, 138, 139, 0.3)',
                        transform: 'translateX(4px)'
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '1.4rem' }}>{item.icon}</Typography>
                    <Box>
                      <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ color: 'rgba(248,250,252,0.6)', fontSize: '0.75rem', mt: 0.2 }}>
                        {item.desc}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </motion.div>
    </Box>
  );
}
