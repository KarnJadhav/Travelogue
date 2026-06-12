import React, { useMemo } from "react";
import { Box, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useTranslation } from "react-i18next";

const mockData = {
  occupancy: 32,
  revenueDropPct: 18,
  bookings: [
    { id: "BK-2031", guest: "Ava Patel", cancellations: 0 },
    { id: "BK-2032", guest: "Lucas Meyer", cancellations: 4 },
    { id: "BK-2033", guest: "Sofia Chen", cancellations: 2 },
    { id: "BK-2034", guest: "Noah Williams", cancellations: 5 },
  ],
};

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const buildAlert = (variant, title, message, icon) => ({
  variant,
  title,
  message,
  icon,
});

export default function HotelNotifications({ showHeader = true }) {
  const { t } = useTranslation();
  const alerts = useMemo(() => {
    const items = [];

    if (mockData.occupancy < 35) {
      items.push(
        buildAlert(
          "error",
          t("hotelNotifications.alert.lowOccupancyTitle"),
          t("hotelNotifications.alert.lowOccupancyMessage", { occupancy: mockData.occupancy }),
          <ErrorOutlineIcon />
        )
      );
    } else {
      items.push(
        buildAlert(
          "success",
          t("hotelNotifications.alert.occupancyStableTitle"),
          t("hotelNotifications.alert.occupancyStableMessage", { occupancy: mockData.occupancy }),
          <CheckCircleOutlineIcon />
        )
      );
    }

    if (mockData.revenueDropPct > 15) {
      items.push(
        buildAlert(
          "warning",
          t("hotelNotifications.alert.revenueDropTitle"),
          t("hotelNotifications.alert.revenueDropMessage", { drop: mockData.revenueDropPct }),
          <TrendingDownIcon />
        )
      );
    }

    return items;
  }, [t]);

  const highRiskBookings = useMemo(
    () => mockData.bookings.filter((booking) => booking.cancellations > 3),
    []
  );

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {t("hotelNotifications.header.title")}
          </Typography>
          <Typography color="text.secondary">{t("hotelNotifications.header.subtitle")}</Typography>
        </Box>
      )}

      <Grid container spacing={2.5} mb={2.5}>
        {alerts.map((alert) => {
          const colorMap = {
            error: {
              bg: "#fef2f2",
              border: "#fecaca",
              icon: "#dc2626",
              text: "#991b1b",
            },
            warning: {
              bg: "#fffbeb",
              border: "#fde68a",
              icon: "#d97706",
              text: "#92400e",
            },
            success: {
              bg: "#ecfdf5",
              border: "#bbf7d0",
              icon: "#16a34a",
              text: "#166534",
            },
          };
          const palette = colorMap[alert.variant];
          return (
            <Grid item xs={12} md={6} key={alert.title}>
              <Paper
                sx={{
                  ...cardStyle,
                  bgcolor: palette.bg,
                  borderColor: palette.border,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                  <Box sx={{ color: palette.icon }}>{alert.icon}</Box>
                  <Typography fontWeight={700} sx={{ color: palette.text }}>
                    {alert.title}
                  </Typography>
                </Stack>
                <Typography color="text.secondary">{alert.message}</Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={cardStyle}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <WarningAmberIcon sx={{ color: "#f59e0b" }} />
          <Typography variant="h6" fontWeight={700}>
            {t("hotelNotifications.risk.title")}
          </Typography>
        </Stack>
        <Typography color="text.secondary" mb={2}>
          {t("hotelNotifications.risk.subtitle")}
        </Typography>
        <Stack spacing={1}>
          {highRiskBookings.map((booking) => (
            <Stack
              key={booking.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid #fee2e2",
                bgcolor: "#fff1f2",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PersonOffIcon sx={{ color: "#dc2626" }} />
                <Box>
                  <Typography fontWeight={700}>{booking.guest}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("hotelNotifications.risk.bookingId", { id: booking.id })}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={t("hotelNotifications.risk.highRisk")}
                sx={{
                  bgcolor: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
