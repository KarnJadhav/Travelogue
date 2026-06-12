import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";

const TAB_IDS = [
  "general",
  "pricing",
  "booking",
  "notifications",
  "staff",
  "security",
  "payments",
  "appearance",
];

const STAFF_ROLE_MANAGER = "Manager";
const STAFF_ROLE_RECEPTIONIST = "Receptionist";
const STAFF_ROLE_HOUSEKEEPING = "Housekeeping";
const STAFF_STATUS_ACTIVE = "Active";
const STAFF_STATUS_INACTIVE = "Inactive";
const TX_STATUS_COMPLETED = "Completed";
const TX_STATUS_PENDING = "Pending";

const cardStyle = {
  p: 3,
  borderRadius: 3,
  boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const STORAGE_KEY = "travelogue_hotel_settings";

const initialGeneral = {
  hotelName: "Travelogue Grand",
  description: "A refined boutique stay with modern comforts.",
  email: "info@traveloguegrand.com",
  phone: "+1 (305) 555-0123",
  address: "128 Ocean Drive",
  city: "Miami",
  country: "USA",
  checkIn: "14:00",
  checkOut: "11:00",
  currency: "INR",
  logo: null,
};

const initialPricing = {
  defaultPrice: 180,
  weekendMultiplier: 1.2,
  festivalMultiplier: 1.35,
  tax: 12,
  serviceCharge: 5,
  dynamicPricing: true,
  autoIncrease: true,
  autoDecrease: false,
};

const initialBookingRules = {
  instantBooking: true,
  minStay: 1,
  maxStay: 14,
  freeCancellationHours: 24,
  refundPercentage: 80,
};

const initialNotifications = {
  email: true,
  sms: false,
  push: true,
  newBooking: true,
  cancellation: true,
  newReview: true,
  lowOccupancy: true,
};

const initialSecurity = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  twoFactor: true,
};

const initialPayments = {
  method: "Stripe",
  commission: 12,
  apiKey: "sk_test_************************",
};

const initialAppearance = {
  darkMode: false,
  primaryColor: "#3b82f6",
  layout: "comfortable",
};

const initialStaff = [
  {
    name: "Amelia Stone",
    email: "amelia@travelogue.com",
    role: STAFF_ROLE_MANAGER,
    status: STAFF_STATUS_ACTIVE,
  },
  {
    name: "Jayden Ross",
    email: "jayden@travelogue.com",
    role: STAFF_ROLE_RECEPTIONIST,
    status: STAFF_STATUS_ACTIVE,
  },
  {
    name: "Maya Chen",
    email: "maya@travelogue.com",
    role: STAFF_ROLE_HOUSEKEEPING,
    status: STAFF_STATUS_INACTIVE,
  },
];

const loginActivity = [
  { device: "MacBook Pro", locationKey: "miamiUsa", timeKey: "twoHoursAgo" },
  { device: "iPhone 15", locationKey: "newYorkUsa", timeKey: "yesterday" },
  { device: "iPad Air", locationKey: "chicagoUsa", timeKey: "threeDaysAgo" },
];

const transactions = [
  { id: "TX-2031", date: "2026-02-12", amount: 1240, status: TX_STATUS_COMPLETED },
  { id: "TX-2032", date: "2026-02-14", amount: 980, status: TX_STATUS_PENDING },
  { id: "TX-2033", date: "2026-02-18", amount: 1520, status: TX_STATUS_COMPLETED },
];

const mergeSettings = (stored) => {
  if (!stored) {
    return {
      general: initialGeneral,
      pricing: initialPricing,
      bookingRules: initialBookingRules,
      notifications: initialNotifications,
      security: initialSecurity,
      payments: initialPayments,
      appearance: initialAppearance,
      staff: initialStaff,
    };
  }

  const security = { ...initialSecurity, ...(stored.security || {}) };
  security.currentPassword = "";
  security.newPassword = "";
  security.confirmPassword = "";

  return {
    general: { ...initialGeneral, ...(stored.general || {}) },
    pricing: { ...initialPricing, ...(stored.pricing || {}) },
    bookingRules: { ...initialBookingRules, ...(stored.bookingRules || {}) },
    notifications: { ...initialNotifications, ...(stored.notifications || {}) },
    security,
    payments: { ...initialPayments, ...(stored.payments || {}) },
    appearance: { ...initialAppearance, ...(stored.appearance || {}) },
    staff: Array.isArray(stored.staff) ? stored.staff : initialStaff,
  };
};

