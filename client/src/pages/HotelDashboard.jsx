
import React, { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layout/DashboardLayout";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

import HotelDashboardOverview from "./HotelDashboardOverview";
import RoomManagement from "./RoomManagement";
import BookingManagement from "./BookingManagement";
import HotelBookings from "./HotelBookings";
import HotelChat from "./HotelChat";
import HotelCustomerIntelligence from "./HotelCustomerIntelligence";
import HotelReviews from "./HotelReviews";
import HotelProfile from "./HotelProfile";

export default function HotelDashboard() {
  const { t } = useTranslation();
  const [section, setSection] = useState("overview");
  const handleSectionSelect = (nextSection) => setSection(nextSection);
  const menuItems = [
    { id: "overview", label: t("dashboard.menu.overview"), icon: <DashboardRoundedIcon /> },
    { id: "rooms", label: t("dashboard.menu.rooms"), icon: <BedRoundedIcon /> },
    { id: "bookings", label: t("dashboard.menu.bookings"), icon: <EventAvailableRoundedIcon /> },
    { id: "customers", label: t("dashboard.menu.customers"), icon: <PeopleAltRoundedIcon /> },
    { id: "reviews", label: t("dashboard.menu.reviews"), icon: <StarRoundedIcon /> },
    { id: "chat", label: t("dashboard.menu.chat"), icon: <ChatRoundedIcon /> },
    { id: "reports", label: t("dashboard.menu.reports"), icon: <AssessmentRoundedIcon /> },
  ];
  const sectionMeta = {
    overview: {
      title: t("dashboard.section.overview.title"),
      subtitle: t("dashboard.section.overview.subtitle"),
    },
    rooms: {
      title: t("dashboard.section.rooms.title"),
      subtitle: t("dashboard.section.rooms.subtitle"),
    },
    bookings: {
      title: t("dashboard.section.bookings.title"),
      subtitle: t("dashboard.section.bookings.subtitle"),
    },
    customers: {
      title: t("dashboard.section.customers.title"),
      subtitle: t("dashboard.section.customers.subtitle"),
    },
    reviews: {
      title: t("dashboard.section.reviews.title"),
      subtitle: t("dashboard.section.reviews.subtitle"),
    },
    chat: {
      title: t("dashboard.section.chat.title"),
      subtitle: t("dashboard.section.chat.subtitle"),
    },
    reports: {
      title: t("dashboard.section.reports.title"),
      subtitle: t("dashboard.section.reports.subtitle"),
    },
    profile: {
      title: t("dashboard.section.profile.title"),
      subtitle: t("dashboard.section.profile.subtitle"),
    },
  };
  const meta = sectionMeta[section] ?? sectionMeta.overview;
  const renderSection = () => {
    switch (section) {
      case "overview":
        return <HotelDashboardOverview showHeader={false} onQuickAction={handleSectionSelect} />;
      case "rooms":
        return <RoomManagement showHeader={false} />;
      case "bookings":
        return <HotelBookings showHeader={false} />;
      case "customers":
        return <HotelCustomerIntelligence showHeader={false} />;
      case "reviews":
        return <HotelReviews showHeader={false} />;
      case "chat":
        return <HotelChat showHeader={false} />;
      case "reports":
        return <BookingManagement showHeader={false} />;
      case "profile":
        return <HotelProfile showHeader={false} />;
      default:
        return <HotelDashboardOverview showHeader={false} onQuickAction={handleSectionSelect} />;
    }
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      selected={section}
      onSelect={handleSectionSelect}
    >
      <Paper
        elevation={0}
        sx={{
          mb: { xs: 2.5, md: 3 },
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          border: "1px solid var(--dash-border)",
          boxShadow: "var(--dash-shadow)",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: 0,
                fontSize: { xs: 28, md: 36 },
                lineHeight: 1.08,
              }}
            >
              {meta.title}
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#64748b", fontSize: { xs: 14, md: 16 } }}>
              {meta.subtitle}
            </Typography>
          </Box>
        </Stack>
      </Paper>
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          gap: 1,
          mb: 2,
          overflowX: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {menuItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => handleSectionSelect(item.id)}
            variant={section === item.id ? "contained" : "outlined"}
            size="small"
            sx={{
              flexShrink: 0,
              textTransform: "none",
              borderRadius: 999,
              fontWeight: 700,
              minHeight: 34,
              px: 1.6,
              boxShadow: section === item.id ? "0 8px 18px rgba(37, 99, 235, 0.24)" : "none",
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
      {renderSection()}
    </DashboardLayout>
  );
}
