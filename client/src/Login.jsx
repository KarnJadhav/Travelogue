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
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
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
  {
    value: "admin",
    label: "Admin",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN_LENGTH = 6;

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(roles[0].value);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const handleRole = (event, newRole) => {
    if (newRole !== null) setSelectedRole(newRole);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const showToast = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
  };

  const validateForm = () => {
    const nextErrors = {};
    const email = form.email.trim();

    if (!email) {
      nextErrors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
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
      const res = await api.post("/login", {
        ...form,
        email: form.email.trim(),
        role: selectedRole,
      });

      const userRole = res?.data?.user?.role;
      if (!userRole) {
        throw new Error("Could not verify account role. Please try again.");
      }

      if (userRole !== selectedRole) {
        showToast(
          "warning",
          `This account belongs to ${userRole}. Select ${userRole} to continue.`
        );
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("userId", res.data.user._id);
      localStorage.setItem("role", userRole);

      if (userRole === "guide") {
        const guideRes = await api.get(`/guide/profile/${res.data.user._id}`);
        if (guideRes.data.guide) {
          if (guideRes.data.guide.rejected) {
            clearAuthStorage();
            showToast("error", "Your guide account was rejected and cannot sign in.");
            return;
          }
          if (!guideRes.data.guide.approved) {
            clearAuthStorage();
            showToast(
              "info",
              "Your guide profile is pending admin approval. Please try again later."
            );
            return;
          }
        }
      }

      const redirectByRole = {
        guide: "/guide-dashboard",
        admin: "/admin-dashboard",
        tourist: "/tourist-dashboard",
        hotel: "/hotel-dashboard",
      };

      window.location.href = redirectByRole[userRole] || "/";
    } catch (err) {
      clearAuthStorage();
      showToast(
        "error",
        err.response?.data?.message || err.message || "Unable to sign in right now."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.authShell}>
      <Box className={styles.authFrame}>
        <Box className={styles.brandPanel}>
          <Box className={styles.brandBadge}>
            <TravelExploreIcon fontSize="small" />
            Travelogue
          </Box>
          <Typography component="h1" className={styles.brandTitle}>
            Welcome to Travelogue
          </Typography>
          <Typography className={styles.brandSub}>
            Sign in to continue.
          </Typography>
        </Box>

        <Box className={styles.formPanel}>
          <Link to="/" className={styles.backLink}>
            <ArrowBackRoundedIcon fontSize="small" />
            Back to Home
          </Link>

          <Box className={styles.formCard}>
            <Box className={styles.formHeader}>
              <Box className={styles.iconHalo}>
                <LockOutlinedIcon />
              </Box>
              <Typography component="h2" className={styles.formTitle}>
                Sign In
              </Typography>
              <Typography className={styles.formSubtitle}>
                Enter your details.
              </Typography>
            </Box>

            <Typography className={styles.sectionLabel}>Sign in as</Typography>
            <ToggleButtonGroup
              value={selectedRole}
              exclusive
              onChange={handleRole}
              className={styles.roleGroup}
            >
              {roles.map((role) => (
                <ToggleButton key={role.value} value={role.value} className={styles.roleBtn}>
                  <Box className={styles.roleInner}>
                    {role.icon}
                    <Typography className={styles.roleLabel}>{role.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography className={styles.securityNotice}>
              {selectedRole === "admin"
                ? "Admin sign-in is restricted to system-assigned email and password only."
                : "Use the same role and credentials you registered with."}
            </Typography>

            <form onSubmit={handleSubmit} className={styles.form}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={handleChange}
                className={styles.formField}
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className={styles.formField}
                error={Boolean(errors.password)}
                helperText={errors.password}
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
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                className={styles.loginBtn}
                disabled={loading}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Sign In"}
              </Button>
            </form>

            <Box className={styles.footerText}>
              <Typography variant="body2">
                Don't have an account?{" "}
                <Link to="/register" className={styles.registerLink}>
                  Sign up
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
