import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import MessagesPage from './pages/MessagesPage';
import AlertsPage from './pages/AlertsPage';
import DistressPage from './pages/DistressPage';
import LiveChatPage from './pages/LiveChatPage';
import HotlinesPage from './pages/HotlinesPage';
import AdminPage from './pages/AdminPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="distress" element={<DistressPage />} />
            <Route path="live-chat" element={<LiveChatPage />} />
            <Route path="hotlines" element={<HotlinesPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
