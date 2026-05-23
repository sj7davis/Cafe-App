# B1 Platform - Multi-Tenant SaaS for Australian Cafes

A complete multi-tenant SaaS platform for cafe owners in Australia. Each venue gets a branded online presence with menu display, online ordering, staff management, loyalty programs, and Square POS integration.

## Features

### Core Platform
- **Multi-tenant architecture** - Each venue is fully isolated with its own data
- **Venue onboarding** - Self-service sign-up with 14-day free trial
- **Branded public sites** - Every venue gets `/#/v/:slug` with custom colors and logo
- **Owner dashboard** - Venue owners manage their business settings
- **SuperAdmin panel** - Platform-wide management

### Staff System
- **Role-based access control** - Admin, Manager, and Staff roles
- **Staff login** at `/#/staff-login` with venue ID + username + password
- **Staff dashboard** with sidebar navigation
- **Staff management** - Create, update roles, reset passwords, deactivate accounts
- **Order management** - View orders, update statuses (pending -> confirmed -> ready -> completed)
- **Inventory management** - Toggle item availability
- **Loyalty tracking** - View and manage loyalty accounts

### Customer Ordering
- **Menu browsing** by category (Coffee, Pastries, Bread)
- **Add to cart** with quantity controls
- **Place orders** with pickup time selection
- **Order status tracking**

### API Endpoints (tRPC)
- `venue.register` - Create new venue + owner
- `venue.login` / `venue.me` - Owner authentication
- `venue.getBySlug` / `venue.listPublic` - Public venue data
- `venue.listMenu` / `venue.createMenuItem` - Menu management
- `venue.listOrders` / `venue.createOrder` / `venue.updateOrderStatus` - Order lifecycle
- `venue.getInventory` / `venue.toggleInventoryItem` - Inventory control
- `venue.getLoyaltyAccount` / `venue.createLoyaltyAccount` / `venue.addLoyaltyPoints` - Loyalty program
- `staffAuth.login` / `staffAuth.me` - Staff authentication
- `staffAuth.list` / `staffAuth.create` / `staffAuth.update` / `staffAuth.resetPassword` - Staff CRUD

## Staff Login

Navigate to `/#/staff-login` and enter:
- **Venue ID**: (provided after seeding)
- **Username**: `admin`, `manager`, or `staff`
- **Password**: `b12345`

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono + tRPC + Drizzle ORM + MySQL
- **Auth**: JWT tokens with bcrypt password hashing
- **Router**: HashRouter for SPA deployment compatibility

## Database Schema

### Core Tables
- `venues` - Tenant configuration
- `venueOwners` - Platform users who own/manage venues
- `staffAccounts` - Per-venue staff (admin/manager/staff roles)
- `menuItems` - Per-venue menu (coffee/pastries/bread)
- `orders` / `orderItems` - Order management
- `inventory` - Real-time item availability
- `loyaltyAccounts` / `loyaltyTransactions` - Customer loyalty program
- `locations` - Per-venue locations
- `bundles`, `subscriptionPasses`, `giftCards`, `referralCodes` - Additional features
- `corporateAccounts`, `cateringRequests` - B2B features
- `pushSubscriptions` - Web push notifications

## Deployment

The platform is deployed with version management. Each version snapshot includes:
- Frontend build (React SPA)
- Backend API (tRPC + Hono)
- Database schema

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Seed database
npx tsx db/seed-staff.ts
```
