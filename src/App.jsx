import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UIProvider }   from './contexts/UIContext'
import { CartProvider } from './contexts/CartContext'
import { NotificationProvider } from './contexts/NotificationContext'
import AppLayout      from './layouts/AppLayout'
import AuthLayout     from './layouts/AuthLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'

import LoginPage          from './pages/LoginPage'
import SignupPage         from './pages/SignupPage'
import DashboardPage      from './pages/DashboardPage'
import InventoryPage      from './pages/InventoryPage'
import AddMedicinePage    from './pages/AddMedicinePage'
import EditMedicinePage   from './pages/EditMedicinePage'
import MedicineDetailPage from './pages/MedicineDetailPage'
import BillingPage        from './pages/BillingPage'
import ExpiryPage         from './pages/ExpiryPage'
import AnalyticsPage      from './pages/AnalyticsPage'
import NotificationsPage  from './pages/NotificationsPage'
import SettingsPage       from './pages/SettingsPage'
import AIScannerPage      from './pages/AIScannerPage'

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <NotificationProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login"  element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                </Route>

                {/* Protected app routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard"          element={<DashboardPage />} />
                    <Route path="/inventory"          element={<InventoryPage />} />
                    <Route path="/inventory/add"      element={<AddMedicinePage />} />
                    <Route path="/inventory/:id"      element={<MedicineDetailPage />} />
                    <Route path="/inventory/:id/edit" element={<EditMedicinePage />} />
                    <Route path="/billing"            element={<BillingPage />} />
                    <Route path="/expiry"             element={<ExpiryPage />} />
                    <Route path="/analytics"          element={<AnalyticsPage />} />
                    <Route path="/notifications"      element={<NotificationsPage />} />
                    <Route path="/settings"           element={<SettingsPage />} />
                    <Route path="/ai-scanner"         element={<AIScannerPage />} />
                  </Route>
                </Route>

                <Route path="/"   element={<Navigate to="/dashboard" replace />} />
                <Route path="*"   element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </NotificationProvider>
      </UIProvider>
    </AuthProvider>
  )
}
