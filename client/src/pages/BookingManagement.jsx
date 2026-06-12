import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import api from "../api";

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const renderBar = (value, max) => {
  if (!max || max <= 0) return "0px";
  return `${Math.round((value / max) * 120)}px`;
};
const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const CURRENCY_CODE = "INR";

export default function BookingManagement({ showHeader = true }) {
  const [range, setRange] = useState("Last 6 months");
  const [statusFilter, setStatusFilter] = useState("actual");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    revenue: [],
    occupancy: [],
    customerGrowth: [],
    totals: { revenue: 0, avgOccupancy: 0, customers: 0 },
  });
  const [roomTypes, setRoomTypes] = useState([]);
  const revenueRef = useRef(null);
  const occupancyRef = useRef(null);
  const growthRef = useRef(null);

  const currency = CURRENCY_CODE;

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const statusOptions = [
    { label: "Actual (confirmed/checked in/completed)", value: "actual" },
    { label: "Projected (include pending)", value: "projected" },
    { label: "Pending only", value: "pending" },
    { label: "Confirmed only", value: "confirmed" },
    { label: "Checked in only", value: "checked_in" },
    { label: "Completed only", value: "completed" },
  ];

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("range", range);
        params.set("status", statusFilter);
        if (roomTypeFilter && roomTypeFilter !== "All") {
          params.set("roomType", roomTypeFilter);
        }
        const res = await api.get(`/hotelReports?${params.toString()}`);
        if (!isMounted) return;
        setReports({
          revenue: res.data?.revenue || [],
          occupancy: res.data?.occupancy || [],
          customerGrowth: res.data?.customerGrowth || [],
          totals: res.data?.totals || { revenue: 0, avgOccupancy: 0, customers: 0 },
        });
        setRoomTypes(res.data?.roomTypes || []);
      } catch {
        if (!isMounted) return;
        setReports({
          revenue: [],
          occupancy: [],
          customerGrowth: [],
          totals: { revenue: 0, avgOccupancy: 0, customers: 0 },
        });
        setRoomTypes([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [range, statusFilter, roomTypeFilter]);

  useEffect(() => {
    if (roomTypeFilter === "All") return;
    if (roomTypes.length === 0) return;
    if (!roomTypes.includes(roomTypeFilter)) {
      setRoomTypeFilter("All");
    }
  }, [roomTypes, roomTypeFilter]);

  const revenueMax = useMemo(() => {
    const values = reports.revenue.map((item) => item.value || 0);
    return Math.max(1, ...values);
  }, [reports.revenue]);
  const occupancyMax = useMemo(() => {
    const values = reports.occupancy.map((item) => item.value || 0);
    return Math.max(1, ...values);
  }, [reports.occupancy]);
  const growthMax = useMemo(() => {
    const values = reports.customerGrowth.map((item) => item.value || 0);
    return Math.max(1, ...values);
  }, [reports.customerGrowth]);

  const handleExportCsv = () => {
    const lines = [];
    lines.push("Reports Export");
    lines.push(`Date Range,${escapeCsvValue(range)}`);
    lines.push(`Status Filter,${escapeCsvValue(statusOptions.find((opt) => opt.value === statusFilter)?.label || statusFilter)}`);
    lines.push(`Room Type,${escapeCsvValue(roomTypeFilter)}`);
    lines.push(`Currency,${escapeCsvValue(currency)}`);
    lines.push("");
    lines.push("Summary");
    lines.push(`Total Revenue,${escapeCsvValue(formatCurrency(reports.totals?.revenue))}`);
    lines.push(`Average Occupancy,${escapeCsvValue(`${reports.totals?.avgOccupancy || 0}%`)}`);
    lines.push(`Unique Customers,${escapeCsvValue(reports.totals?.customers || 0)}`);
    lines.push("");
    lines.push("Revenue Report");
    lines.push("Period,Revenue");
    reports.revenue.forEach((item) => {
      lines.push(`${escapeCsvValue(item.label)},${escapeCsvValue(formatCurrency(item.value))}`);
    });
    lines.push("");
    lines.push("Occupancy Report");
    lines.push("Period,Occupancy (%)");
    reports.occupancy.forEach((item) => {
      lines.push(`${escapeCsvValue(item.label)},${escapeCsvValue(item.value)}`);
    });
    lines.push("");
    lines.push("Customer Growth Report");
    lines.push("Period,Unique Customers");
    reports.customerGrowth.forEach((item) => {
      lines.push(`${escapeCsvValue(item.label)},${escapeCsvValue(item.value)}`);
    });
    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    const rangeSlug = range.toLowerCase().replace(/\s+/g, "-");
    link.href = url;
    link.download = `reports_${rangeSlug}_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 48;
    let cursorY = 56;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const headerText = "Travelogue Reports";
    const footerText = "Confidential - Internal Use";

    const addTitle = (text) => {
      pdf.setFontSize(18);
      pdf.setTextColor("#0f172a");
      pdf.text(text, marginX, cursorY);
      cursorY += 20;
    };

    const addSubtitle = (text) => {
      pdf.setFontSize(11);
      pdf.setTextColor("#475569");
      pdf.text(text, marginX, cursorY);
      cursorY += 18;
    };

    const addSectionTitle = (text) => {
      cursorY += 10;
      pdf.setFontSize(13);
      pdf.setTextColor("#0f172a");
      pdf.text(text, marginX, cursorY);
      cursorY += 16;
    };

    const addTable = (headers, rows) => {
      pdf.setFontSize(10);
      pdf.setTextColor("#0f172a");
      const colWidth = (pageWidth - marginX * 2) / headers.length;

      headers.forEach((header, idx) => {
        pdf.text(header, marginX + idx * colWidth, cursorY);
      });
      cursorY += 14;
      pdf.setDrawColor("#e2e8f0");
      pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 10;

      rows.forEach((row) => {
        row.forEach((cell, idx) => {
          pdf.text(String(cell), marginX + idx * colWidth, cursorY);
        });
        cursorY += 14;
        if (cursorY > pageHeight - 60) {
          pdf.addPage();
          cursorY = 56;
        }
      });
    };

    const addImageSection = (title, canvas) => {
      if (!canvas) return;
      cursorY += 8;
      pdf.setFontSize(13);
      pdf.setTextColor("#0f172a");
      pdf.text(title, marginX, cursorY);
      cursorY += 10;
      const maxWidth = pageWidth - marginX * 2;
      const imgHeight = (canvas.height / canvas.width) * maxWidth;
      if (cursorY + imgHeight > pageHeight - 40) {
        pdf.addPage();
        cursorY = 56;
      }
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", marginX, cursorY, maxWidth, imgHeight);
      cursorY += imgHeight + 12;
    };

    const applyHeaderFooter = () => {
      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(10);
        pdf.setTextColor("#334155");
        pdf.setFillColor(59, 130, 246);
        pdf.rect(marginX, 18, 10, 10, "F");
        pdf.text(headerText, marginX + 16, 28);
        pdf.setDrawColor("#e2e8f0");
        pdf.line(marginX, 34, pageWidth - marginX, 34);
        pdf.text(footerText, marginX, pageHeight - 24);
        pdf.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 24, { align: "right" });
      }
    };

    addTitle("Reports Export");
    addSubtitle(`Date Range: ${range}`);
    addSubtitle(`Status: ${statusOptions.find((opt) => opt.value === statusFilter)?.label || statusFilter}`);
    addSubtitle(`Room Type: ${roomTypeFilter}`);

    addSectionTitle("Summary");
    addTable(
      ["Metric", "Value"],
      [
        ["Total Revenue", formatCurrency(reports.totals?.revenue)],
        ["Average Occupancy", `${reports.totals?.avgOccupancy || 0}%`],
        ["Unique Customers", reports.totals?.customers || 0],
      ]
    );

    addSectionTitle("Revenue Report");
    addTable(
      ["Period", "Revenue"],
      (reports.revenue.length ? reports.revenue : [{ label: "No data", value: "" }])
        .map((item) => [item.label, item.value === "" ? "" : formatCurrency(item.value)])
    );

    addSectionTitle("Occupancy Report");
    addTable(
      ["Period", "Occupancy (%)"],
      (reports.occupancy.length ? reports.occupancy : [{ label: "No data", value: "" }])
        .map((item) => [item.label, item.value])
    );

    addSectionTitle("Customer Growth Report");
    addTable(
      ["Period", "Unique Customers"],
      (reports.customerGrowth.length ? reports.customerGrowth : [{ label: "No data", value: "" }])
        .map((item) => [item.label, item.value])
    );

    try {
      const [revenueCanvas, occupancyCanvas, growthCanvas] = await Promise.all([
        revenueRef.current ? html2canvas(revenueRef.current, { backgroundColor: "#ffffff", scale: 2 }) : null,
        occupancyRef.current ? html2canvas(occupancyRef.current, { backgroundColor: "#ffffff", scale: 2 }) : null,
        growthRef.current ? html2canvas(growthRef.current, { backgroundColor: "#ffffff", scale: 2 }) : null,
      ]);

      addImageSection("Revenue Chart", revenueCanvas);
      addImageSection("Occupancy Chart", occupancyCanvas);
      addImageSection("Customer Growth Chart", growthCanvas);
    } catch (error) {
      // If chart capture fails, still allow PDF export without images.
    }

    applyHeaderFooter();

    const dateStamp = new Date().toISOString().slice(0, 10);
    const rangeSlug = range.toLowerCase().replace(/\s+/g, "-");
    pdf.save(`reports_${rangeSlug}_${dateStamp}.pdf`);
    setExportingPdf(false);
  };

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Reports
          </Typography>
          <Typography color="text.secondary">
            Performance summaries with downloadable exports.
          </Typography>
        </Box>
      )}

      <Paper sx={{ ...cardStyle, mb: 2.5 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", lg: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <CalendarMonthIcon sx={{ color: "var(--dash-accent)" }} />
            <Typography fontWeight={700}>Date Range</Typography>
            <Select size="small" value={range} onChange={(event) => setRange(event.target.value)}>
              {["Last 7 days", "Last 30 days", "Last 6 months", "Last 12 months"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={700}>Status</Typography>
            <Select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={700}>Room Type</Typography>
            <Select
              size="small"
              value={roomTypeFilter}
              onChange={(event) => setRoomTypeFilter(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              {["All", ...roomTypes].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              {exportingPdf ? "Exporting..." : "Export PDF"}
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportCsv}>
              Download CSV
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle}>
            <Typography variant="body2" color="text.secondary">
              Total Revenue
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {loading ? "--" : formatCurrency(reports.totals?.revenue)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle}>
            <Typography variant="body2" color="text.secondary">
              Average Occupancy
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {loading ? "--" : `${reports.totals?.avgOccupancy || 0}%`}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle}>
            <Typography variant="body2" color="text.secondary">
              Unique Customers
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {loading ? "--" : reports.totals?.customers || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle} ref={revenueRef}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Revenue Report
            </Typography>
            {loading ? (
              <Typography color="text.secondary">Loading report...</Typography>
            ) : reports.revenue.length === 0 ? (
              <Typography color="text.secondary">No data for this range.</Typography>
            ) : (
              <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ height: 160 }}>
                {reports.revenue.map((item) => (
                  <Box key={item.label} sx={{ flex: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        height: renderBar(item.value, revenueMax),
                        borderRadius: 2,
                        bgcolor: "rgba(59,130,246,0.2)",
                        border: "1px solid rgba(59,130,246,0.4)",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--dash-muted)", mt: 1, display: "block" }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle} ref={occupancyRef}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Occupancy Report
            </Typography>
            {loading ? (
              <Typography color="text.secondary">Loading report...</Typography>
            ) : reports.occupancy.length === 0 ? (
              <Typography color="text.secondary">No data for this range.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {reports.occupancy.map((item) => (
                  <Box key={item.label}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography fontWeight={600}>{item.label}</Typography>
                      <Typography color="text.secondary">{item.value}%</Typography>
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
                          width: `${(item.value / occupancyMax) * 100}%`,
                          bgcolor: "var(--dash-accent)",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={cardStyle} ref={growthRef}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Customer Growth Report
            </Typography>
            {loading ? (
              <Typography color="text.secondary">Loading report...</Typography>
            ) : reports.customerGrowth.length === 0 ? (
              <Typography color="text.secondary">No data for this range.</Typography>
            ) : (
              <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ height: 160 }}>
                {reports.customerGrowth.map((item) => (
                  <Box key={item.label} sx={{ flex: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        height: renderBar(item.value, growthMax),
                        borderRadius: 2,
                        bgcolor: "rgba(59,130,246,0.18)",
                        border: "1px solid rgba(59,130,246,0.35)",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--dash-muted)", mt: 1, display: "block" }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
