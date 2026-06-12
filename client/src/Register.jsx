import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import HotelIcon from "@mui/icons-material/Hotel";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import styles from "./Auth.module.scss";

const roles = [
  {
    value: "tourist",
    label: "Tourist",
    icon: <PersonIcon fontSize="small" />,
  },
  {
    value: "guide",
    label: "Guide",
    icon: <RoomIcon fontSize="small" />,
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: <HotelIcon fontSize="small" />,
  },
];

const hotelTypes = ["Resort", "Lodge", "Hostel", "Business hotel", "Guest house", "Apartment", "Homestay", "Other"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_MIN_LENGTH = 6;
const IDENTITY_PROOF_MAX_SIZE = 8 * 1024 * 1024;
const IDENTITY_PROOF_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const IDENTITY_PROOF_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];

const normalizePhoneNumber = (phone) => String(phone || "").replace(/\D/g, "");
const normalizeAmenities = (value) =>
  String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const validateIdentityProof = (file) => {
  if (!file) return "Upload identity proof as a PDF or image.";

  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = IDENTITY_PROOF_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension)
  );

  if (!IDENTITY_PROOF_TYPES.has(file.type) && !hasAllowedExtension) {
    return "Identity proof must be a PDF or image file.";
  }

  if (file.size > IDENTITY_PROOF_MAX_SIZE) {
    return "Identity proof must be 8 MB or smaller.";
  }

  return "";
};

