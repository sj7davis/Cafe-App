import { Routes, Route } from 'react-router'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import OwnerDashboard from './pages/OwnerDashboard'
import SuperAdmin from './pages/SuperAdmin'
import VenuePublic from './pages/VenuePublic'
import Login from './pages/Login'
import StaffLogin from './pages/StaffLogin'
import StaffDashboard from './pages/StaffDashboard'
import OrderStatus from './pages/OrderStatus'
import Review from '@/pages/Review'
import KitchenDisplay from './pages/KitchenDisplay'
import GiftCardLanding from './pages/GiftCardLanding'
import KioskMode from './pages/KioskMode'
import MenuCardPage from './pages/MenuCardPage'
import CustomerPortal from './pages/CustomerPortal'
import VenueApp from './pages/VenueApp'
import GroupOrder from './pages/GroupOrder'
import BookingPage from './pages/BookingPage'
import NotFound from './pages/NotFound'
import TabletPos from './pages/TabletPos'
import ClockPage from './pages/ClockPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<OwnerDashboard />} />
      <Route path="/admin" element={<SuperAdmin />} />
      <Route path="/v/:slug" element={<VenuePublic />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffDashboard />} />
      <Route path="/order/:orderNumber" element={<OrderStatus />} />
      <Route path="/review/:orderId" element={<Review />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
      <Route path="/gift/:code" element={<GiftCardLanding />} />
      <Route path="/kiosk/:slug" element={<KioskMode />} />
      <Route path="/menu-card/:slug" element={<MenuCardPage />} />
      <Route path="/account" element={<CustomerPortal />} />
      <Route path="/app/:slug" element={<VenueApp />} />
      <Route path="/group/:code" element={<GroupOrder />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/tablet/:slug" element={<TabletPos />} />
      <Route path="/clock/:slug" element={<ClockPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
