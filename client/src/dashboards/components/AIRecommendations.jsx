// AIRecommendations.jsx
// AI Recommended destinations card for dashboard with real tour data from API
import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import StarIcon from '@mui/icons-material/Star';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { motion } from 'framer-motion';
import api from '../../api';

const getCategoryTag = (destination) => {
  const dest = destination?.toLowerCase() || '';
  if (dest.includes('beach') || dest.includes('maldives') || dest.includes('goa')) return 'Beach';
  if (dest.includes('mountain') || dest.includes('iceland') || dest.includes('alps')) return 'Adventure';
  if (dest.includes('rome') || dest.includes('paris') || dest.includes('italy')) return 'Culture';
  if (dest.includes('city') || dest.includes('york') || dest.includes('dubai')) return 'Urban';
  return 'Explore';
};

const getDestinationColor = (tag) => {
  const colors = {
    Beach: '#e0f2fe',
    Adventure: '#dcfce7',
    Culture: '#fef3c7',
    Urban: '#e2e8f0',
    Explore: '#ffedd5',
  };
  return colors[tag] || '#f5f5f5';
};

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // Backend doesn't expose /tours. Use destination APIs to build recommendations.
      const destinationsRes = await api
        .get('/destination/destinations')
        .catch(() => ({ data: [] }));
      let tours = Array.isArray(destinationsRes.data) ? destinationsRes.data : [];

      if (tours.length === 0) {
        const popularRes = await api.get('/opentripmap/popular').catch(() => ({ data: [] }));
        tours = Array.isArray(popularRes.data) ? popularRes.data : [];
      }

      // Filter and sort by rating
      const topTours = tours
        .filter(t => t && t.title && t.destination)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      // Get booking counts and guide info for these tours
      const enrichedTours = await Promise.all(
        topTours.map(async (tour) => {
          try {
            const bookingsRes = tour.guideId
              ? await api.get(`/booking/guide/${tour.guideId}`).catch(() => ({ data: [] }))
              : { data: [] };
            const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
            const completedCount = bookings.filter(b => b.status === 'completed').length;

            return {
              ...tour,
              title: tour.destination || tour.name || tour.title,
              desc: tour.description || `Guided tour by an experienced local guide`,
              tag: getCategoryTag(tour.destination || tour.name || ''),
              price: `₹${tour.price || 0}`,
              rating: tour.rating || 4.5,
              image: tour.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
              bookings: completedCount,
            };
          } catch (err) {
            return {
              ...tour,
              title: tour.destination || tour.name || tour.title,
              desc: tour.description || `Explore this amazing destination`,
              tag: getCategoryTag(tour.destination || tour.name || ''),
              price: `₹${tour.price || 0}`,
              rating: tour.rating || 4.5,
              image: tour.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
              bookings: 0,
            };
          }
        })
      );

      setRecommendations(enrichedTours);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <Card sx={{ 
        borderRadius: '24px', 
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
        mb: 4,
        border: '1px solid rgba(148,163,184,0.2)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        overflow: 'hidden',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={4}>
            <Box sx={{ 
              p: 2, 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: '0 10px 24px rgba(245, 158, 11, 0.35)',
            }}>
              <StarIcon sx={{ color: '#fff', fontSize: 28, fontWeight: 800 }} />
            </Box>
            <Box flex={1}>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.4px' }}>
                Curated tours for you
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Premium guides and authentic experiences, picked by ratings.
              </Typography>
            </Box>
            <Button 
              size="small" 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 700,
                color: '#0f766e',
                '&:hover': {
                  backgroundColor: 'rgba(15, 118, 110, 0.08)',
                }
              }} 
              endIcon={<span style={{ fontSize: 18, marginLeft: 4 }}>&rarr;</span>}
            >
              Explore All
            </Button>
          </Box>

          {recommendations.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 6,
              background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)',
              borderRadius: '18px',
              border: '2px dashed #cbd5e1',
            }}>
              <TravelExploreIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 2 }} />
              <Typography color="text.secondary" fontWeight={600} sx={{ fontSize: '1rem' }}>
                No tours available yet
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Check back soon for amazing experiences
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {recommendations.map((rec, idx) => (
                <Grid size={{ xs: 12, sm: 4 }} key={rec._id || idx}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    style={{ height: '100%' }}
                  >
                    <Card sx={{ 
                      borderRadius: '18px', 
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                      height: '100%',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      border: '1px solid rgba(148,163,184,0.2)',
                      overflow: 'hidden',
                      '&:hover': {
                        boxShadow: '0 22px 50px rgba(15, 23, 42, 0.18)',
                        transform: 'translateY(-12px)',
                        '& .tour-image': {
                          transform: 'scale(1.08)',
                        },
                        '& .tour-overlay': {
                          opacity: 1,
                        },
                        '& .rating-chip': {
                          transform: 'scale(1.1)',
                        }
                      }
                    }}>
                      <Box sx={{ position: 'relative', overflow: 'hidden', height: 160 }}>
                        <Box
                          component="img"
                          src={rec.image}
                          alt={rec.title}
                          className="tour-image"
                          sx={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <Box
                          className="tour-overlay"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.4s ease',
                          }}
                        />
                        <Chip 
                          icon={<StarIcon sx={{ color: '#ffb300', fontSize: 16 }} />} 
                          label={rec.rating?.toFixed(1) || '4.5'} 
                          className="rating-chip"
                          sx={{ 
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: 'rgba(255, 255, 255, 0.96)',
                            backdropFilter: 'blur(10px)',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.5)',
                            transition: 'transform 0.3s ease',
                            '& .MuiChip-label': {
                              fontSize: '0.85rem',
                            }
                          }} 
                        />
                      </Box>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ 
                          lineHeight: 1.3,
                          mb: 0.5,
                          letterSpacing: '-0.3px',
                        }}>
                          {rec.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          display: 'block', 
                          mb: 1.5,
                          fontWeight: 500,
                        }}>
                          {rec.desc}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" justifyContent="space-between">
                          <Chip 
                            label={rec.tag} 
                            size="small" 
                            sx={{ 
                              bgcolor: getDestinationColor(rec.tag),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              border: `1px solid ${getDestinationColor(rec.tag)}`,
                            }} 
                          />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f766e' }}>
                            {rec.price}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
