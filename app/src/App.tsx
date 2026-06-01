import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'

// ── Eager-loaded (critical path — shown on first paint) ───────────────────────
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

// ── Lazy-loaded (code-split — only downloaded when the route is hit) ──────────
// This drops the initial bundle from ~2.5 MB to ~400 KB.
const Onboarding      = lazy(() => import('./pages/Onboarding'))
const OwnerDashboard  = lazy(() => import('./pages/OwnerDashboard'))
const SuperAdmin      = lazy(() => import('./pages/SuperAdmin'))
const VenuePublic     = lazy(() => import('./pages/VenuePublic'))
const StaffLogin      = lazy(() => import('./pages/StaffLogin'))
const StaffDashboard  = lazy(() => import('./pages/StaffDashboard'))
const OrderStatus     = lazy(() => import('./pages/OrderStatus'))
const Review          = lazy(() => import('@/pages/Review'))
const NpsPage         = lazy(() => import('./pages/NpsPage'))
const KitchenDisplay  = lazy(() => import('./pages/KitchenDisplay'))
const GiftCardLanding = lazy(() => import('./pages/GiftCardLanding'))
const KioskMode       = lazy(() => import('./pages/KioskMode'))
const MenuCardPage    = lazy(() => import('./pages/MenuCardPage'))
const CustomerPortal  = lazy(() => import('./pages/CustomerPortal'))
const VenueApp        = lazy(() => import('./pages/VenueApp'))
const GroupOrder      = lazy(() => import('./pages/GroupOrder'))
const BookingPage     = lazy(() => import('./pages/BookingPage'))
const TabletPos       = lazy(() => import('./pages/TabletPos'))
const ClockPage       = lazy(() => import('./pages/ClockPage'))

/** Minimal full-screen spinner shown while a lazy chunk loads. */
function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8F6F2',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #E4E4E7',
        borderTopColor: '#5E8B8B',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Critical path — always bundled */}
        <Route path="/"            element={<Landing />} />
        <Route path="/login"       element={<Login />} />

        {/* Lazy — downloaded on demand */}
        <Route path="/onboarding"          element={<Onboarding />} />
        <Route path="/dashboard"           element={<OwnerDashboard />} />
        <Route path="/admin"               element={<SuperAdmin />} />
        <Route path="/v/:slug"             element={<VenuePublic />} />
        <Route path="/staff-login"         element={<StaffLogin />} />
        <Route path="/staff"               element={<StaffDashboard />} />
        <Route path="/order/:orderNumber"  element={<OrderStatus />} />
        <Route path="/review/:orderId"     element={<Review />} />
        <Route path="/nps/:orderId"        element={<NpsPage />} />
        <Route path="/kitchen"             element={<KitchenDisplay />} />
        <Route path="/gift/:code"          element={<GiftCardLanding />} />
        <Route path="/kiosk/:slug"         element={<KioskMode />} />
        <Route path="/menu-card/:slug"     element={<MenuCardPage />} />
        <Route path="/account"             element={<CustomerPortal />} />
        <Route path="/app/:slug"           element={<VenueApp />} />
        <Route path="/group/:code"         element={<GroupOrder />} />
        <Route path="/book/:slug"          element={<BookingPage />} />
        <Route path="/tablet/:slug"        element={<TabletPos />} />
        <Route path="/clock/:slug"         element={<ClockPage />} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
