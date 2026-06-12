import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  alpha,
  Avatar,
  Menu,
  MenuItem,
  InputBase,
  Chip,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationBell from './NotificationBell';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme } from '../theme';

export default function Topbar({ onMenuClick = () => {} }) {
  const { mode, toggle } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <AppBar
      position="sticky"
      top={0}
      elevation={0}
      sx={{
        background: alpha('#f8fafc', 0.8),
        borderBottom: '1px solid #e5e7eb',
        backdropFilter: 'blur(10px)',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: { xs: 1.5, sm: 2.5 }, gap: 1.5 }}>
        <IconButton
          size="small"
          onClick={onMenuClick}
          sx={{ display: { xs: 'inline-flex', lg: 'none' }, '&:hover': { bgcolor: alpha('#2563eb', 0.08) } }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1rem' }, color: '#0f172a', lineHeight: 1.15 }}>
            Admin Dashboard
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.2 }}>
            Premium operations workspace
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            width: 'min(360px, 34vw)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            px: 1.25,
            py: 0.65,
            bgcolor: '#ffffff',
          }}
        >
          <SearchIcon sx={{ fontSize: '1rem', color: '#64748b' }} />
          <InputBase placeholder="Search users, reviews, travelogues..." sx={{ fontSize: '0.84rem', width: '100%' }} />
          <Chip label="/" size="small" sx={{ height: 20, fontSize: '0.66rem', borderRadius: '6px', bgcolor: '#f1f5f9' }} />
        </Box>

        <NotificationBell />

        <IconButton onClick={toggle} size="small" sx={{ '&:hover': { bgcolor: alpha('#2563eb', 0.08) } }}>
          {mode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
        </IconButton>

        <IconButton size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, '&:hover': { bgcolor: alpha('#2563eb', 0.08) } }}>
          <SettingsIcon fontSize="small" />
        </IconButton>

        <Box
          onClick={handleProfileMenu}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            p: 0.5,
            borderRadius: '12px',
            minWidth: 0,
            '&:hover': { bgcolor: alpha('#2563eb', 0.08) },
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.82rem', fontWeight: 700 }}>
            {user?.name?.charAt(0) || 'A'}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
              {user?.name?.split(' ')[0] || 'Admin'}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>Administrator</Typography>
          </Box>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
          <MenuItem disabled>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.email || 'admin@example.com'}
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1, fontSize: '1rem' }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
