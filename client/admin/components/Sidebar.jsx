import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  alpha,
  useTheme,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Overview', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Reviews', path: '/admin/reviews', icon: <RateReviewIcon /> },
  { label: 'Travelogues', path: '/admin/travelogues', icon: <BookIcon /> },
  { label: 'Reports', path: '/admin/reports', icon: <AssessmentIcon /> },
];

const drawerWidth = 248;

function SidebarContent({ theme, onClose }) {
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ minHeight: 72 }} />

      <Box sx={{ px: 2, pb: 2 }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#2563eb',
                color: '#fff',
              }}
            >
              <TravelExploreIcon fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.2px' }}>
                Travelogue
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>
                Admin Console
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Box>

      <Divider sx={{ borderColor: alpha('#94a3b8', 0.2), mb: 1 }} />

      <List sx={{ px: 1.5, flex: 1 }}>
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
          >
            <NavLink
              to={item.path}
              end={item.path === '/admin'}
              style={{ textDecoration: 'none', color: 'inherit' }}
              onClick={handleNavClick}
            >
              {({ isActive }) => (
                <ListItem disablePadding>
                  <ListItemButton
                    selected={isActive}
                    sx={{
                      borderRadius: '12px',
                      mb: 0.75,
                      px: 1.25,
                      minHeight: 44,
                      transition: 'all 0.2s ease',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(30,64,175,0.15))'
                        : 'transparent',
                      border: isActive ? `1px solid ${alpha('#60a5fa', 0.35)}` : '1px solid transparent',
                      color: isActive ? '#dbeafe' : '#cbd5e1',
                      '&:hover': {
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(30,64,175,0.2))'
                          : alpha('#93c5fd', 0.08),
                      },
                      '& .MuiListItemIcon-root': {
                        color: isActive ? '#93c5fd' : '#94a3b8',
                        minWidth: 34,
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </NavLink>
          </motion.div>
        ))}
      </List>
    </Box>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const theme = useTheme();

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: '#0b1220',
            borderRight: '1px solid #1f2937',
          },
        }}
      >
        <SidebarContent theme={theme} onClose={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
            color: '#cbd5e1',
            borderRight: '1px solid #1f2937',
          },
        }}
      >
        <SidebarContent theme={theme} />
      </Drawer>
    </>
  );
}