export default function Register() {
  const [selectedRole, setSelectedRole] = useState(roles[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    interests: "",
    hotelName: "",
    hotelAddress: "",
    cityState: "",
    hotelType: "",
    amenities: "",
    bio: "",
    experienceYears: "",
    languages: "",
    identityProof: null,
  });

  const handleRole = (event, newRole) => {
    if (newRole === null) return;
    setSelectedRole(newRole);
    if (newRole !== "tourist" && form.interests) {
      setForm((prev) => ({ ...prev, interests: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "phone" ? normalizePhoneNumber(value).slice(0, 10) : value;
    setForm({ ...form, [name]: nextValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleIdentityProofChange = (e) => {
    const file = e.target.files?.[0] || null;
    const fileError = file ? validateIdentityProof(file) : "";

    setForm({ ...form, identityProof: file });
    setErrors({
      ...errors,
      identityProof: fileError,
    });
  };

  const showToast = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const validateForm = () => {
    const nextErrors = {};
    const email = form.email.trim();
    const phone = normalizePhoneNumber(form.phone);

    if (!form.name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Mobile number is required.";
    } else if (!PHONE_REGEX.test(phone)) {
      nextErrors.phone = "Enter a 10-digit mobile number.";
    }

    if (selectedRole === "guide") {
      if (!form.bio.trim()) {
        nextErrors.bio = "Bio is required for guide accounts.";
      }
      if (form.experienceYears === "" || Number(form.experienceYears) < 0) {
        nextErrors.experienceYears = "Enter valid years of experience.";
      }
      if (!form.languages.trim()) {
        nextErrors.languages = "Enter at least one language.";
      }
      const identityProofError = validateIdentityProof(form.identityProof);
      if (identityProofError) {
        nextErrors.identityProof = identityProofError;
      }
    }

    if (selectedRole === "hotel") {
      if (!form.hotelName.trim()) {
        nextErrors.hotelName = "Hotel name is required.";
      }
      if (!form.hotelAddress.trim()) {
        nextErrors.hotelAddress = "Hotel address is required.";
      }
      if (!form.cityState.trim()) {
        nextErrors.cityState = "City/state is required.";
      }
      if (!form.hotelType.trim()) {
        nextErrors.hotelType = "Select a hotel type.";
      }
      if (normalizeAmenities(form.amenities).length === 0) {
        nextErrors.amenities = "Enter at least one amenity.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: normalizePhoneNumber(form.phone),
        role: selectedRole,
      };
      if (selectedRole === "tourist") {
        payload.interests = form.interests.trim();
      }
      if (selectedRole === "hotel") {
        payload.hotelName = form.hotelName.trim();
        payload.hotelAddress = form.hotelAddress.trim();
        payload.cityState = form.cityState.trim();
        payload.hotelType = form.hotelType;
        payload.amenities = normalizeAmenities(form.amenities);
      }
      if (selectedRole === "guide") {
        const submitData = new FormData();
        Object.entries({
          ...payload,
          bio: form.bio.trim(),
          experienceYears: form.experienceYears,
          languages: form.languages.trim(),
        }).forEach(([key, value]) => submitData.append(key, value));
        submitData.append("identityProof", form.identityProof);
        await api.post("/register", submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/register", payload);
      }
      showToast("success", "Account created successfully. Redirecting to sign in...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const apiError = err.response?.data?.error;
      showToast(
        "error",
        apiMessage === "Registration failed" && apiError
          ? apiError
          : apiMessage || err.message || "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={`${styles.authShell} ${styles.registerShell}`}>
      <Box className={styles.authFrame}>
        <Box className={`${styles.brandPanel} ${styles.registerBrandPanel}`}>
          <Box className={styles.brandBadge}>
            <TravelExploreIcon fontSize="small" />
            Travelogue
          </Box>
          <Typography component="h1" className={styles.brandTitle}>
            Create your Travelogue account
          </Typography>
          <Typography className={styles.brandSub}>
            Join and start in minutes.
          </Typography>
          <Box className={styles.registerPills}>
            <Typography className={styles.registerPill}>Fast signup</Typography>
            <Typography className={styles.registerPill}>Secure access</Typography>
            <Typography className={styles.registerPill}>Tourist, Guide, Hotel</Typography>
          </Box>
        </Box>

        <Box className={`${styles.formPanel} ${styles.registerFormPanel}`}>
          <Link to="/" className={styles.backLink}>
            <ArrowBackRoundedIcon fontSize="small" />
            Back to Home
          </Link>

          <Box className={`${styles.formCard} ${styles.registerCard}`}>
            <Box className={styles.formHeader}>
              <Box className={styles.iconHalo}>
                <PersonIcon />
              </Box>
              <Typography component="h2" className={styles.formTitle}>
                Create Account
              </Typography>
              <Typography className={styles.formSubtitle}>
                Set up your account details.
              </Typography>
            </Box>
            <Typography className={styles.sectionLabel}>Choose role</Typography>
            <Typography className={styles.securityNotice}>
              Admin signup is disabled. Admin access is provided only by the system.
            </Typography>
            <ToggleButtonGroup
              value={selectedRole}
              exclusive
              onChange={handleRole}
              className={styles.roleGroup}
              sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              {roles.map((role) => (
                <ToggleButton
                  key={role.value}
                  value={role.value}
                  className={styles.roleBtn}
                >
                  <Box className={styles.roleInner}>
                    {role.icon}
                    <Typography className={styles.roleLabel}>{role.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <form
              onSubmit={handleSubmit}
              className={`${styles.form} ${styles.registerForm} ${
                selectedRole === "guide"
                  ? styles.guideRegisterForm
                  : styles.basicRegisterForm
              }`}
            >
              <Box className={`${styles.formGrid} ${styles.registerGrid}`}>
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={styles.formField}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                />
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  className={styles.formField}
                  error={Boolean(errors.email)}
                  helperText={errors.email}
                />
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  className={styles.formField}
                  error={Boolean(errors.password)}
                  helperText={errors.password || `Minimum ${PASSWORD_MIN_LENGTH} characters`}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <VisibilityOffOutlinedIcon />
                          ) : (
                            <VisibilityOutlinedIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Confirm password"
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={styles.formField}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword}
                />
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Mobile number"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={styles.formField}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone || "Enter exactly 10 digits"}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]{10}",
                    maxLength: 10,
                  }}
                />
                {selectedRole === "tourist" && (
                  <TextField
                    size="small"
                    fullWidth
                    label="Interests"
                    name="interests"
                    value={form.interests}
                    onChange={handleChange}
                    placeholder="Optional"
                    className={styles.formField}
                  />
                )}
              </Box>

              {selectedRole === "hotel" && (
                <>
                  <Typography className={styles.sectionTitle}>Hotel profile</Typography>
                  <Box className={`${styles.formGrid} ${styles.registerGuideGrid}`}>
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Hotel name"
                      name="hotelName"
                      value={form.hotelName}
                      onChange={handleChange}
                      className={styles.formField}
                      error={Boolean(errors.hotelName)}
                      helperText={errors.hotelName}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Hotel address"
                      name="hotelAddress"
                      value={form.hotelAddress}
                      onChange={handleChange}
                      multiline
                      rows={1}
                      className={styles.formField}
                      error={Boolean(errors.hotelAddress)}
                      helperText={errors.hotelAddress}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="City/state"
                      name="cityState"
                      value={form.cityState}
                      onChange={handleChange}
                      className={styles.formField}
                      error={Boolean(errors.cityState)}
                      helperText={errors.cityState}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      select
                      label="Hotel type"
                      name="hotelType"
                      value={form.hotelType}
                      onChange={handleChange}
                      className={styles.formField}
                      error={Boolean(errors.hotelType)}
                      helperText={errors.hotelType}
                    >
                      {hotelTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Amenities"
                      name="amenities"
                      value={form.amenities}
                      onChange={handleChange}
                      multiline
                      rows={1}
                      placeholder="Wi-Fi, AC, Parking, Restaurant"
                      className={styles.formField}
                      error={Boolean(errors.amenities)}
                      helperText={errors.amenities || "Separate multiple amenities with commas."}
                    />
                  </Box>
                </>
              )}

              {selectedRole === "guide" && (
                <>
                  <Typography className={styles.sectionTitle}>Guide profile</Typography>
                  <Box className={`${styles.formGrid} ${styles.registerGuideGrid}`}>
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Bio"
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      multiline
                      rows={1}
                      className={`${styles.formField} ${styles.guideBio}`}
                      error={Boolean(errors.bio)}
                      helperText={errors.bio}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Experience (years)"
                      name="experienceYears"
                      value={form.experienceYears}
                      onChange={handleChange}
                      type="number"
                      inputProps={{ min: 0 }}
                      className={`${styles.formField} ${styles.guideExperience}`}
                      error={Boolean(errors.experienceYears)}
                      helperText={errors.experienceYears}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Known languages"
                      name="languages"
                      value={form.languages}
                      onChange={handleChange}
                      placeholder="English, Hindi, Marathi"
                      className={`${styles.formField} ${styles.guideLanguages}`}
                      error={Boolean(errors.languages)}
                      helperText={errors.languages || "Separate multiple languages with commas."}
                    />
                    <Box
                      className={`${styles.fileUploadField} ${
                        errors.identityProof ? styles.fileUploadError : ""
                      }`}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFileRoundedIcon />}
                        className={styles.fileUploadButton}
                        aria-required="true"
                      >
                        Identity proof *
                        <input
                          hidden
                          type="file"
                          accept="application/pdf,image/*,.pdf"
                          onChange={handleIdentityProofChange}
                          aria-required="true"
                        />
                      </Button>
                      <Box className={styles.fileUploadCopy}>
                        <Typography className={styles.fileUploadName}>
                          {form.identityProof?.name || "Upload PDF or image"}
                        </Typography>
                        <Typography
                          className={
                            errors.identityProof
                              ? styles.fileUploadHelperError
                              : styles.fileUploadHelper
                          }
                        >
                          {errors.identityProof || "Required PDF, JPG, PNG, WebP or GIF up to 8 MB."}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Create Account"}
              </Button>
            </form>

            <Box className={styles.footerText}>
              <Typography variant="body2">
                Already have an account?{" "}
                <Link to="/login" className={styles.registerLink}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
