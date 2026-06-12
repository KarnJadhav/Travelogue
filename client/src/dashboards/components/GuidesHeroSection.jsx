import React from 'react';
import { Box, Typography, Button, Stack, Container } from '@mui/material';
import { motion } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';

export default function GuidesHeroSection({ onSearchClick }) {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        py: { xs: 3, md: 5 },
        mb: 3,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Animated background circles */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(20px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 250,
          height: 250,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={2} alignItems="flex-start">
          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%' }}
          >
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                lineHeight: 1.2,
              }}
            >
              Meet Your Local Guide
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                opacity: 0.95,
                mt: 1,
                maxWidth: '500px',
                lineHeight: 1.5,
              }}
            >
              Get insider tips, explore like a local, and create unforgettable memories with expert guides
            </Typography>
          </motion.div>

          {/* Quick Stats */}
          <Stack direction="row" spacing={{ xs: 2, md: 3 }} sx={{ mt: 2, width: '100%', flexWrap: 'wrap' }}>
            {[
              { icon: '✓', label: '500+ Verified Guides' },
              { icon: '⭐', label: '4.8★ Average Rating' },
              { icon: '👥', label: '10K+ Happy Tourists' },
            ].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>{item.icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
