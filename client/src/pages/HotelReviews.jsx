import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, Grid, Paper, Rating, Stack, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { useTranslation } from "react-i18next";
import api from "../api";

const positiveWords = [
  "amazing",
  "great",
  "loved",
  "fantastic",
  "comfortable",
  "friendly",
  "excellent",
  "spotless",
  "best",
  "good",
];
const negativeWords = [
  "poor",
  "dirty",
  "noisy",
  "slow",
  "not",
  "issue",
  "bad",
  "broken",
  "cold",
  "problem",
];

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const getSentimentScore = (text) => {
  const words = text.toLowerCase();
  let score = 0;
  positiveWords.forEach((word) => {
    if (words.includes(word)) score += 1;
  });
  negativeWords.forEach((word) => {
    if (words.includes(word)) score -= 1;
  });
  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
};

export default function HotelReviews({ showHeader = true }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/hotelReview/owner");
        if (!isMounted) return;
        setReviews(res.data.reviews || []);
      } catch {
        if (!isMounted) return;
        setReviews([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedReviews = useMemo(
    () =>
      reviews.map((review) => ({
        rating: review.rating,
        text: review.comment || review.text || "",
        time: review.createdAt ? new Date(review.createdAt).toLocaleDateString() : review.time || "",
        touristName: review.touristId?.name || t("hotelReviews.fallback.guest"),
        avatar: review.touristId?.avatar || "",
        id: review._id || review.id,
      })),
    [reviews, t]
  );

  const sentimentStats = useMemo(() => {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    normalizedReviews.forEach((review) => {
      const score = getSentimentScore(review.text);
      if (score > 0) positive += 1;
      else if (score < 0) negative += 1;
      else neutral += 1;
    });

    const total = normalizedReviews.length;
    const positivePct = total ? Math.round((positive / total) * 100) : 0;
    const negativePct = total ? Math.round((negative / total) * 100) : 0;
    const neutralPct = total ? Math.max(0, 100 - positivePct - negativePct) : 0;
    const ratingAvg = total
      ? normalizedReviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;

    return {
      positivePct,
      negativePct,
      neutralPct,
      ratingAvg: Number(ratingAvg.toFixed(1)),
    };
  }, [normalizedReviews]);

  const ratingDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    normalizedReviews.forEach((review) => {
      const rounded = Math.round(review.rating);
      counts[rounded] += 1;
    });
    return counts;
  }, [normalizedReviews]);

  const pieGradient = useMemo(() => {
    const positive = sentimentStats.positivePct;
    const negative = sentimentStats.negativePct;
    return `conic-gradient(#22c55e 0% ${positive}%, #ef4444 ${positive}% ${positive + negative}%, #e2e8f0 ${positive + negative}% 100%)`;
  }, [sentimentStats]);

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {t("hotelReviews.header.title")}
          </Typography>
          <Typography color="text.secondary">{t("hotelReviews.header.subtitle")}</Typography>
        </Box>
      )}

      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <StarIcon sx={{ color: "#f59e0b" }} />
              <Typography fontWeight={700}>{t("hotelReviews.cards.averageRating")}</Typography>
            </Stack>
            <Typography variant="h2" fontWeight={800} sx={{ color: "#0f172a" }}>
              {loading ? "--" : sentimentStats.ratingAvg}
            </Typography>
            <Rating value={sentimentStats.ratingAvg} precision={0.1} readOnly size="large" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...cardStyle, bgcolor: "#ecfdf5" }}>
            <Typography fontWeight={700} mb={1}>
              {t("hotelReviews.cards.positiveReviews")}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ color: "#16a34a" }}>
              {loading ? "--" : `${sentimentStats.positivePct}%`}
            </Typography>
            <Typography color="text.secondary">{t("hotelReviews.cards.positiveSubtitle")}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...cardStyle, bgcolor: "#fef2f2" }}>
            <Typography fontWeight={700} mb={1}>
              {t("hotelReviews.cards.negativeReviews")}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ color: "#dc2626" }}>
              {loading ? "--" : `${sentimentStats.negativePct}%`}
            </Typography>
            <Typography color="text.secondary">{t("hotelReviews.cards.negativeSubtitle")}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={6}>
          <Paper sx={cardStyle}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t("hotelReviews.sections.ratingDistribution")}
            </Typography>
            <Stack spacing={1.5}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star];
                const total = normalizedReviews.length || 1;
                const width = Math.round((count / total) * 100);
                return (
                  <Box key={star}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography fontWeight={600}>
                        {t("hotelReviews.sections.starLabel", { star })}
                      </Typography>
                      <Typography color="text.secondary">{count}</Typography>
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
                          width: `${width}%`,
                          bgcolor: "#3b82f6",
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={cardStyle}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {t("hotelReviews.sections.sentimentSplit")}
            </Typography>
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
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e" }} />
                  <Typography fontWeight={600}>{t("hotelReviews.sentiment.positive")}</Typography>
                  <Typography color="text.secondary">{sentimentStats.positivePct}%</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444" }} />
                  <Typography fontWeight={600}>{t("hotelReviews.sentiment.negative")}</Typography>
                  <Typography color="text.secondary">{sentimentStats.negativePct}%</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#e2e8f0" }} />
                  <Typography fontWeight={600}>{t("hotelReviews.sentiment.neutral")}</Typography>
                  <Typography color="text.secondary">{sentimentStats.neutralPct}%</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Paper sx={cardStyle}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            {t("hotelReviews.sections.latestReviews")}
          </Typography>
          {loading ? (
            <Typography color="text.secondary">{t("hotelReviews.fallback.loadingReviews")}</Typography>
          ) : normalizedReviews.length === 0 ? (
            <Typography color="text.secondary">{t("hotelReviews.fallback.noReviews")}</Typography>
          ) : (
            <Stack spacing={2}>
              {normalizedReviews.slice(0, 6).map((review) => (
                <Box key={review.id} sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc" }}>
                  <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                    <Avatar src={review.avatar} alt={review.touristName} />
                    <Box>
                      <Typography fontWeight={700}>{review.touristName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {review.time}
                      </Typography>
                    </Box>
                  </Stack>
                  <Rating value={review.rating} readOnly size="small" />
                  <Typography color="text.secondary">{review.text}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
