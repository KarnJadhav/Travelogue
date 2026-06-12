// Collapsible Sidebar Navigation for Tourist Dashboard
// Layout logic: Uses MUI Drawer for a permanent sidebar. Navigation items are mapped with icons and labels. Collapsible with a toggle button. Responsive width for mobile/desktop.
import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import HotelIcon from '@mui/icons-material/Hotel';
import PeopleAltIcon from '@mui/icons-material/Groups';
import BookingsIcon from '@mui/icons-material/EventAvailable';
import ChatIcon from '@mui/icons-material/Chat';
import ReviewsIcon from '@mui/icons-material/Reviews';
import TipsIcon from '@mui/icons-material/TipsAndUpdates';
import EmergencyIcon from '@mui/icons-material/ReportProblem';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { alpha, styled } from '@mui/material/styles';

const drawerWidth = 252;
const collapsedWidth = 72;

// Icons for each tab
const iconMap = {
  Dashboard: <DashboardIcon sx={{ color: 'primary.main' }} />,
  'Explore Destinations': <ExploreIcon sx={{ color: 'primary.main' }} />,
  'Explore Tours': <ExploreIcon sx={{ color: 'primary.main' }} />,
  'Explore Guides': <PeopleAltIcon sx={{ color: 'primary.main' }} />,
  'Virtual Guide': <SupportAgentIcon sx={{ color: 'primary.main' }} />,
  'Itinerary Planner': <EventNoteIcon sx={{ color: 'primary.main' }} />,
  'Hotel Booking': <HotelIcon sx={{ color: 'primary.main' }} />,
  'My Bookings': <BookingsIcon sx={{ color: 'primary.main' }} />,
  Chat: <ChatIcon sx={{ color: 'primary.main' }} />,
  Reviews: <ReviewsIcon sx={{ color: 'primary.main' }} />,
  'Travel Tips': <TipsIcon sx={{ color: 'primary.main' }} />,
  'Story Sharing': <MenuBookIcon sx={{ color: 'primary.main' }} />,
  Travelogue: <MenuBookIcon sx={{ color: 'primary.main' }} />,
  Emergency: <EmergencyIcon sx={{ color: 'error.main' }} />,
};

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.88))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
    boxShadow: theme.shadows[2],
    transition: theme.transitions.create(['width', 'box-shadow'], {
      duration: theme.transitions.duration.shortest,
    }),
  },
}));

export default function SidebarNav({
  open,
  hidden = false,
  mobileOpen = false,
  onRequestClose = () => {},
  onToggle,
  onHide = () => {},
  navItems = [],
  selectedTab,
  onSelect,
  chatUnreadCount = 0
}) {
  const isMobile = useMediaQuery('(max-width:900px)');

  if (!isMobile && hidden) {
    return null;
  }

  const desktopWidth = open ? drawerWidth : collapsedWidth;
  const mobileDrawerWidth = 'min(84vw, 320px)';
  const navLabelVisible = isMobile || open;

  const handleSelect = (value) => {
    if (onSelect) onSelect(value);
    if (isMobile) onRequestClose();
  };

  const handleVisibilityToggle = () => {
    if (isMobile) {
      onRequestClose();
      return;
    }
    onHide();
  };

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={isMobile ? onRequestClose : undefined}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? 0 : desktopWidth,
        flexShrink: isMobile ? 1 : 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? mobileDrawerWidth : desktopWidth,
          maxWidth: '100%',
          overflowX: 'hidden',
          bgcolor: 'background.paper',
          borderTopRightRadius: isMobile ? 22 : 0,
          borderBottomRightRadius: isMobile ? 22 : 0,
          pt: isMobile ? 1 : 0,
        },
      }}
    >
      <List sx={{ pt: isMobile ? 0 : 2 }}>
        {isMobile && (
          <ListItem
            disablePadding
            sx={{
              px: 2,
              py: 1,
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Travelogue Menu
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Navigate your dashboard
              </Typography>
            </Box>
            <IconButton onClick={onRequestClose} size="large" aria-label="close menu">
              <CloseRoundedIcon />
            </IconButton>
          </ListItem>
        )}
        <ListItem
          disablePadding
          sx={{
            justifyContent: 'center',
            py: 1,
            px: 1,
            gap: 0.5,
            flexDirection: navLabelVisible ? 'row' : 'column',
            display: isMobile ? 'none' : 'flex',
          }}
        >
          <Tooltip title={open ? 'Collapse' : 'Expand'} placement="right">
            <IconButton onClick={onToggle} size="large">
              {open ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Hide sidebar" placement="right">
            <IconButton onClick={handleVisibilityToggle} size="large">
              <VisibilityOffIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
        <Divider sx={{ mb: 1 }} />
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <Tooltip title={navLabelVisible ? '' : item.label} placement="right" disableHoverListener={navLabelVisible}>
              <ListItemButton
                selected={selectedTab === item.value}
                onClick={() => handleSelect(item.value)}
                sx={{
                  minHeight: isMobile ? 52 : 48,
                  justifyContent: navLabelVisible ? 'initial' : 'center',
                  px: isMobile ? 2 : 2.5,
                  borderRadius: 3,
                  my: 0.5,
                  transition: 'all 0.2s ease',
                  bgcolor: selectedTab === item.value ? 'rgba(15,118,110,0.12)' : undefined,
                  boxShadow: selectedTab === item.value ? '0 8px 18px rgba(15, 118, 110, 0.12)' : undefined,
                  '&:hover': {
                    bgcolor: 'rgba(15,118,110,0.16)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: navLabelVisible ? 2 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.label === 'Chat' ? (
                    <Badge badgeContent={chatUnreadCount} color="error" overlap="circular">
                      {iconMap[item.label]}
                    </Badge>
                  ) : (
                    iconMap[item.label]
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    opacity: navLabelVisible ? 1 : 0,
                    transition: 'opacity 0.2s',
                    fontWeight: selectedTab === item.value ? 700 : 500,
                    color: selectedTab === item.value ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </StyledDrawer>
  );
}
