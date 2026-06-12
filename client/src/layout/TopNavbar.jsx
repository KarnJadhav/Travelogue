import React, { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";

export default function TopNavbar({
  onMenuClick,
}) {
  const { t } = useTranslation();
  const [profileAnchor, setProfileAnchor] = useState(null);

  const profile = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      return {};
    }
  }, []);

  const displayName = profile?.name || t("topNavbar.defaultHotelOwner");
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t("topNavbar.roleHotel");
  const email = profile?.email || t("topNavbar.noEmailProvided");
  const phone = profile?.phone || t("topNavbar.noPhoneProvided");
  const country = profile?.country || t("topNavbar.notSet");
  const interests = profile?.interests || t("topNavbar.notSet");
  const initial = displayName?.trim()?.[0]?.toUpperCase() || "H";

  const handleProfileOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => setProfileAnchor(null);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
    } catch (err) {
      // ignore storage errors
    }
    handleProfileClose();
    window.location.href = "/login";
  };

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: 2.5,
        px: { xs: 1.5, md: 2.25 },
        py: { xs: 1.25, md: 1.5 },
        boxShadow: "0 14px 36px rgba(15, 23, 42, 0.07)",
        border: "1px solid var(--dash-border)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        overflow: "hidden",
        backdropFilter: "blur(18px)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <IconButton
            onClick={onMenuClick}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              bgcolor: "#f1f5f9",
              borderRadius: 1.5,
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
            size="small"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.15 }} noWrap>
              {t("topNavbar.welcomeBack", { name: displayName })}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", display: { xs: "none", sm: "block" } }}>
              {t("topNavbar.subtitle")}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
        >
          <IconButton
            sx={{
              bgcolor: "#f8fafc",
              border: "1px solid var(--dash-border)",
              borderRadius: 1.5,
              width: 42,
              height: 42,
              "&:hover": { bgcolor: "#eef2f7" },
            }}
          >
            <Badge variant="dot" color="error">
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
          <Button
            onClick={handleProfileOpen}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              color: "#0f172a",
              bgcolor: "#fff",
              borderRadius: 1.5,
              px: 1.25,
              height: 44,
              border: "1px solid var(--dash-border)",
              boxShadow: "none",
              "&:hover": { bgcolor: "#f8fafc", boxShadow: "none" },
            }}
          >
            <Avatar sx={{ width: 30, height: 30, mr: 1, bgcolor: "var(--dash-accent)", fontWeight: 900 }}>
              {initial}
            </Avatar>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {displayName}
            </Box>
          </Button>
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleProfileClose}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                border: "1px solid var(--dash-border)",
                boxShadow: "0 18px 42px rgba(15, 23, 42, 0.14)",
              },
            }}
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
                  {t("topNavbar.field.email")}: {email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.phone")}: {phone}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.country")}: {country}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.interests")}: {interests}
                </Typography>
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfileClose}>{t("topNavbar.profile")}</MenuItem>
            <MenuItem onClick={handleProfileClose}>{t("topNavbar.settings")}</MenuItem>
            <MenuItem onClick={handleSignOut}>{t("topNavbar.signOut")}</MenuItem>
          </Menu>
        </Stack>
      </Stack>
    </Box>
  );
}
