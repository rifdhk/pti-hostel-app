import React from 'react';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Import all tier dashboards
import MasterDashboard from './MasterDashboard';
import SuperintendentDashboard from '../components/dashboards/SuperintendentDashboard';
import HostelSuperDashboard from '../components/dashboards/HostelSuperDashboard';
import HostelMonitorDashboard from '../components/dashboards/HostelMonitorDashboard';
import MealManagerDashboard from '../components/dashboards/MealManagerDashboard';
import BoarderDashboard from '../components/dashboards/BoarderDashboard';
import NonBoarderDashboard from '../components/dashboards/NonBoarderDashboard';

export default function Dashboard() {
  const { 
    role, 
    isMasterAdmin,
    isSuperintendent, 
    isHostelSuper, 
    isHostelMonitor, 
    isMealManager, 
    isBoarder, 
    isNonBoarder 
  } = useAuth();

  const renderDashboard = () => {
    // Tier 0: Master Admin
    if (isMasterAdmin || role === USER_ROLES.MASTER_ADMIN || role === 'master_admin') {
      return <MasterDashboard />;
    }

    // Tier 1: Superintendent
    if (isSuperintendent) {
      return <SuperintendentDashboard />;
    }

    // Tier 2: Hostel Super
    if (isHostelSuper) {
      return <HostelSuperDashboard />;
    }

    // Tier 3: Hostel Monitor
    if (isHostelMonitor) {
      return <HostelMonitorDashboard />;
    }

    // Tier 5: Boarder Student (Strict routing to Boarder Dashboard)
    if (isBoarder) {
      return <BoarderDashboard />;
    }

    // Tier 4: Meal Manager (Strict routing to Meal Manager Dashboard)
    if (isMealManager) {
      return <MealManagerDashboard />;
    }

    // Tier 6: Non-Boarder Student
    if (isNonBoarder) {
      return <NonBoarderDashboard />;
    }

    // Default fallback
    return <SuperintendentDashboard />;
  };

  return (
    <ErrorBoundary>
      {renderDashboard()}
    </ErrorBoundary>
  );
}
