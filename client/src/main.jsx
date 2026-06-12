import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AdminRoutes from '../admin/routes.jsx';
import "./i18n";
 
import App from './App.jsx';
import Register from './Register.jsx';
import Login from './Login.jsx';
import AboutPage from './home/AboutPage.jsx';
import GuideDashboard from './dashboards/GuideDashboard';
import TouristDashboard from './dashboards/TouristDashboard.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import HotelDashboard from './pages/HotelDashboard.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        {/* Redirect legacy /admin-dashboard to /admin */}
        <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="/" element={<App />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/guide-dashboard" element={<GuideDashboard />} />
        <Route path="/tourist-dashboard" element={
          <ProtectedRoute allowedRole="tourist">
            <TouristDashboard />
          </ProtectedRoute>
        } />
        <Route path="/hotel-dashboard" element={
          <ProtectedRoute allowedRole="hotel">
            <HotelDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
