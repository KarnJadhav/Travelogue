import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PeopleIcon from "@mui/icons-material/People";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { useTranslation } from "react-i18next";
import api from "../api";

const STATUS_ALL = "All";
const STATUS_PENDING = "pending";
const STATUS_CONFIRMED = "confirmed";
const STATUS_CHECKED_IN = "checked_in";
const STATUS_COMPLETED = "completed";
const STATUS_CANCELLED = "cancelled";

const cardStyle = {
  p: { xs: 2, md: 2.25 },
  borderRadius: 2,
  border: "1px solid #dbe3ee",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  bgcolor: "#fff",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    bgcolor: "#fff",
  },
};

const tableHeadCellSx = {
  py: 1.5,
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.7,
  textTransform: "uppercase",
  borderBottom: "1px solid #dbe3ee",
};

const statusChipSx = {
  [STATUS_PENDING]: { bgcolor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" },
  [STATUS_CONFIRMED]: { bgcolor: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  [STATUS_CHECKED_IN]: { bgcolor: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" },
  [STATUS_COMPLETED]: { bgcolor: "#f1f5f9", color: "#334155", borderColor: "#cbd5e1" },
  [STATUS_CANCELLED]: { bgcolor: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" },
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10) || "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getNights = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getAllowedStatusOptions = (booking) => {
  const currentStatus = String(booking?.status || STATUS_PENDING).toLowerCase();
  const options = new Set([currentStatus]);
  const today = toStartOfDay(new Date());
  const checkIn = toStartOfDay(booking?.checkIn);
  const checkOut = toStartOfDay(booking?.checkOut);
  const canCheckInNow = Boolean(today && checkIn && checkOut) && today >= checkIn && today < checkOut;
  const canCompleteNow = Boolean(today && checkOut) && today > checkOut;

  if (currentStatus === STATUS_PENDING) {
    options.add(STATUS_CONFIRMED);
    options.add(STATUS_CANCELLED);
  } else if (currentStatus === STATUS_CONFIRMED) {
    options.add(STATUS_CANCELLED);
    if (canCheckInNow) options.add(STATUS_CHECKED_IN);
    if (canCompleteNow) options.add(STATUS_COMPLETED);
  } else if (currentStatus === STATUS_CHECKED_IN) {
    if (canCompleteNow) options.add(STATUS_COMPLETED);
  }

  const preferredOrder = [
    STATUS_PENDING,
    STATUS_CONFIRMED,
    STATUS_CHECKED_IN,
    STATUS_COMPLETED,
    STATUS_CANCELLED,
  ];

  return preferredOrder.filter((status) => options.has(status));
};

export default function HotelBookings({ showHeader = true }) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const statusOptions = [
    STATUS_ALL,
    STATUS_PENDING,
    STATUS_CONFIRMED,
    STATUS_CHECKED_IN,
    STATUS_COMPLETED,
    STATUS_CANCELLED,
  ];

  const getStatusLabel = (status) => {
    switch (status) {
      case STATUS_ALL:
        return t("hotelBookings.status.all");
      case STATUS_PENDING:
        return t("hotelBookings.status.pending");
      case STATUS_CONFIRMED:
        return t("hotelBookings.status.confirmed");
      case STATUS_CHECKED_IN:
        return t("hotelBookings.status.checkedIn");
      case STATUS_COMPLETED:
        return t("hotelBookings.status.completed");
      case STATUS_CANCELLED:
        return t("hotelBookings.status.cancelled");
      default:
        return status;
    }
  };

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const res = await api.get("/hotelBooking/hotel");
        setBookings(res.data.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId, nextStatus) => {
    setUpdatingId(bookingId);
    try {
      const res = await api.patch(`/hotelBooking/${bookingId}/status`, { status: nextStatus });
      const updated = res.data.booking;
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? updated : booking)));
      setSnackbar({
        open: true,
        message: t("hotelBookings.messages.statusUpdated"),
        severity: "success",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || t("hotelBookings.messages.statusUpdateFailed");
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const statusMatch = statusFilter === STATUS_ALL || booking.status === statusFilter;
      const touristName = booking.touristId?.name || "";
      const hotelName = booking.hotelId?.name || "";
      const matchesSearch =
        !query ||
        touristName.toLowerCase().includes(query) ||
        hotelName.toLowerCase().includes(query) ||
        booking.roomType?.toLowerCase().includes(query) ||
        String(booking.roomCount || 1).includes(query);
      return statusMatch && matchesSearch;
    });
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = bookings.filter((booking) => (booking.checkIn || "").slice(0, 10) >= today)
      .length;
    const pending = bookings.filter((booking) => booking.status === STATUS_PENDING).length;
    const confirmed = bookings.filter((booking) => booking.status === STATUS_CONFIRMED).length;
    const completed = bookings.filter((booking) => booking.status === STATUS_COMPLETED).length;
    const revenue = bookings
      .filter((booking) => booking.status !== STATUS_CANCELLED)
      .reduce((sum, booking) => sum + (Number(booking.totalAmount) || 0), 0);
    return { total, upcoming, pending, confirmed, completed, revenue };
  }, [bookings]);

  const statCards = [
    {
      label: t("hotelBookings.stats.total"),
      value: stats.total,
      helper: `${filteredBookings.length} shown`,
      tone: "#2563eb",
      icon: CalendarMonthIcon,
    },
    {
      label: t("hotelBookings.stats.upcoming"),
      value: stats.upcoming,
      helper: "Scheduled stays",
      tone: "#0f766e",
      icon: EventAvailableIcon,
    },
    {
      label: t("hotelBookings.status.pending"),
      value: stats.pending,
      helper: "Need action",
      tone: "#d97706",
      icon: PendingActionsIcon,
    },
    {
      label: "Revenue",
      value: formatCurrency(stats.revenue),
      helper: `${stats.completed} completed`,
      tone: "#7c3aed",
      icon: CurrencyRupeeIcon,
    },
  ];

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {t("hotelBookings.header.title")}
          </Typography>
          <Typography color="text.secondary">{t("hotelBookings.header.subtitle")}</Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: 2,
          mb: 2.5,
        }}
      >
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Paper
              key={item.label}
              sx={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 110,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  {item.label}
                </Typography>
                <Typography
                  variant={item.label === "Revenue" ? "h5" : "h4"}
                  sx={{ mt: 0.5, fontWeight: 800, color: "#0f172a" }}
                >
                  {item.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  {item.helper}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: `${item.tone}14`,
                  color: item.tone,
                }}
              >
                <Icon fontSize="small" />
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Paper sx={{ ...cardStyle, mb: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a" }}>
              Booking list
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredBookings.length} of {bookings.length} bookings shown
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
            <TextField
              label={t("hotelBookings.filters.searchLabel")}
              placeholder={t("hotelBookings.filters.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              sx={{ ...inputSx, minWidth: { xs: "100%", sm: 300 } }}
            />
            <TextField
              select
              label={t("hotelBookings.filters.statusLabel")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              size="small"
              sx={{ ...inputSx, minWidth: { xs: "100%", sm: 210 } }}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {getStatusLabel(status)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ ...cardStyle, p: 0, mb: 2.5, overflow: "hidden" }}>
        <Box
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            borderBottom: "1px solid #e5edf5",
            bgcolor: "#fbfdff",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                {t("hotelBookings.header.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review guest stays, room demand, and booking status from one table.
              </Typography>
            </Box>
            <Chip
              label={`${stats.confirmed} confirmed`}
              variant="outlined"
              sx={{
                borderRadius: 1.5,
                fontWeight: 800,
                bgcolor: "#f0fdf4",
                color: "#166534",
                borderColor: "#bbf7d0",
              }}
            />
          </Stack>
        </Box>
        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1.5, p: 2 }}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              {t("hotelBookings.table.loading")}
            </Typography>
          ) : filteredBookings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("hotelBookings.table.noData")}
            </Typography>
          ) : (
            filteredBookings.map((booking) => {
              const roomCount = Math.max(1, Number(booking.roomCount) || 1);
              const nights = getNights(booking.checkIn, booking.checkOut);
              const allowedStatusOptions = getAllowedStatusOptions(booking);
              const isStatusLocked = allowedStatusOptions.length <= 1;
              return (
                <Box
                  key={`mobile-${booking._id}`}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: "#fff",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" mb={1}>
                    <Avatar
                      src={booking.touristId?.avatar || ""}
                      alt={booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                      sx={{ width: 36, height: 36, bgcolor: "#2563eb", fontWeight: 800 }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={800} noWrap>
                        {booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {booking.touristId?.phone || t("hotelBookings.fallback.na")}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(booking.status)}
                      size="small"
                      variant="outlined"
                      sx={{
                        ...(statusChipSx[booking.status] || statusChipSx[STATUS_COMPLETED]),
                        borderRadius: 1.25,
                        fontWeight: 800,
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" fontWeight={700}>
                    {formatDate(booking.checkIn)} {t("hotelBookings.table.to")} {formatDate(booking.checkOut)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {nights} {nights === 1 ? "night" : "nights"} | {booking.roomType || t("hotelBookings.fallback.standard")} x {roomCount}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                    <Typography variant="body2" fontWeight={800}>
                      {formatCurrency(booking.totalAmount)}
                    </Typography>
                    <Select
                      size="small"
                      value={booking.status}
                      onChange={(event) => handleStatusChange(booking._id, event.target.value)}
                      disabled={updatingId === booking._id || isStatusLocked}
                      sx={{
                        minWidth: 138,
                        borderRadius: 1.5,
                        bgcolor: "#fff",
                        "& .MuiSelect-select": { py: 0.75, fontWeight: 700, fontSize: 13.5 },
                      }}
                    >
                      {allowedStatusOptions
                        .map((status) => (
                          <MenuItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </MenuItem>
                        ))}
                    </Select>
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>
        <TableContainer sx={{ overflowX: "auto", display: { xs: "none", md: "block" } }}>
          <Table size="small" sx={{ minWidth: 1060 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.tourist")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.contact")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.stay")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.guests")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.roomDetails")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.status")}</TableCell>
                <TableCell sx={tableHeadCellSx}>{t("hotelBookings.table.created")}</TableCell>
                <TableCell align="right" sx={tableHeadCellSx}>{t("hotelBookings.table.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    {t("hotelBookings.table.loading")}
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    {t("hotelBookings.table.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const roomCount = Math.max(1, Number(booking.roomCount) || 1);
                  const nights = getNights(booking.checkIn, booking.checkOut);
                  const allowedStatusOptions = getAllowedStatusOptions(booking);
                  const isStatusLocked = allowedStatusOptions.length <= 1;
                  return (
                    <TableRow
                      key={booking._id}
                      sx={{
                        "&:hover": { bgcolor: "#f8fafc" },
                        "& td": {
                          py: 1.5,
                          borderBottom: "1px solid #eef2f7",
                          color: "#0f172a",
                        },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            src={booking.touristId?.avatar || ""}
                            alt={booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                            sx={{ width: 40, height: 40, bgcolor: "#2563eb", fontWeight: 800 }}
                          />
                          <Box>
                            <Typography variant="body2" fontWeight={800}>
                              {booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.touristId?.email || ""}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {booking.touristId?.phone || t("hotelBookings.fallback.na")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <CalendarMonthIcon fontSize="small" sx={{ mt: 0.25, color: "#64748b" }} />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {formatDate(booking.checkIn)} {t("hotelBookings.table.to")} {formatDate(booking.checkOut)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {nights} {nights === 1 ? "night" : "nights"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PeopleIcon fontSize="small" sx={{ color: "#64748b" }} />
                          <Typography variant="body2" fontWeight={700}>
                            {booking.guests || 1}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={800}>
                          {booking.roomType || t("hotelBookings.fallback.standard")} x {roomCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(booking.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(booking.status)}
                          size="small"
                          variant="outlined"
                          sx={{
                            ...(statusChipSx[booking.status] || statusChipSx[STATUS_COMPLETED]),
                            borderRadius: 1.25,
                            fontWeight: 800,
                            minWidth: 96,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {formatDate(booking.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Select
                          size="small"
                          value={booking.status}
                          onChange={(event) => handleStatusChange(booking._id, event.target.value)}
                          disabled={updatingId === booking._id || isStatusLocked}
                          sx={{
                            minWidth: 155,
                            textAlign: "left",
                            borderRadius: 1.5,
                            bgcolor: "#fff",
                            "& .MuiSelect-select": { py: 0.85, fontWeight: 700 },
                          }}
                        >
                          {allowedStatusOptions
                            .map((status) => (
                              <MenuItem key={status} value={status}>
                                {getStatusLabel(status)}
                              </MenuItem>
                            ))}
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
