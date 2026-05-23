import { Routes, Route } from 'react-router'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import OwnerDashboard from './pages/OwnerDashboard'
import SuperAdmin from './pages/SuperAdmin'
import VenuePublic from './pages/VenuePublic'
import StaffLogin from './pages/StaffLogin'
import StaffDashboard from './pages/StaffDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<OwnerDashboard />} />
      <Route path="/admin" element={<SuperAdmin />} />
      <Route path="/v/:slug" element={<VenuePublic />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
