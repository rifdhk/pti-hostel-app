import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, USER_ROLES } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import HostelManagement from './pages/HostelManagement';
import PTIDepartment from './pages/PTIDepartment';
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Residents from './pages/Residents';
import NoticeBoard from './pages/NoticeBoard';
import CommunicationHub from './pages/CommunicationHub';
import TicketSupport from './pages/TicketSupport';
import Profile from './pages/Profile';
import UserProfileView from './pages/UserProfileView';
import InstituteSettings from './pages/InstituteSettings';
import MasterDashboard from './pages/MasterDashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Dedicated Tier Dashboards (Direct URL Route Access)
import MealManagerDashboard from './components/dashboards/MealManagerDashboard';
import BoarderDashboard from './components/dashboards/BoarderDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Unified Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes inside Master Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route 
              path="master-admin" 
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.MASTER_ADMIN, 'master_admin']}>
                  <MasterDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="meal-manager" 
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.MEAL_MANAGER, 'meal_manager', USER_ROLES.SUPERINTENDENT, USER_ROLES.HOSTEL_SUPER]}>
                  <MealManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="boarder" 
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.BOARDER_STUDENT, 'boarder', 'boarder_student', USER_ROLES.SUPERINTENDENT, USER_ROLES.HOSTEL_SUPER]}>
                  <BoarderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="t4" 
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.MEAL_MANAGER, 'meal_manager', USER_ROLES.SUPERINTENDENT, USER_ROLES.HOSTEL_SUPER]}>
                  <MealManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="t5" 
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.BOARDER_STUDENT, 'boarder', 'boarder_student', USER_ROLES.SUPERINTENDENT, USER_ROLES.HOSTEL_SUPER]}>
                  <BoarderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="hostel" element={<HostelManagement />} />
            <Route path="pti" element={<PTIDepartment />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave-requests" element={<LeaveRequests />} />
            <Route path="residents" element={<Residents />} />
            <Route path="notices" element={<NoticeBoard />} />
            <Route path="chat" element={<CommunicationHub />} />
            <Route path="tickets" element={<TicketSupport />} />
            <Route path="profile" element={<Profile />} />
            <Route path="user/:userId" element={<UserProfileView />} />
            <Route path="settings" element={<InstituteSettings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
