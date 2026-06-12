import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Box,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarIcon from "@mui/icons-material/Star";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import api from "../api";

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const segmentationColors = {
  Business: "#3b82f6",
  Family: "#22c55e",
  Solo: "#f59e0b",
  Couples: "#6366f1",
  Other: "#0ea5e9",
};

const segmentOptions = [
  { label: "Auto (Default)", value: "" },
  { label: "Business", value: "Business" },
  { label: "Family", value: "Family" },
  { label: "Solo", value: "Solo" },
  { label: "Couples", value: "Couples" },
  { label: "Other", value: "Other" },
];

export default function HotelCustomerIntelligence({ showHeader = true }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    repeatRate: 0,
    avgStay: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ segment: "", notes: "" });
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/hotelCustomerIntelligence");
        if (!isMounted) return;
        setCustomers(res.data?.customers || []);
        setSummary(res.data?.summary || { totalCustomers: 0, repeatRate: 0, avgStay: 0 });
      } catch {
        if (!isMounted) return;
        setCustomers([]);
        setSummary({ totalCustomers: 0, repeatRate: 0, avgStay: 0 });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCustomers = summary.totalCustomers || customers.length;
  const repeatRate = summary.repeatRate || 0;
  const avgStay = summary.avgStay || 0;

  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => (b.spending || 0) - (a.spending || 0) || (b.stays || 0) - (a.stays || 0))
      .slice(0, 5);
  }, [customers]);

  const segmentTotals = useMemo(() => {
    return customers.reduce((acc, customer) => {
      const segment = customer.segment || "Other";
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    }, {});
  }, [customers]);

  const segmentTotalCount = Object.values(segmentTotals).reduce((sum, val) => sum + val, 0);

  const startEdit = (customer) => {
    setEditingId(customer.touristId);
    setEditForm({
      segment: customer.segment || "",
      notes: customer.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ segment: "", notes: "" });
  };

  const saveEdit = async (touristId) => {
    if (!touristId) return;
    setSavingId(touristId);
    try {
      await api.patch(`/hotelCustomerIntelligence/${touristId}`, {
        segment: editForm.segment,
        notes: editForm.notes,
      });
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.touristId === touristId
            ? {
              ...customer,
              segment: editForm.segment || customer.segment,
              notes: editForm.notes,
            }
            : customer
        )
      );
      cancelEdit();
    } catch {
      // ignore for now
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Customer Intelligence
          </Typography>
          <Typography color="text.secondary">
            Segment insights and loyalty signals for your most valuable guests.
          </Typography>
        </Box>
      )}

      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={cardStyle}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <PeopleAltIcon sx={{ color: "var(--dash-accent)" }} />
              <Typography fontWeight={700}>Total Customers</Typography>
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {loading ? "--" : totalCustomers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active profiles tracked
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={cardStyle}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <AutorenewIcon sx={{ color: "#22c55e" }} />
              <Typography fontWeight={700}>Repeat Customers</Typography>
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {loading ? "--" : `${repeatRate}%`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Guests with 2+ stays
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={cardStyle}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <AccessTimeIcon sx={{ color: "#f59e0b" }} />
              <Typography fontWeight={700}>Avg Stay Duration</Typography>
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {loading ? "--" : `${avgStay} days`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on last 90 days
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={cardStyle}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <StarIcon sx={{ color: "#6366f1" }} />
              <Typography fontWeight={700}>Top Customers</Typography>
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {loading ? "--" : topCustomers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High-value guests
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} lg={6}>
          <Paper sx={cardStyle}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Customer Segmentation
            </Typography>
            <Stack spacing={1.5}>
              {Object.entries(segmentTotals).map(([segment, count]) => {
                const percentage = segmentTotalCount
                  ? Math.round((count / segmentTotalCount) * 100)
                  : 0;
                return (
                  <Box key={segment}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography fontWeight={600}>{segment} Travelers</Typography>
                      <Typography color="text.secondary">{percentage}%</Typography>
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
                          width: `${percentage}%`,
                          bgcolor: segmentationColors[segment] || "var(--dash-accent)",
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper sx={cardStyle}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Top 5 High-Value Customers
            </Typography>
            <Stack spacing={1.5}>
              {topCustomers.length === 0 ? (
                <Typography color="text.secondary">No customers yet.</Typography>
              ) : topCustomers.map((customer) => (
                <Box
                  key={customer.touristId || customer.name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box>
                    <Typography fontWeight={700}>{customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(customer.segment || "Other")} Traveler
                    </Typography>
                  </Box>
                  <Typography fontWeight={700}>
                    ₹{Number(customer.spending || 0).toLocaleString("en-IN")}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={cardStyle}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Customer Loyalty Table
        </Typography>
        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1.5, mb: 1.5 }}>
          {loading ? (
            <Typography color="text.secondary">Loading customers...</Typography>
          ) : customers.length === 0 ? (
            <Typography color="text.secondary">No customers found.</Typography>
          ) : (
            customers.map((customer) => {
              const isEditing = editingId === customer.touristId;
              const loyaltyScore = Number.isFinite(customer.loyaltyScore)
                ? customer.loyaltyScore
                : ((customer.stays || 0) * 2 + Math.round((customer.spending || 0) / 1000));
              return (
                <Paper
                  key={`mobile-${customer.touristId || customer.name}`}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, borderColor: "#e2e8f0" }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} mb={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{customer.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.stays} stays • Loyalty {loyaltyScore}
                      </Typography>
                    </Box>
                    <Typography fontWeight={700}>
                      ₹{Number(customer.spending || 0).toLocaleString("en-IN")}
                    </Typography>
                  </Stack>
                  {isEditing ? (
                    <Stack spacing={1.25}>
                      <FormControl size="small">
                        <Select
                          value={editForm.segment}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, segment: event.target.value }))
                          }
                        >
                          {segmentOptions.map((option) => (
                            <MenuItem key={option.label} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        value={editForm.notes}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        placeholder="Add note"
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<SaveOutlinedIcon />}
                          onClick={() => saveEdit(customer.touristId)}
                          disabled={savingId === customer.touristId}
                        >
                          Save
                        </Button>
                        <Button variant="outlined" size="small" startIcon={<CloseIcon />} onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={0.6}>
                      <Typography variant="body2" color="text.secondary">
                        Segment: {customer.segment || "Other"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Notes: {customer.notes || "N/A"}
                      </Typography>
                      <Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => startEdit(customer)}
                        >
                          Edit
                        </Button>
                      </Box>
                    </Stack>
                  )}
                </Paper>
              );
            })
          )}
        </Box>
        <TableContainer sx={{ overflowX: "auto", display: { xs: "none", md: "block" } }}>
          <Table sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Stays</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Spending</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Loyalty Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>Loading customers...</TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No customers found.</TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const isEditing = editingId === customer.touristId;
                  const loyaltyScore = Number.isFinite(customer.loyaltyScore)
                    ? customer.loyaltyScore
                    : ((customer.stays || 0) * 2 + Math.round((customer.spending || 0) / 1000));
                  return (
                    <TableRow key={customer.touristId || customer.name}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.stays}</TableCell>
                      <TableCell>
                        ₹{Number(customer.spending || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{loyaltyScore}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select
                              value={editForm.segment}
                              onChange={(event) =>
                                setEditForm((prev) => ({ ...prev, segment: event.target.value }))
                              }
                            >
                              {segmentOptions.map((option) => (
                                <MenuItem key={option.label} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          customer.segment || "Other"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={editForm.notes}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                            placeholder="Add note"
                            sx={{ minWidth: 200 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                            {customer.notes || "N/A"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {isEditing ? (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => saveEdit(customer.touristId)}
                                disabled={savingId === customer.touristId}
                              >
                                <SaveOutlinedIcon />
                              </IconButton>
                              <IconButton size="small" onClick={cancelEdit}>
                                <CloseIcon />
                              </IconButton>
                            </>
                          ) : (
                            <IconButton size="small" onClick={() => startEdit(customer)}>
                              <EditOutlinedIcon />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
