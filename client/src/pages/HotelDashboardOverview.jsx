import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api";
import BedIcon from "@mui/icons-material/Bed";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import StarIcon from "@mui/icons-material/Star";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "../config/runtime";

const cardStyle = {
  p: { xs: 2, md: 2.25 },
  borderRadius: 2,
  bgcolor: "#fff",
  border: "1px solid #dbe3ee",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const metricCardStyle = {
  p: { xs: 2, md: 2.25 },
  borderRadius: 2,
  border: "1px solid #dbe3ee",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  minHeight: 116,
};

export default function HotelDashboardOverview({ showHeader = true, onQuickAction }) {
  const userId = localStorage.getItem("userId");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [messagesToday, setMessagesToday] = useState(0);
  const [latestMessage, setLatestMessage] = useState(null);
  const mountedRef = useRef(true);
  const [quickAction, setQuickAction] = useState(null);
  const [quickRoom, setQuickRoom] = useState({
    type: "",
    price: "",
    total: "",
    available: "",
    status: "Available",
  });
  const [quickRoomSaving, setQuickRoomSaving] = useState(false);
  const [quickRoomError, setQuickRoomError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchOverview = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setReviewsLoading(true);
    try {
      const [roomRes, reviewRes, summaryRes] = await Promise.all([
        api.get(`/room/hotel/${userId}`),
        api.get("/hotelReview/owner"),
        api.get(`/chat/hotel/${userId}/summary`)
      ]);
      if (!mountedRef.current) return;
      setRooms(roomRes.data || []);
      setReviews(reviewRes.data.reviews || []);
      setMessagesToday(summaryRes.data.messagesToday || 0);
      setLatestMessage(summaryRes.data.latestMessage || null);
    } catch (err) {
      if (!mountedRef.current) return;
      setRooms([]);
      setReviews([]);
      setMessagesToday(0);
      setLatestMessage(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setReviewsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchOverview();
    const intervalId = setInterval(fetchOverview, 30000);
    const socket = io(SOCKET_BASE_URL);
    socket.emit("joinHotelRoom", { hotelId: userId });
    socket.on("hotelMessageUpdate", fetchOverview);
    socket.on("hotelReviewUpdate", fetchOverview);
    socket.on("hotelRoomUpdate", fetchOverview);
    return () => {
      clearInterval(intervalId);
      socket.off("hotelMessageUpdate", fetchOverview);
      socket.off("hotelReviewUpdate", fetchOverview);
      socket.off("hotelRoomUpdate", fetchOverview);
      socket.disconnect();
    };
  }, [userId, fetchOverview]);

  const totalRooms = rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const availableRooms = rooms.reduce((sum, r) => sum + (Number(r.available) || 0), 0);
  const occupiedRooms = Math.max(0, totalRooms - availableRooms);
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [reviews]);

  const latestReview = sortedReviews[0] || null;
  const latestRoomUpdate = useMemo(() => {
    if (rooms.length === 0) return null;
    return rooms.reduce((latest, room) => {
      const stamp = room.updatedAt || room.createdAt;
      if (!stamp) return latest;
      const time = new Date(stamp).getTime();
      if (!latest || time > latest.time) {
        return { time, date: stamp };
      }
      return latest;
    }, null);
  }, [rooms]);

  const formatTimeAgo = (value) => {
    if (!value) return "No recent updates";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No recent updates";
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const occupancyStatus =
    occupancyRate >= 80 ? "High demand" : occupancyRate >= 55 ? "Healthy pace" : "Needs attention";

  const metricCards = [
    {
      id: "rooms",
      label: "Total Rooms",
      value: totalRooms,
      loading,
      helper: `${availableRooms} available | ${occupiedRooms} occupied`,
      accent: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
      icon: <BedIcon sx={{ color: "#fff" }} />,
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      value: `${occupancyRate}%`,
      loading,
      helper: occupancyStatus,
      accent: "#14b8a6",
      bg: "rgba(20, 184, 166, 0.12)",
      icon: <TrendingUpIcon sx={{ color: "#fff" }} />,
    },
    {
      id: "messages",
      label: "Messages Today",
      value: messagesToday,
      loading,
      helper: latestMessage ? `Latest ${formatTimeAgo(latestMessage.createdAt)}` : "No new messages",
      accent: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.12)",
      icon: <ChatBubbleOutlineIcon sx={{ color: "#fff" }} />,
    },
    {
      id: "rating",
      label: "Average Rating",
      value: averageRating || "0.0",
      loading: reviewsLoading,
      helper: reviews.length ? `${reviews.length} reviews` : "No reviews yet",
      accent: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
      icon: <StarIcon sx={{ color: "#fff" }} />,
    },
  ];

  const recentActivity = [
    {
      id: "message",
      icon: <ChatBubbleOutlineIcon sx={{ color: "#2563eb" }} />,
      tint: "rgba(37, 99, 235, 0.12)",
      title: latestMessage
        ? `New message from ${latestMessage.senderId?.name || "guest"}`
        : "No new messages",
      time: latestMessage?.createdAt
    },
    {
      id: "review",
      icon: <StarIcon sx={{ color: "#f59e0b" }} />,
      tint: "rgba(245, 158, 11, 0.14)",
      title: latestReview
        ? `New review from ${latestReview.touristId?.name || "guest"}`
        : "No reviews yet",
      time: latestReview?.createdAt
    },
    {
      id: "room",
      icon: <BedIcon sx={{ color: "#22c55e" }} />,
      tint: "rgba(34, 197, 94, 0.12)",
      title: latestRoomUpdate ? "Room availability updated" : "No room updates",
      time: latestRoomUpdate?.date
    }
  ];

  const handleQuickAction = (nextSection) => {
    if (typeof onQuickAction === "function") {
      onQuickAction(nextSection);
    }
  };
  const quickProfile = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      return {};
    }
  }, []);
  const latestMessageText =
    latestMessage?.message ||
    latestMessage?.text ||
    latestMessage?.content ||
    latestMessage?.lastMessage ||
    "Open chats to view the full conversation.";
  const openQuickModal = (action) => {
    setQuickRoomError("");
    setQuickAction(action);
  };
  const closeQuickModal = () => {
    setQuickRoomError("");
    setQuickAction(null);
    setQuickRoom({
      type: "",
      price: "",
      total: "",
      available: "",
      status: "Available",
    });
  };
  const quickRoomInvalid = !quickRoom.type || !quickRoom.price || !quickRoom.total;
  const handleQuickAddRoom = async () => {
    if (!userId) {
      setQuickRoomError("Please sign in to add a room.");
      return;
    }
    if (quickRoomInvalid) {
      setQuickRoomError("Room type, price, and total rooms are required.");
      return;
    }
    setQuickRoomSaving(true);
    setQuickRoomError("");
    try {
      const totalValue = Number(quickRoom.total);
      const availableValue = Math.min(
        Number(quickRoom.available || quickRoom.total),
        totalValue
      );
      const payload = {
        type: quickRoom.type,
        price: Number(quickRoom.price),
        total: totalValue,
        available: availableValue,
        status: quickRoom.status || "Available",
      };
      const res = await api.post(`/room/hotel/${userId}`, payload);
      setRooms((prev) => {
        const exists = prev.some((room) => room._id === res.data?._id);
        if (exists) {
          return prev.map((room) => (room._id === res.data?._id ? res.data : room));
        }
        return [res.data, ...prev];
      });
      setQuickRoom({
        type: "",
        price: "",
        total: "",
        available: "",
        status: "Available",
      });
      setQuickAction(null);
    } catch (err) {
      setQuickRoomError("Unable to add room right now. Please try again.");
    } finally {
      setQuickRoomSaving(false);
    }
  };

  return (
    <Box sx={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" }}>
      {showHeader && (
        <>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Overview
          </Typography>
          <Typography mb={3} sx={{ fontSize: { xs: 16, md: 18 }, color: "#64748b" }}>
            A clear snapshot of today's hotel operations.
          </Typography>
        </>
      )}

      <Grid container spacing={2.5} mb={3}>
        {metricCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.id}>
            <Paper
              elevation={0}
              sx={{
                ...metricCardStyle,
                bgcolor: card.bg,
                borderColor: `${card.accent}20`,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
                },
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: card.accent, fontWeight: 700, letterSpacing: "0.08em" }}
                >
                  {card.label}
                </Typography>
                {card.loading ? (
                  <CircularProgress size={24} sx={{ color: card.accent }} />
                ) : (
                  <Typography variant="h4" fontWeight={800}>
                    {card.value}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {card.helper}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: card.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 12px 22px ${card.accent}55`,
                }}
              >
                {card.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={cardStyle}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Recent Activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Signals from chats, reviews, and inventory updates.
                </Typography>
              </Box>
              <Chip
                label="Live"
                size="small"
                sx={{ bgcolor: "rgba(34,197,94,0.12)", color: "#15803d", fontWeight: 600 }}
              />
            </Stack>
            <Stack spacing={1.5}>
              {recentActivity.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: item.tint,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography fontWeight={600}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(item.time)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={cardStyle}
          >
            <Typography variant="h6" fontWeight={700} mb={2}>
              Action Center
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={12}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.2,
                    background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                    boxShadow: "0 10px 20px rgba(34, 197, 94, 0.22)",
                    textTransform: "none",
                  }}
                  startIcon={<BedIcon />}
                  onClick={() => openQuickModal("room")}
                >
                  Add Room
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={12}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.2,
                    background: "linear-gradient(90deg, #f97316 0%, #f59e0b 100%)",
                    boxShadow: "0 10px 20px rgba(249, 115, 22, 0.22)",
                    textTransform: "none",
                  }}
                  startIcon={<ChatBubbleOutlineIcon />}
                  onClick={() => openQuickModal("chat")}
                >
                  View Chats
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.2,
                    borderColor: "#3b82f6",
                    color: "#3b82f6",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#2563eb",
                      backgroundColor: "rgba(59,130,246,0.08)",
                    },
                  }}
                  startIcon={<AccountBoxIcon />}
                  onClick={() => openQuickModal("profile")}
                >
                  Update Profile
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.2,
                    borderColor: "#f59e0b",
                    color: "#f59e0b",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#d97706",
                      backgroundColor: "rgba(245,158,11,0.12)",
                    },
                  }}
                  startIcon={<StarIcon />}
                  onClick={() => openQuickModal("reviews")}
                >
                  View Reviews
                </Button>
              </Grid>
            </Grid>
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                border: "1px dashed #e2e8f0",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Tip: Use Quick Actions to jump directly into the task you need.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          ...cardStyle,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              All Guest Reviews
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reviews.length ? `${reviews.length} total reviews` : "Waiting for your first review"}
            </Typography>
          </Box>
          <Button
            variant="text"
            sx={{ fontWeight: 700, textTransform: "none" }}
            onClick={() => openQuickModal("reviews")}
          >
            View All
          </Button>
        </Stack>
        {reviewsLoading ? (
          <Typography color="text.secondary">Loading reviews...</Typography>
        ) : sortedReviews.length === 0 ? (
          <Typography color="text.secondary">No reviews yet.</Typography>
        ) : (
          <Stack spacing={2} sx={{ maxHeight: 360, overflowY: "auto", pr: 1 }}>
            {sortedReviews.map((review) => (
              <Box key={review._id} sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc" }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Avatar src={review.touristId?.avatar || ""} alt={review.touristId?.name || "Guest"} />
                  <Box>
                    <Typography fontWeight={700}>{review.touristId?.name || "Guest"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                    </Typography>
                  </Box>
                </Stack>
                <Rating value={review.rating || 0} readOnly size="small" />
                <Typography color="text.secondary">{review.comment}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={quickAction === "room"} onClose={closeQuickModal} fullWidth maxWidth="sm">
        <DialogTitle>Quick Add Room</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Add a room without leaving the overview.
            </Typography>
            {quickRoomError && <Alert severity="warning">{quickRoomError}</Alert>}
            <TextField
              label="Room Type"
              value={quickRoom.type}
              onChange={(e) => setQuickRoom((prev) => ({ ...prev, type: e.target.value }))}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price per Night"
                  type="number"
                  value={quickRoom.price}
                  onChange={(e) => setQuickRoom((prev) => ({ ...prev, price: e.target.value }))}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={quickRoom.status}
                    onChange={(e) => setQuickRoom((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    {["Available", "Full", "Unavailable"].map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Rooms"
                  type="number"
                  value={quickRoom.total}
                  onChange={(e) => setQuickRoom((prev) => ({ ...prev, total: e.target.value }))}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Available Now"
                  type="number"
                  value={quickRoom.available}
                  onChange={(e) => setQuickRoom((prev) => ({ ...prev, available: e.target.value }))}
                  fullWidth
                  inputProps={{ min: 0 }}
                  helperText="Leave empty to use total rooms."
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeQuickModal}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => {
              closeQuickModal();
              handleQuickAction("rooms");
            }}
          >
            Manage Rooms
          </Button>
          <Button
            variant="contained"
            onClick={handleQuickAddRoom}
            disabled={quickRoomSaving || quickRoomInvalid}
          >
            {quickRoomSaving ? "Adding..." : "Add Room"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quickAction === "chat"} onClose={closeQuickModal} fullWidth maxWidth="sm">
        <DialogTitle>Quick Chats</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography variant="overline" sx={{ color: "#64748b", letterSpacing: 1.2 }}>
                Messages Today
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {messagesToday}
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography fontWeight={700}>Latest Message</Typography>
              <Typography variant="caption" color="text.secondary">
                {latestMessage?.senderId?.name || "Guest"} - {formatTimeAgo(latestMessage?.createdAt)}
              </Typography>
              <Typography sx={{ mt: 1 }}>
                {latestMessage ? latestMessageText : "No messages yet."}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeQuickModal}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              closeQuickModal();
              handleQuickAction("chat");
            }}
          >
            Open Chats
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quickAction === "profile"} onClose={closeQuickModal} fullWidth maxWidth="sm">
        <DialogTitle>Quick Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Review your profile details and jump to full editing when needed.
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography fontWeight={700}>{quickProfile?.name || "Hotel Owner"}</Typography>
              <Typography variant="body2" color="text.secondary">
                {quickProfile?.email || "No email provided"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quickProfile?.phone || "No phone provided"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Role: {quickProfile?.role || "Hotel"}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeQuickModal}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              closeQuickModal();
              handleQuickAction("profile");
            }}
          >
            Edit Profile
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quickAction === "reviews"} onClose={closeQuickModal} fullWidth maxWidth="sm">
        <DialogTitle>Latest Reviews</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {reviewsLoading ? (
              <Typography color="text.secondary">Loading reviews...</Typography>
            ) : sortedReviews.length === 0 ? (
              <Typography color="text.secondary">No reviews yet.</Typography>
            ) : (
              sortedReviews.slice(0, 3).map((review) => {
                const comment = review.comment || "";
                const preview = comment.length > 120 ? `${comment.slice(0, 120)}...` : comment;
                return (
                  <Box key={review._id} sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc" }}>
                    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                      <Avatar src={review.touristId?.avatar || ""} alt={review.touristId?.name || "Guest"} />
                      <Box>
                        <Typography fontWeight={700}>{review.touristId?.name || "Guest"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                        </Typography>
                      </Box>
                    </Stack>
                    <Rating value={review.rating || 0} readOnly size="small" />
                    <Typography color="text.secondary">{preview}</Typography>
                  </Box>
                );
              })
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeQuickModal}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              closeQuickModal();
              handleQuickAction("reviews");
            }}
          >
            Open Reviews
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
