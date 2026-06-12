import React from 'react';
import { ThemeProvider } from './theme';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function AdminApp() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerOpen = () => setMobileOpen(true);
  const handleDrawerClose = () => setMobileOpen(false);

  return (
    <ThemeProvider>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          background:
            'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.10), transparent 35%), radial-gradient(circle at 85% 0%, rgba(14,165,233,0.10), transparent 30%), #f8fafc',
        }}
      >
        <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerClose} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar onMenuClick={handleDrawerOpen} />
          <Box component="main" sx={{ flex: 1, p: { xs: 1.5, sm: 2.5, md: 3 }, overflowX: 'hidden' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', minWidth: 0 }}>
              <Outlet />
            </div>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
