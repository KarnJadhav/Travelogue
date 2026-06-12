// TravelTipsPanel.jsx - Colorful travel tips cards UI
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SecurityIcon from '@mui/icons-material/Security';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PaymentsIcon from '@mui/icons-material/Payments';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PublicIcon from '@mui/icons-material/Public';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const tips = [
  {
    title: 'Best Time to Visit',
    icon: <LightbulbIcon sx={{ fontSize: 30, color: '#4F8A8B' }} />,
    color: '#E3F0FF',
    desc: 'Research the climate and peak seasons of your destination. Shoulder seasons (spring and fall) often offer better prices and fewer crowds while maintaining pleasant weather.',
  },
  {
    title: 'Safety First',
    icon: <SecurityIcon sx={{ fontSize: 30, color: '#FF6F61' }} />,
    color: '#FFE6E6',
    desc: 'Always register with your embassy, keep copies of important documents, avoid displaying expensive items, and stay aware of your surroundings. Use hotel safes for valuables.',
  },
  {
    title: 'Transport Options',
    icon: <DirectionsBusIcon sx={{ fontSize: 30, color: '#22C55E' }} />,
    color: '#E6F7EC',
    desc: 'Use public transportation to save money and experience local life. Book intercity travel in advance for better rates. Consider ride-sharing apps for convenient city travel.',
  },
  {
    title: 'Money Matters',
    icon: <PaymentsIcon sx={{ fontSize: 30, color: '#FFD600' }} />,
    color: '#FFF9E3',
    desc: 'Notify your bank before traveling, carry multiple payment methods, keep emergency cash, and be aware of local currency exchange rates. Use ATMs in secure locations.',
  },
  {
    title: 'Capture Memories',
    icon: <CameraAltIcon sx={{ fontSize: 30, color: '#A259F7' }} />,
    color: '#F3E8FF',
    desc: 'Take photos but also live in the moment. Back up photos regularly, respect photography restrictions at religious sites, and always ask permission before photographing locals.',
  },
  {
    title: 'Cultural Respect',
    icon: <PublicIcon sx={{ fontSize: 30, color: '#F94F8E' }} />,
    color: '#FFE6F2',
    desc: 'Learn basic phrases in the local language, research customs and etiquette, dress appropriately for religious sites, and be mindful of local traditions and practices.',
  },
  {
    title: 'Health & Wellness',
    icon: <HealthAndSafetyIcon sx={{ fontSize: 30, color: '#FF9800' }} />,
    color: '#FFF3E0',
    desc: 'Get necessary vaccinations, carry a basic first-aid kit, stay hydrated, eat at clean establishments, and have travel insurance. Keep emergency contacts handy.',
  },
  {
    title: 'Smart Packing',
    icon: <Inventory2Icon sx={{ fontSize: 30, color: '#14C8C8' }} />,
    color: '#E0F7FA',
    desc: 'Pack light and versatile clothing, bring essential medications, carry a portable charger, and always have a day bag for excursions. Check airline baggage policies.',
  },
];

export default function TravelTipsPanel() {
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h3" fontWeight={700} mb={1}>
        Travel Tips
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" mb={4}>
        Essential advice for a smooth and memorable journey
      </Typography>
      <Grid container spacing={3}>
        {tips.map((tip, idx) => (
          <Grid item xs={12} md={6} key={tip.title}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2.5,
                overflow: 'hidden',
                mb: 2,
                bgcolor: tip.color,
                p: 0,
                border: '1.5px solid #f0f0f0',
                boxShadow: '0 2px 12px 0 rgba(79,138,139,0.07)',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5, pb: 1.5 }}>
                {tip.icon}
                <Typography variant="h6" fontWeight={700} color="text.primary" ml={2}>
                  {tip.title}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5, fontSize: 17, color: 'text.secondary', fontWeight: 500 }}>
                {tip.desc}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
