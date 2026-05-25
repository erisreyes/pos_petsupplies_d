import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { StaffRestrictedRoute } from './components/StaffRestrictedRoute';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import ReportDashboard from './pages/ReportDashboard';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectivityProvider>
        <Routes>
          <Route path="/" element={<PosPage />} />
          <Route
            path="/inventory"
            element={
              <StaffRestrictedRoute>
                <InventoryPage />
              </StaffRestrictedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <StaffRestrictedRoute>
                <ReportDashboard />
              </StaffRestrictedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <StaffRestrictedRoute>
                <UsersPage />
              </StaffRestrictedRoute>
            }
          />
        </Routes>
        </ConnectivityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
