import React, { useMemo } from "react";
import { Box, Chip, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import { useTranslation } from "react-i18next";

const buildMockData = () => {
  const last30DaysRevenue = Array.from({ length: 30 }, (_, index) => {
    const base = 20 + index * 0.6;
    const wave = Math.sin(index / 3) * 4;
    const jitter = (index % 5) - 2;
    return Math.max(14, Math.round(base + wave + jitter));
  });

  const weekdayWeekend = [
    { key: "weekday", value: 68 },
    { key: "weekend", value: 92 },
  ];

  const roomTypeShare = [
    { key: "deluxe", value: 38, color: "#3b82f6" },
    { key: "suite", value: 28, color: "#22c55e" },
    { key: "standard", value: 20, color: "#f59e0b" },
    { key: "executive", value: 14, color: "#6366f1" },
  ];

  const forecast = [
    { key: "mon", value: 28 },
    { key: "tue", value: 30 },
    { key: "wed", value: 31 },
    { key: "thu", value: 33 },
    { key: "fri", value: 38 },
    { key: "sat", value: 42 },
    { key: "sun", value: 35 },
  ];

  const occupancyRate = 76;

  return {
    last30DaysRevenue,
    weekdayWeekend,
    roomTypeShare,
    forecast,
    occupancyRate,
  };
};

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const lineChartPoints = (values, width, height, padding) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const xStep = (width - padding * 2) / (values.length - 1);
  return values
    .map((value, index) => {
      const x = padding + index * xStep;
      const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
};

const getLocale = (language) => {
  if (language?.startsWith("hi")) return "hi-IN";
  if (language?.startsWith("mr")) return "mr-IN";
  return "en-IN";
};

const formatCompactCurrency = (value, language) => {
  const amount = (Number(value) || 0) * 1000;
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

export default function HotelAnalytics({ showHeader = true }) {
  const { t, i18n } = useTranslation();
  const data = useMemo(() => buildMockData(), []);

  const suggestion = useMemo(() => {
    if (data.occupancyRate > 80) return t("hotelAnalytics.suggestions.highDemand");
    if (data.occupancyRate < 40) return t("hotelAnalytics.suggestions.lowDemand");
    return t("hotelAnalytics.suggestions.stableDemand");
  }, [data.occupancyRate, t]);

  const linePoints = useMemo(
    () => lineChartPoints(data.last30DaysRevenue, 600, 220, 20),
    [data.last30DaysRevenue]
  );
  const maxBarValue = Math.max(...data.weekdayWeekend.map((item) => item.value));
  const maxForecast = Math.max(...data.forecast.map((item) => item.value));
  const pieGradient = useMemo(() => {
    let current = 0;
    const slices = data.roomTypeShare.map((slice) => {
      const start = current;
      const end = current + slice.value;
      current = end;
      return `${slice.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${slices.join(", ")})`;
  }, [data.roomTypeShare]);

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {t("hotelAnalytics.header.title")}
          </Typography>
          <Typography color="text.secondary">{t("hotelAnalytics.header.subtitle")}</Typography>
        </Box>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Paper sx={cardStyle}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ShowChartIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography variant="h6" fontWeight={700}>
                {t("hotelAnalytics.cards.revenueTrend")}
              </Typography>
            </Stack>
            <Box sx={{ width: "100%", overflowX: "auto" }}>
              <Box
                component="svg"
                viewBox="0 0 600 220"
                sx={{ width: "100%", minWidth: 520, display: "block" }}
              >
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                  </linearGradient>
                </defs>
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline points={`${linePoints} 600,220 0,220`} fill="url(#revGradient)" stroke="none" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ ...cardStyle, height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
              <TrendingUpIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography variant="h6" fontWeight={700}>
                {t("hotelAnalytics.cards.aiSuggestion")}
              </Typography>
            </Stack>
            <Typography color="text.secondary" mb={2}>
              {t("hotelAnalytics.cards.occupancyToday", { rate: data.occupancyRate })}
            </Typography>
            <Box
              sx={{
                borderRadius: 3,
                p: 2,
                color: "#fff",
                background: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
                boxShadow: "0 14px 30px rgba(37, 99, 235, 0.25)",
              }}
            >
              <Typography fontWeight={700} mb={0.5}>
                {t("hotelAnalytics.cards.suggestedAction")}
              </Typography>
              <Typography>{suggestion}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1}>
              <Chip label={t("hotelAnalytics.tags.autoInsights")} color="primary" size="small" />
              <Chip label={t("hotelAnalytics.tags.revenue")} size="small" variant="outlined" />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={cardStyle}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <BarChartIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography variant="h6" fontWeight={700}>
                {t("hotelAnalytics.cards.weekdayWeekend")}
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {data.weekdayWeekend.map((item) => (
                <Box key={item.key}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography fontWeight={600}>
                      {t(`hotelAnalytics.weekdayWeekend.${item.key}`)}
                    </Typography>
                    <Typography color="text.secondary">
                      {formatCompactCurrency(item.value, i18n.resolvedLanguage)}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: "#e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(item.value / maxBarValue) * 100}%`,
                        bgcolor: "var(--dash-accent)",
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={cardStyle}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <PieChartIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography variant="h6" fontWeight={700}>
                {t("hotelAnalytics.cards.bestRoomType")}
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
              <Box
                sx={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: pieGradient,
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Stack spacing={1}>
                {data.roomTypeShare.map((slice) => (
                  <Stack direction="row" spacing={1} alignItems="center" key={slice.key}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: slice.color,
                      }}
                    />
                    <Typography fontWeight={600}>{t(`hotelAnalytics.roomTypes.${slice.key}`)}</Typography>
                    <Typography color="text.secondary">{slice.value}%</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={cardStyle}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <AutoGraphIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography variant="h6" fontWeight={700}>
                {t("hotelAnalytics.cards.forecast")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ height: 180 }}>
              {data.forecast.map((item) => (
                <Box key={item.key} sx={{ flex: 1, textAlign: "center" }}>
                  <Box
                    sx={{
                      height: `${(item.value / maxForecast) * 140}px`,
                      borderRadius: 2,
                      bgcolor: "rgba(59,130,246,0.18)",
                      border: "1px solid rgba(59,130,246,0.4)",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "var(--dash-muted)", mt: 1, display: "block" }}
                  >
                    {t(`hotelAnalytics.days.${item.key}`)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
