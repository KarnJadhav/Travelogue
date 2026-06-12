import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Stack,
  Typography,
} from "@mui/material";
import api from "../api";
import { useTranslation } from "react-i18next";

const defaultWidth = 250;

export default function Sidebar({
  menuItems = [],
  selectedId,
  onSelect,
  width = defaultWidth,
  mobileOpen = false,
  onClose,
  brand = "Travelogue",
}) {
  const { t } = useTranslation();
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [hotelProfile, setHotelProfile] = useState({ name: "", address: "" });

  const profile = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      return {};
    }
  }, []);

  const displayName = profile?.name || t("sidebar.defaultHotelOwner");
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t("sidebar.roleHotel");
  const email = profile?.email || t("sidebar.noEmailProvided");
  const phone = profile?.phone || t("sidebar.noPhoneProvided");
  const country = profile?.country || t("sidebar.notSet");
  const interests = profile?.interests || t("sidebar.notSet");
  const initial = displayName?.trim()?.[0]?.toUpperCase() || "H";
  const userId = profile?._id || profile?.userId || localStorage.getItem("userId");

  useEffect(() => {
    let isMounted = true;
    const fetchHotelProfile = async () => {
      if (!userId || profile?.role !== "hotel") return;
      try {
        const res = await api.get(`/hotel/profile/${userId}`);
        if (!isMounted) return;
        setHotelProfile({
          name: res.data?.name || "",
          address: res.data?.address || "",
        });
      } catch (err) {
        if (isMounted) setHotelProfile({ name: "", address: "" });
      }
    };
    fetchHotelProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, profile?.role]);

  const handleSelect = (id) => {
    if (onSelect) onSelect(id);
    if (onClose) onClose();
  };

  const handleProfileOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => setProfileAnchor(null);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("hotel_settings_active_tab");
    } catch (err) {
      // ignore storage errors
    }
    handleProfileClose();
    if (onClose) onClose();
    window.location.href = "/login";
  };

  const handleSectionOpen = (sectionId, settingsTab) => {
    if (sectionId && onSelect) onSelect(sectionId);
    if (settingsTab) {
      try {
        localStorage.setItem("hotel_settings_active_tab", settingsTab);
      } catch (err) {
        // ignore storage errors
      }
    }
    handleProfileClose();
    if (onClose) onClose();
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        background: "linear-gradient(180deg, #07111f 0%, #102033 52%, #0f172a 100%)",
        color: "var(--dash-sidebar-text)",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Box sx={{ px: 2.5, py: 2.75 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "#fff",
              background: "linear-gradient(135deg, #2563eb 0%, #0f766e 100%)",
              boxShadow: "0 12px 28px rgba(37, 99, 235, 0.25)",
            }}
          >
            T
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
              {brand}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(226,237,247,0.66)",
                fontWeight: 700,
              }}
            >
              {t("sidebar.console")}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <Box sx={{ px: 2.5, pt: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(226,237,247,0.52)",
            fontWeight: 800,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          Workspace
        </Typography>
      </Box>
      <List sx={{ px: 1.5, py: 1.25 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={selectedId === item.id}
            onClick={() => handleSelect(item.id)}
            sx={{
              mb: 0.75,
              borderRadius: 1.75,
              color: "rgba(226,237,247,0.76)",
              minHeight: 46,
              position: "relative",
              border: "1px solid transparent",
              transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
              "&::before": {
                content: '""',
                position: "absolute",
                left: 8,
                top: 10,
                bottom: 10,
                width: 3,
                borderRadius: 999,
                bgcolor: selectedId === item.id ? "#60a5fa" : "transparent",
              },
              "& .MuiListItemIcon-root": {
                color: selectedId === item.id ? "#fff" : "rgba(226,237,247,0.58)",
              },
              "&.Mui-selected": {
                bgcolor: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.14)",
                boxShadow: "0 12px 26px rgba(0,0,0,0.18)",
              },
              "&.Mui-selected .MuiListItemIcon-root": {
                color: "#fff",
              },
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.10)",
                color: "#fff",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 42, pl: 0.75 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: selectedId === item.id ? 800 : 700,
                fontSize: 14.5,
              }}
            />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", px: 3, pb: 3 }}>
        <Box
          onClick={handleProfileOpen}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.16)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <Avatar sx={{ width: 38, height: 38, bgcolor: "var(--dash-accent)", fontWeight: 900 }}>
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: "#fff", lineHeight: 1.2 }} noWrap>
              {hotelProfile.name || displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }} noWrap>
              {roleLabel} account
            </Typography>
          </Box>
        </Box>
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleProfileClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ "& .MuiPaper-root": { borderRadius: 2 } }}
        >
          <Box sx={{ px: 2.5, py: 2, maxWidth: 260 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, bgcolor: "var(--dash-accent)" }}>
                {initial}
              </Avatar>
              <Box>
                <Typography fontWeight={700}>{displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={0.5} mt={1.5}>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.email")}: {email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.phone")}: {phone}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.hotel")}: {hotelProfile.name || t("sidebar.notSet")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.address")}: {hotelProfile.address || t("sidebar.notSet")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.country")}: {country}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.interests")}: {interests}
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <List sx={{ py: 0 }}>
            <ListItemButton onClick={() => handleSectionOpen("profile", "general")} sx={{ px: 2 }}>
              <ListItemText primary={t("sidebar.profile")} />
            </ListItemButton>
            <ListItemButton onClick={handleSignOut} sx={{ px: 2 }}>
              <ListItemText primary={t("sidebar.signOut")} />
            </ListItemButton>
          </List>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: { xs: "85vw", sm: width },
            maxWidth: width,
            boxSizing: "border-box",
            borderRight: "none",
            bgcolor: "transparent",
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderRight: "none",
            bgcolor: "transparent",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
