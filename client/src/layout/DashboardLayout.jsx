import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

const drawerWidth = 280;

export default function DashboardLayout({
  children,
  menuItems,
  selected,
  onSelect,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [isMobile, mobileOpen]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f4f7fb",
        color: "#0f172a",
        overflow: "hidden",
        "--dash-ink": "#102033",
        "--dash-accent": "#2563eb",
        "--dash-accent-2": "#0f766e",
        "--dash-muted": "#64748b",
        "--dash-border": "#dbe3ee",
        "--dash-shadow": "0 16px 42px rgba(15, 23, 42, 0.08)",
        "--dash-sidebar-bg": "#07111f",
        "--dash-sidebar-text": "#e5edf7",
      }}
    >
      <Sidebar
        menuItems={menuItems}
        selectedId={selected}
        onSelect={onSelect}
        width={drawerWidth}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />
      <Box
        sx={{
          flex: 1,
          ml: { md: `${drawerWidth}px` },
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100vh",
          height: { xs: "auto", md: "100vh" },
          background:
            "radial-gradient(circle at top right, rgba(37,99,235,0.10), transparent 34%), radial-gradient(circle at bottom left, rgba(15,118,110,0.12), transparent 30%), #f4f7fb",
        }}
      >
        <Box sx={{ px: { xs: 2, md: 3, xl: 4 }, pt: { xs: 2, md: 3 } }}>
          <TopNavbar onMenuClick={handleDrawerToggle} />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            px: { xs: 2, md: 3, xl: 4 },
            py: { xs: 2, md: 3 },
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(100,116,139,0.55) transparent",
            "&::-webkit-scrollbar": { width: 10, height: 10 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(100,116,139,0.35)",
              borderRadius: 999,
              border: "3px solid transparent",
              backgroundClip: "content-box",
            },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", minHeight: "100%" }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