const getStoredSettings = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getLocale = (language) => {
  if (language?.startsWith("hi")) return "hi-IN";
  if (language?.startsWith("mr")) return "mr-IN";
  return "en-IN";
};

const formatCurrency = (amount, language) =>
  new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

function StickyActions({ onSave, onCancel, saveLabel, cancelLabel }) {
  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        pt: 2,
        mt: 3,
        borderTop: "1px solid #e2e8f0",
        bgcolor: "#fff",
        display: "flex",
        justifyContent: "flex-end",
        gap: 1.5,
        zIndex: 1,
      }}
    >
      <Button variant="outlined" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant="contained" onClick={onSave}>
        {saveLabel}
      </Button>
    </Box>
  );
}

export default function HotelSettings({ showHeader = true }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const initialSettings = useMemo(() => mergeSettings(getStoredSettings()), []);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [general, setGeneral] = useState(initialSettings.general);
  const [pricing, setPricing] = useState(initialSettings.pricing);
  const [bookingRules, setBookingRules] = useState(initialSettings.bookingRules);
  const [notifications, setNotifications] = useState(initialSettings.notifications);
  const [security, setSecurity] = useState(initialSettings.security);
  const [payments, setPayments] = useState(initialSettings.payments);
  const [appearance, setAppearance] = useState(initialSettings.appearance);
  const [staff, setStaff] = useState(initialSettings.staff);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaffIndex, setEditingStaffIndex] = useState(-1);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    role: STAFF_ROLE_RECEPTIONIST,
    status: STAFF_STATUS_ACTIVE,
  });

  const roleOptions = [STAFF_ROLE_MANAGER, STAFF_ROLE_RECEPTIONIST, STAFF_ROLE_HOUSEKEEPING];
  const statusOptions = [STAFF_STATUS_ACTIVE, STAFF_STATUS_INACTIVE];
  const paymentMethods = ["Stripe", "Razorpay", "PayPal"];
  const menuItems = TAB_IDS.map((id) => ({ id, label: t(`hotelSettings.menu.${id}`) }));

  const getRoleLabel = (role) => {
    switch (role) {
      case STAFF_ROLE_MANAGER:
        return t("hotelSettings.staff.roles.manager");
      case STAFF_ROLE_RECEPTIONIST:
        return t("hotelSettings.staff.roles.receptionist");
      case STAFF_ROLE_HOUSEKEEPING:
        return t("hotelSettings.staff.roles.housekeeping");
      default:
        return role;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case STAFF_STATUS_ACTIVE:
        return t("hotelSettings.staff.status.active");
      case STAFF_STATUS_INACTIVE:
        return t("hotelSettings.staff.status.inactive");
      default:
        return status;
    }
  };

  const getTransactionStatusLabel = (status) => {
    switch (status) {
      case TX_STATUS_COMPLETED:
        return t("hotelSettings.payments.transactionStatus.completed");
      case TX_STATUS_PENDING:
        return t("hotelSettings.payments.transactionStatus.pending");
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "Stripe":
        return t("hotelSettings.payments.methods.stripe");
      case "Razorpay":
        return t("hotelSettings.payments.methods.razorpay");
      case "PayPal":
        return t("hotelSettings.payments.methods.paypal");
      default:
        return method;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTab = localStorage.getItem("hotel_settings_active_tab");
      if (storedTab && TAB_IDS.includes(storedTab)) {
        setActiveTab(storedTab);
      }
      localStorage.removeItem("hotel_settings_active_tab");
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSave = () => {
    const storedGeneral = {
      ...general,
      logo: typeof general.logo === "string" ? general.logo : general.logo?.name ?? null,
    };
    const nextSettings = {
      general: storedGeneral,
      pricing,
      bookingRules,
      notifications,
      security: {
        ...security,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
      payments,
      appearance,
      staff,
    };
    setSavedSettings(nextSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    } catch {
      // ignore storage errors
    }
    setSecurity((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const handleCancel = () => {
    setGeneral(savedSettings.general);
    setPricing(savedSettings.pricing);
    setBookingRules(savedSettings.bookingRules);
    setNotifications(savedSettings.notifications);
    setSecurity(savedSettings.security);
    setPayments(savedSettings.payments);
    setAppearance(savedSettings.appearance);
    setStaff(savedSettings.staff);
  };

  const openStaffModal = (index = -1) => {
    setEditingStaffIndex(index);
    if (index >= 0) {
      setStaffForm(staff[index]);
    } else {
      setStaffForm({
        name: "",
        email: "",
        role: STAFF_ROLE_RECEPTIONIST,
        status: STAFF_STATUS_ACTIVE,
      });
    }
    setStaffDialogOpen(true);
  };

  const handleStaffSave = () => {
    if (editingStaffIndex >= 0) {
      const updated = [...staff];
      updated[editingStaffIndex] = staffForm;
      setStaff(updated);
    } else {
      setStaff([...staff, staffForm]);
    }
    setStaffDialogOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <Paper sx={cardStyle}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.hotelName")}
                  value={general.hotelName}
                  onChange={(event) => setGeneral({ ...general, hotelName: event.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.description")}
                  multiline
                  minRows={3}
                  value={general.description}
                  onChange={(event) => setGeneral({ ...general, description: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.contactEmail")}
                  value={general.email}
                  onChange={(event) => setGeneral({ ...general, email: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.phoneNumber")}
                  value={general.phone}
                  onChange={(event) => setGeneral({ ...general, phone: event.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.address")}
                  value={general.address}
                  onChange={(event) => setGeneral({ ...general, address: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.city")}
                  value={general.city}
                  onChange={(event) => setGeneral({ ...general, city: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.country")}
                  value={general.country}
                  onChange={(event) => setGeneral({ ...general, country: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.checkIn")}
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={general.checkIn}
                  onChange={(event) => setGeneral({ ...general, checkIn: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.general.fields.checkOut")}
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={general.checkOut}
                  onChange={(event) => setGeneral({ ...general, checkOut: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t("hotelSettings.general.fields.currency")}</InputLabel>
                  <Select
                    label={t("hotelSettings.general.fields.currency")}
                    value={general.currency}
                    onChange={(event) => setGeneral({ ...general, currency: event.target.value })}
                    disabled
                  >
                    {[
                      "INR",
                    ].map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography fontWeight={600}>{t("hotelSettings.general.logo.uploadLabel")}</Typography>
                  <Button component="label" variant="outlined">
                    {t("hotelSettings.general.logo.uploadButton")}
                    <input
                      hidden
                      type="file"
                      onChange={(event) =>
                        setGeneral({ ...general, logo: event.target.files?.[0] ?? null })
                      }
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {typeof general.logo === "string"
                      ? general.logo
                      : general.logo
                        ? general.logo.name
                        : t("hotelSettings.general.logo.noFileSelected")}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "pricing":
        return (
          <Paper sx={cardStyle}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.pricing.fields.defaultRoomPrice")}
                  value={pricing.defaultPrice}
                  onChange={(event) => setPricing({ ...pricing, defaultPrice: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.pricing.fields.weekendMultiplier")}
                  value={pricing.weekendMultiplier}
                  onChange={(event) => setPricing({ ...pricing, weekendMultiplier: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.pricing.fields.festivalMultiplier")}
                  value={pricing.festivalMultiplier}
                  onChange={(event) => setPricing({ ...pricing, festivalMultiplier: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.pricing.fields.taxPercentage")}
                  value={pricing.tax}
                  onChange={(event) => setPricing({ ...pricing, tax: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.pricing.fields.serviceCharge")}
                  value={pricing.serviceCharge}
                  onChange={(event) => setPricing({ ...pricing, serviceCharge: event.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pricing.dynamicPricing}
                        onChange={(event) => setPricing({ ...pricing, dynamicPricing: event.target.checked })}
                      />
                    }
                    label={t("hotelSettings.pricing.switches.dynamicPricing")}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pricing.autoIncrease}
                        onChange={(event) => setPricing({ ...pricing, autoIncrease: event.target.checked })}
                      />
                    }
                    label={t("hotelSettings.pricing.switches.autoIncrease")}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pricing.autoDecrease}
                        onChange={(event) => setPricing({ ...pricing, autoDecrease: event.target.checked })}
                      />
                    }
                    label={t("hotelSettings.pricing.switches.autoDecrease")}
                  />
                </Stack>
              </Grid>
            </Grid>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "booking":
        return (
          <Paper sx={cardStyle}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={bookingRules.instantBooking}
                      onChange={(event) => setBookingRules({ ...bookingRules, instantBooking: event.target.checked })}
                    />
                  }
                  label={t("hotelSettings.booking.switches.instantBooking")}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.booking.fields.minStay")}
                  type="number"
                  value={bookingRules.minStay}
                  onChange={(event) => setBookingRules({ ...bookingRules, minStay: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.booking.fields.maxStay")}
                  type="number"
                  value={bookingRules.maxStay}
                  onChange={(event) => setBookingRules({ ...bookingRules, maxStay: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.booking.fields.freeCancellationHours")}
                  type="number"
                  value={bookingRules.freeCancellationHours}
                  onChange={(event) => setBookingRules({ ...bookingRules, freeCancellationHours: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.booking.fields.refundPercentage")}
                  type="number"
                  value={bookingRules.refundPercentage}
                  onChange={(event) => setBookingRules({ ...bookingRules, refundPercentage: event.target.value })}
                />
              </Grid>
            </Grid>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "notifications":
        return (
          <Paper sx={cardStyle}>
            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email}
                    onChange={(event) => setNotifications({ ...notifications, email: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.email")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.sms}
                    onChange={(event) => setNotifications({ ...notifications, sms: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.sms")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.push}
                    onChange={(event) => setNotifications({ ...notifications, push: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.push")}
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.newBooking}
                    onChange={(event) => setNotifications({ ...notifications, newBooking: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.newBooking")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.cancellation}
                    onChange={(event) => setNotifications({ ...notifications, cancellation: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.cancellation")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.newReview}
                    onChange={(event) => setNotifications({ ...notifications, newReview: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.newReview")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.lowOccupancy}
                    onChange={(event) => setNotifications({ ...notifications, lowOccupancy: event.target.checked })}
                  />
                }
                label={t("hotelSettings.notifications.switches.lowOccupancy")}
              />
            </Stack>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "staff":
        return (
          <Paper sx={cardStyle}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                {t("hotelSettings.staff.title")}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openStaffModal()}>
                {t("hotelSettings.actions.addStaff")}
              </Button>
            </Stack>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.staff.table.name")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.staff.table.email")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.staff.table.role")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.staff.table.status")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.staff.table.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.map((member, index) => (
                  <TableRow key={member.email}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleLabel(member.role)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(member.status)}
                        color={member.status === STAFF_STATUS_ACTIVE ? "success" : "default"}
                        variant={member.status === STAFF_STATUS_ACTIVE ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        aria-label={t("hotelSettings.actions.editStaff")}
                        onClick={() => openStaffModal(index)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => setStaff(staff.filter((_, idx) => idx !== index))}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>
                {editingStaffIndex >= 0 ? t("hotelSettings.staff.dialog.editTitle") : t("hotelSettings.staff.dialog.addTitle")}
              </DialogTitle>
              <DialogContent>
                <Stack spacing={2} mt={1}>
                  <TextField
                    label={t("hotelSettings.staff.fields.name")}
                    value={staffForm.name}
                    onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })}
                    fullWidth
                  />
                  <TextField
                    label={t("hotelSettings.staff.fields.email")}
                    value={staffForm.email}
                    onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>{t("hotelSettings.staff.fields.role")}</InputLabel>
                    <Select
                      label={t("hotelSettings.staff.fields.role")}
                      value={staffForm.role}
                      onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}
                    >
                      {roleOptions.map((role) => (
                        <MenuItem key={role} value={role}>
                          {getRoleLabel(role)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>{t("hotelSettings.staff.fields.status")}</InputLabel>
                    <Select
                      label={t("hotelSettings.staff.fields.status")}
                      value={staffForm.status}
                      onChange={(event) => setStaffForm({ ...staffForm, status: event.target.value })}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setStaffDialogOpen(false)}>{t("hotelSettings.actions.cancel")}</Button>
                <Button variant="contained" onClick={handleStaffSave}>{t("hotelSettings.actions.save")}</Button>
              </DialogActions>
            </Dialog>
          </Paper>
        );
      case "security":
        return (
          <Paper sx={cardStyle}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.security.fields.currentPassword")}
                  type="password"
                  value={security.currentPassword}
                  onChange={(event) => setSecurity({ ...security, currentPassword: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.security.fields.newPassword")}
                  type="password"
                  value={security.newPassword}
                  onChange={(event) => setSecurity({ ...security, newPassword: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.security.fields.confirmPassword")}
                  type="password"
                  value={security.confirmPassword}
                  onChange={(event) => setSecurity({ ...security, confirmPassword: event.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={security.twoFactor} onChange={(event) => setSecurity({ ...security, twoFactor: event.target.checked })} />}
                  label={t("hotelSettings.security.switches.twoFactor")}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  {t("hotelSettings.security.loginActivityTitle")}
                </Typography>
                <Stack spacing={1.2}>
                  {loginActivity.map((item) => (
                    <Box
                      key={item.device}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography fontWeight={600}>{item.device}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(`hotelSettings.security.location.${item.locationKey}`)} - {t(`hotelSettings.security.time.${item.timeKey}`)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" color="error">
                  {t("hotelSettings.security.logoutAllDevices")}
                </Button>
              </Grid>
            </Grid>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "payments":
        return (
          <Paper sx={cardStyle}>
            <Grid container spacing={2.5} mb={2.5}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t("hotelSettings.payments.fields.method")}</InputLabel>
                  <Select
                    label={t("hotelSettings.payments.fields.method")}
                    value={payments.method}
                    onChange={(event) => setPayments({ ...payments, method: event.target.value })}
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>
                        {getPaymentMethodLabel(method)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.payments.fields.commission")}
                  value={payments.commission}
                  onChange={(event) => setPayments({ ...payments, commission: event.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("hotelSettings.payments.fields.apiKey")}
                  value={payments.apiKey}
                  onChange={(event) => setPayments({ ...payments, apiKey: event.target.value })}
                />
              </Grid>
            </Grid>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              {t("hotelSettings.payments.transactionHistoryTitle")}
            </Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.payments.table.transactionId")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.payments.table.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.payments.table.amount")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("hotelSettings.payments.table.status")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{formatCurrency(row.amount, i18n.resolvedLanguage)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTransactionStatusLabel(row.status)}
                        color={row.status === TX_STATUS_COMPLETED ? "success" : "warning"}
                        variant={row.status === TX_STATUS_COMPLETED ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      case "appearance":
        return (
          <Paper sx={cardStyle}>
            <Stack spacing={2.5}>
              <FormControlLabel
                control={<Switch checked={appearance.darkMode} onChange={(event) => setAppearance({ ...appearance, darkMode: event.target.checked })} />}
                label={t("hotelSettings.appearance.switches.darkMode")}
              />
              <TextField
                label={t("hotelSettings.appearance.fields.primaryColor")}
                type="color"
                value={appearance.primaryColor}
                onChange={(event) => setAppearance({ ...appearance, primaryColor: event.target.value })}
                sx={{ width: 200 }}
                InputLabelProps={{ shrink: true }}
              />
              <Box>
                <Typography fontWeight={600} mb={1}>
                  {t("hotelSettings.appearance.layout.title")}
                </Typography>
                <ToggleButtonGroup
                  value={appearance.layout}
                  exclusive
                  onChange={(_, value) => value && setAppearance({ ...appearance, layout: value })}
                >
                  <ToggleButton value="compact">{t("hotelSettings.appearance.layout.compact")}</ToggleButton>
                  <ToggleButton value="comfortable">{t("hotelSettings.appearance.layout.comfortable")}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
            <StickyActions
              onSave={handleSave}
              onCancel={handleCancel}
              saveLabel={t("hotelSettings.actions.saveChanges")}
              cancelLabel={t("hotelSettings.actions.cancel")}
            />
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {t("hotelSettings.header.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("hotelSettings.header.subtitle")}
          </Typography>
        </Box>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("hotelSettings.info.saveReminder")}
      </Alert>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        <Paper
          sx={{
            width: { xs: "100%", md: 250 },
            flexShrink: 0,
            p: 2,
            borderRadius: 3,
            boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
            bgcolor: "#fff",
          }}
        >
          <List sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                sx={{
                  borderRadius: 2,
                  "&.Mui-selected": {
                    bgcolor: "rgba(59,130,246,0.12)",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  },
                  "&.Mui-selected:hover": {
                    bgcolor: "rgba(59,130,246,0.16)",
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
