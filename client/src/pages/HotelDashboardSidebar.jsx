import React from "react";
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Avatar, Box, Typography, Badge } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import HotelIcon from "@mui/icons-material/Hotel";
import ChatIcon from "@mui/icons-material/Chat";
import StarIcon from "@mui/icons-material/Star";

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "dashboard" },
  { text: "Hotel Profile", icon: <AccountBoxIcon />, path: "profile" },
  { text: "Rooms", icon: <HotelIcon />, path: "rooms" },
  { text: "Bookings", icon: <DashboardIcon />, path: "bookings" },
  { text: "Chat", icon: <ChatIcon />, path: "chat", badge: 3 },
  { text: "Reviews", icon: <StarIcon />, path: "reviews" },
  { text: "Notifications", icon: <DashboardIcon />, path: "notifications" },
  { text: "Analytics", icon: <DashboardIcon />, path: "analytics" },
  { text: "Settings", icon: <AccountBoxIcon />, path: "settings" },
];


export default function HotelDashboardSidebar({ selected, onSelect }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: 280,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #faf6ee 0%, #f2ede2 100%)',
          color: 'var(--dash-ink)',
          fontFamily: '"Space Grotesk", sans-serif',
          borderRight: '1px solid var(--dash-border)',
          boxShadow: '8px 0 24px rgba(17, 24, 39, 0.06)',
          zIndex: 1201,
        },
        display: { xs: 'none', sm: 'block' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid var(--dash-border)' }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              color: 'var(--dash-ink)',
              fontFamily: '"Fraunces", serif',
              letterSpacing: 0.6,
              fontSize: 28,
            }}
          >
            Travelogue
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'var(--dash-muted)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Hotel Dashboard
          </Typography>
        </Box>
        <List sx={{ px: 2, pt: 2 }}>
          {menuItems.map((item, idx) => (
            <ListItem
              key={item.text}
              component="li"
              onClick={() => onSelect(item.path)}
              selected={selected === item.path}
              sx={{
                position: 'relative',
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                px: 2,
                py: 1,
                fontFamily: '"Space Grotesk", sans-serif',
                color: 'var(--dash-ink)',
                transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  background: selected === item.path ? 'var(--dash-accent)' : 'transparent',
                  transition: 'background 0.2s ease',
                },
                ...(selected === item.path && {
                  background: 'rgba(43, 138, 126, 0.14)',
                  color: 'var(--dash-ink)',
                  boxShadow: '0 8px 20px rgba(43, 138, 126, 0.18)',
                  fontWeight: 700,
                }),
                '&:hover': {
                  background: 'rgba(43, 138, 126, 0.10)',
                },
              }}
            >
              <ListItemIcon sx={{ color: selected === item.path ? 'var(--dash-accent)' : 'var(--dash-muted)', minWidth: 36 }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">{item.icon}</Badge>
                ) : item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: selected === item.path ? 700 : 600 }} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(43, 138, 126, 0.10)',
            borderRadius: 2,
            m: 2,
            border: '1px solid var(--dash-border)',
          }}
        >
          <Avatar sx={{ bgcolor: 'var(--dash-accent)', color: '#fff', mr: 2, fontWeight: 700, fontSize: 20 }}>A</Avatar>
          <Box>
            <Typography fontWeight={700} sx={{ color: 'var(--dash-ink)', fontFamily: '"Space Grotesk", sans-serif', fontSize: 16 }}>Admin</Typography>
            <Typography variant="caption" sx={{ color: 'var(--dash-muted)', fontSize: 13 }}>Hotel Manager</Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
