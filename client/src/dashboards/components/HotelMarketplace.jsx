import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HotelIcon from "@mui/icons-material/Hotel";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import api from "../../api";

const mockHotels = [
  {
    _id: "h1",
    user: "u1",
    ownerName: "Pranav",
    ownerEmail: "pranav@travelogue.com",
    ownerPhone: "+1 555 0112",
    name: "Travelogue Grand",
    email: "contact@traveloguegrand.com",
    phone: "+1 555 0123",
    address: "128 Ocean Drive, Miami",
    amenities: ["Wi-Fi", "Pool", "Breakfast"],
    images: [],
    updatedAt: new Date().toISOString(),
  },
];

const cardStyle = {
  p: 3,
  borderRadius: 3,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const getStorageKey = (userId) => `tourist_hotel_bookings_${userId || "guest"}`;

export default function HotelMarketplace({ user }) {
  const [hotels, setHotels] = useState([]);
  const [reviewsByHotel, setReviewsByHotel] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: 2,
    roomType: "Standard",
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  const [bookings, setBookings] = useState(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(user?._id));
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey(user?._id), JSON.stringify(bookings));
  }, [bookings, user?._id]);

  useEffect(() => {
    const loadHotels = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/hotel/list");
        const hotelList = data.hotels || [];
        setHotels(hotelList.length ? hotelList : mockHotels);
      } catch (error) {
        setHotels(mockHotels);
      } finally {
        setLoading(false);
      }
    };

    loadHotels();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      if (hotels.length === 0) return;
      const reviewMap = {};
      await Promise.all(
        hotels.map(async (hotel) => {
          if (!hotel.user) return;
          try {
            const response = await api.get(`/review/guide/${hotel.user}/reviews`);
            reviewMap[hotel._id] = response.data.reviews || [];
          } catch (error) {
            reviewMap[hotel._id] = [];
          }
        })
      );
      setReviewsByHotel(reviewMap);
    };
    loadReviews();
  }, [hotels]);

  const bookingCount = bookings.length;

  const averageRating = (hotelId) => {
    const reviews = reviewsByHotel[hotelId] || [];
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Number((total / reviews.length).toFixed(1));
  };

  const openBookingDialog = (hotel) => {
    setSelectedHotel(hotel);
    setBookingDialogOpen(true);
  };

  const handleBookingSubmit = () => {
    if (!selectedHotel) return;
    const newBooking = {
      id: `HB-${Date.now()}`,
      hotelId: selectedHotel._id,
      hotelName: selectedHotel.name,
      ownerName: selectedHotel.ownerName,
      contact: selectedHotel.phone || selectedHotel.ownerPhone,
      status: "Pending",
      createdAt: new Date().toISOString(),
      ...bookingForm,
    };
    setBookings((prev) => [newBooking, ...prev]);
    setBookingDialogOpen(false);
  };

  const openReviewDialog = (hotel) => {
    setSelectedHotel(hotel);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedHotel) return;
    const payload = {
      guideId: selectedHotel.user,
      place: selectedHotel.name,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    };

    try {
      await api.post("/review", payload);
    } catch (error) {
      // Fallback to local review if API fails.
      setReviewsByHotel((prev) => {
        const existing = prev[selectedHotel._id] || [];
        return {
          ...prev,
          [selectedHotel._id]: [
            { rating: payload.rating, comment: payload.comment, userId: { name: user?.name || "You" } },
            ...existing,
          ],
        };
      });
    }

    setReviewDialogOpen(false);
    setReviewForm({ rating: 5, comment: "" });
  };

  const bookingCards = useMemo(() => bookings.slice(0, 3), [bookings]);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <HotelIcon sx={{ color: "primary.main" }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Hotels & Booking
          </Typography>
          <Typography color="text.secondary">
            Browse verified hotels, contact owners, and submit reviews.
          </Typography>
        </Box>
        <Chip label={`${bookingCount} active bookings`} sx={{ ml: "auto" }} />
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        {loading && (
          <Grid item xs={12}>
            <Typography color="text.secondary">Loading hotels...</Typography>
          </Grid>
        )}
        {!loading && hotels.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">No hotels available.</Typography>
          </Grid>
        )}
        {hotels.map((hotel) => (
          <Grid item xs={12} md={6} lg={4} key={hotel._id}>
            <Paper sx={cardStyle}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {hotel.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hotel.address || "Address not provided"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "primary.light" }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={600}>{hotel.ownerName || "Owner"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Owner
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon fontSize="small" color="primary" />
                    <Typography variant="body2">{hotel.phone || hotel.ownerPhone || "N/A"}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon fontSize="small" color="primary" />
                    <Typography variant="body2">{hotel.email || hotel.ownerEmail || "N/A"}</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(hotel.amenities || []).slice(0, 4).map((amenity) => (
                    <Chip key={amenity} label={amenity} size="small" />
                  ))}
                </Stack>
                <Box>
                  <Rating value={averageRating(hotel._id)} precision={0.1} readOnly />
                  <Typography variant="caption" color="text.secondary">
                    {averageRating(hotel._id)} average rating
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={() => openBookingDialog(hotel)}>
                    Book Now
                  </Button>
                  <Button variant="outlined" onClick={() => openReviewDialog(hotel)}>
                    Add Review
                  </Button>
                </Stack>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Latest Reviews
                  </Typography>
                  {(reviewsByHotel[hotel._id] || []).slice(0, 2).map((review, idx) => (
                    <Box key={`${hotel._id}-review-${idx}`} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {review.comment || "Great stay experience."}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {review.userId?.name || "Tourist"} - {review.rating} stars
                      </Typography>
                    </Box>
                  ))}
                  {(reviewsByHotel[hotel._id] || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No reviews yet.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={cardStyle}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          My Hotel Bookings
        </Typography>
        {bookingCards.length === 0 && (
          <Typography color="text.secondary">No hotel bookings yet.</Typography>
        )}
        <Stack spacing={1.5}>
          {bookingCards.map((booking) => (
            <Paper
              key={booking.id}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                boxShadow: "none",
                border: "1px solid #e2e8f0",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography fontWeight={700}>{booking.hotelName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check-in {booking.checkIn || "--"} - Check-out {booking.checkOut || "--"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Room: {booking.roomType} · Guests: {booking.guests}
                  </Typography>
                </Box>
                <Stack spacing={1} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                  <Chip label={booking.status} color={booking.status === "Confirmed" ? "success" : "warning"} />
                  <Button size="small" variant="outlined" onClick={() => openReviewDialog({ ...selectedHotel, _id: booking.hotelId, name: booking.hotelName })}>
                    Leave Review
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book {selectedHotel?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Check-in Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={bookingForm.checkIn}
              onChange={(event) => setBookingForm({ ...bookingForm, checkIn: event.target.value })}
            />
            <TextField
              label="Check-out Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={bookingForm.checkOut}
              onChange={(event) => setBookingForm({ ...bookingForm, checkOut: event.target.value })}
            />
            <TextField
              label="Guests"
              type="number"
              value={bookingForm.guests}
              onChange={(event) => setBookingForm({ ...bookingForm, guests: event.target.value })}
            />
            <Select
              value={bookingForm.roomType}
              onChange={(event) => setBookingForm({ ...bookingForm, roomType: event.target.value })}
            >
              {["Standard", "Deluxe", "Suite", "Executive"].map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBookingSubmit}>
            Confirm Booking
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave a Review</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Rating
              value={reviewForm.rating}
              onChange={(event, value) => setReviewForm({ ...reviewForm, rating: value || 0 })}
            />
            <TextField
              label="Comment"
              multiline
              minRows={3}
              value={reviewForm.comment}
              onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReviewSubmit}>
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
