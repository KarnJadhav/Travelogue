import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminApp from './App';
import DashboardOverview from './pages/DashboardOverview';
import UserManagement from './pages/UserManagement';
import ReviewManagement from './pages/ReviewManagement';
import TravelogueManagement from './pages/TravelogueManagement';
import AnalyticsReports from './pages/AnalyticsReports';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminApp />}>
        <Route index element={<DashboardOverview />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="reviews" element={<ReviewManagement />} />
        <Route path="travelogues" element={<TravelogueManagement />} />
        <Route path="reports" element={<AnalyticsReports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
