import { getDb } from "../api/queries/connection";
import { venues, staffAccounts, menuItems, locations } from "./schema";
import { hash } from "bcrypt-ts";

async function seed() {
  const db = getDb();

  // Create a demo venue
  const [venueResult] = await db.insert(venues).values({
    slug: "b1-backhaus",
    name: "B1 by Backhaus",
    subdomain: "b1-backhaus",
    description: "Artisan coffee & baked goods in East Keilor, Melbourne. Take-away only.",
    address: "East Keilor, VIC 3033",
    phone: "+61 3 1234 5678",
    hoursWeekday: "6:00 AM - 3:00 PM",
    hoursSaturday: "7:00 AM - 3:00 PM",
    hoursSunday: "7:00 AM - 2:00 PM",
    primaryColor: "#1c1917",
    accentColor: "#5E8B8B",
    isPublic: true,
  });

  const venueId = Number(venueResult.insertId);
  console.log(`Created venue: B1 by Backhaus (ID: ${venueId})`);

  // Create default location
  await db.insert(locations).values({
    venueId,
    name: "East Keilor",
    address: "East Keilor, VIC 3033",
    phone: "+61 3 1234 5678",
    isDefault: true,
    hoursWeekday: "6:00 AM - 3:00 PM",
    hoursSaturday: "7:00 AM - 3:00 PM",
    hoursSunday: "7:00 AM - 2:00 PM",
  });
  console.log("Created default location");

  // Create staff accounts
  const passwordHash = await hash("b12345", 10);

  await db.insert(staffAccounts).values([
    {
      venueId,
      name: "Admin User",
      username: "admin",
      passwordHash,
      role: "admin" as const,
      isActive: true,
    },
    {
      venueId,
      name: "Manager User",
      username: "manager",
      passwordHash,
      role: "manager" as const,
      isActive: true,
    },
    {
      venueId,
      name: "Staff User",
      username: "staff",
      passwordHash,
      role: "staff" as const,
      isActive: true,
    },
  ]);
  console.log("Created 3 staff accounts (admin/manager/staff) with password: b12345");

  // Create sample menu items
  await db.insert(menuItems).values([
    {
      venueId,
      slug: "flat-white",
      name: "Flat White",
      description: "Double ristretto, silky steamed milk",
      price: "5.50",
      category: "coffee" as const,
    },
    {
      venueId,
      slug: "long-black",
      name: "Long Black",
      description: "Double ristretto over hot water",
      price: "5.00",
      category: "coffee" as const,
    },
    {
      venueId,
      slug: "cappuccino",
      name: "Cappuccino",
      description: "Espresso with steamed milk and chocolate dusting",
      price: "5.50",
      category: "coffee" as const,
    },
    {
      venueId,
      slug: "cold-brew",
      name: "Cold Brew",
      description: "18-hour steeped cold brew, served over ice",
      price: "6.50",
      category: "coffee" as const,
    },
    {
      venueId,
      slug: "croissant",
      name: "Butter Croissant",
      description: "House-made laminated pastry",
      price: "4.50",
      category: "pastries" as const,
    },
    {
      venueId,
      slug: "almond-croissant",
      name: "Almond Croissant",
      description: "Filled with almond cream, topped with flaked almonds",
      price: "6.00",
      category: "pastries" as const,
    },
    {
      venueId,
      slug: "sourdough-loaf",
      name: "Sourdough Loaf",
      description: "48-hour fermented country sourdough",
      price: "8.50",
      category: "bread" as const,
    },
    {
      venueId,
      slug: "baguette",
      name: "Baguette",
      description: "Traditional French baguette, baked fresh daily",
      price: "5.00",
      category: "bread" as const,
    },
  ]);
  console.log("Created 8 menu items (coffee, pastries, bread)");

  console.log("\n=== Seed Complete ===");
  console.log(`Venue ID: ${venueId}`);
  console.log("Staff Login: http://localhost:3000/staff-login");
  console.log("Login with:");
  console.log("  Venue ID: " + venueId);
  console.log("  Username: admin (or manager, staff)");
  console.log("  Password: b12345");
  console.log("\nPublic menu: http://localhost:3000/v/b1-backhaus");
}

seed().catch(console.error);
