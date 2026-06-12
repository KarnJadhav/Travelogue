// Top AppBar with logo, search, notifications, and user avatar menu
import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Tooltip from '@mui/material/Tooltip';
import { alpha, styled } from '@mui/material/styles';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationPanel from './NotificationPanel';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 999,
  backgroundColor: alpha(
    theme.palette.background.paper,
    theme.palette.mode === 'dark' ? 0.35 : 0.75
  ),
  '&:hover': {
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === 'dark' ? 0.45 : 0.9
    ),
  },
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 20px rgba(15, 23, 42, 0.4)'
    : '0 8px 20px rgba(15, 23, 42, 0.08)',
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(2),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: theme.palette.text.primary,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '32ch',
    },
  },
}));

export default function AppBarTop({
  user,
  onActionComplete,
  isDarkMode = false,
  onThemeToggle = () => {},
  chatNotifications = {},
  onChatClick = () => {},
  isMobile = false,
  sidebarHidden = false,
  mobileSidebarOpen = false,
  sidebarCompact = false,
  onSidebarToggle = () => {},
  onSidebarVisibilityToggle = () => {}
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Profile' } }));
    handleClose();
  };

  const handleSettingsClick = () => {
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Settings' } }));
    handleClose();
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const sidebarToggleTitle = isMobile
    ? mobileSidebarOpen
      ? 'Close menu'
      : 'Open menu'
    : sidebarHidden
      ? 'Show sidebar'
      : 'Hide sidebar';

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={(theme) => ({
        zIndex: 1201,
        backdropFilter: 'blur(18px)',
        backgroundColor: alpha(
          theme.palette.background.paper,
          theme.palette.mode === 'dark' ? 0.9 : 0.82
        ),
        borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      })}
    >
      <Toolbar sx={{ gap: { xs: 0.5, sm: 1.5 }, px: { xs: 1, sm: 2 }, minHeight: { xs: 64, sm: 72 } }}>
        <TravelExploreIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main', mr: { xs: 0, sm: 0.5 } }} />
        <Typography
          variant="h6"
          noWrap
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            letterSpacing: '-0.4px',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Travelogue
        </Typography>

        <Tooltip title={sidebarToggleTitle}>
          <IconButton onClick={onSidebarVisibilityToggle} sx={{ ml: { xs: 0, sm: 0.5 } }}>
            {isMobile ? (
              mobileSidebarOpen ? <MenuOpenIcon /> : <MenuIcon />
            ) : sidebarHidden ? (
              <ViewSidebarOutlinedIcon />
            ) : (
              <ViewSidebarIcon />
            )}
          </IconButton>
        </Tooltip>

        {!isMobile && !sidebarHidden && (
          <Tooltip title={sidebarCompact ? 'Expand sidebar' : 'Compact sidebar'}>
            <IconButton onClick={onSidebarToggle}>
              {sidebarCompact ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ display: { xs: 'none', md: 'block' }, flex: 1, minWidth: 0 }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search destinations, guides, travelogues..."
              inputProps={{ 'aria-label': 'search' }}
            />
          </Search>
        </Box>

        <div style={{ flexGrow: 1 }} />

        <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
          <IconButton
            onClick={onThemeToggle}
            sx={{ mr: { xs: 0.25, sm: 1 } }}
          >
            {isDarkMode ? (
              <Brightness7Icon sx={{ color: '#FDB813' }} />
            ) : (
              <Brightness4Icon sx={{ color: '#667eea' }} />
            )}
          </IconButton>
        </Tooltip>

        <NotificationPanel
          onActionComplete={onActionComplete}
          chatNotifications={chatNotifications}
          onChatClick={onChatClick}
        />

        <IconButton onClick={handleMenu} sx={{ ml: { xs: 0.5, sm: 1.5 } }}>
          <Avatar alt={user?.name || 'User'} src={user?.avatar} />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2,
              mt: 1,
            }
          }}
        >
          <MenuItem disabled sx={{ color: '#666', fontWeight: 600, pb: 1 }}>
            {user?.name || 'User'}
          </MenuItem>
          <MenuItem sx={{ borderTop: '1px solid #eee' }}>
            <Box sx={{ pt: 1 }} />
          </MenuItem>
          <MenuItem onClick={handleProfileClick} sx={{ fontWeight: 500 }}>
            My Profile
          </MenuItem>
          <MenuItem onClick={handleSettingsClick} sx={{ fontWeight: 500 }}>
            Settings
          </MenuItem>
          <MenuItem sx={{ borderTop: '1px solid #eee', mt: 1 }}>
            <Box sx={{ pt: 1 }} />
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: '#d32f2f', fontWeight: 500 }}>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
