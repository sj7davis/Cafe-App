// Seed script for B1 Platform
import { getDb } from "../api/queries/connection";
import { venues, venueOwners, platformAdmins } from "./schema";
import { hash } from "bcrypt-ts";

async function seed() {
  const db = getDb();
  console.log("Seeding B1 Platform...");

  // Create platform admin
  const adminHash = await hash("admin123", 10);
  await db.insert(platformAdmins).values({
    email: "admin@b1platform.com.au",
    name: "Platform Admin",
    passwordHash: adminHash,
    role: "superadmin",
  });
  console.log("✅ Platform admin: admin@b1platform.com.au / admin123");

  // Create demo venue (B1 by Backhaus)
  const [venue] = await db.insert(venues).values({
    slug: "b1-backhaus",
    name: "B1 by Backhaus",
    subdomain: "b1-backhaus",
    description: "A dedicated take-away coffee bar in East Keilor, born from a partnership with Melbourne's renowned Backhaus Bakery.",
    address: "42 East Keilor Road, East Keilor, VIC 3033",
    phone: "(03) 9335 8200",
    hoursWeekday: "06:00 – 15:00",
    hoursSaturday: "07:00 – 14:00",
    hoursSunday: "07:00 – 13:00",
    primaryColor: "#181818",
    accentColor: "#5E8B8B",
    subscriptionTier: "pro",
    subscriptionStatus: "active",
    isActive: true,
    isPublic: true,
  }).returning({ id: venues.id });

  const venueId = venue.id;

  // Create venue owner
  const ownerHash = await hash("owner123", 10);
  await db.insert(venueOwners).values({
    venueId,
    email: "owner@b1bybackhaus.com",
    name: "Store Manager",
    passwordHash: ownerHash,
    role: "owner",
  });
  console.log("✅ Venue owner: owner@b1bybackhaus.com / owner123");

  console.log("\n🎉 Platform seeded successfully!");
  console.log("\nRun `npm run seed` next to create staff accounts and menu items.");
  console.log("\nLogin credentials:");
  console.log("  Platform Admin: admin@b1platform.com.au / admin123");
  console.log("  Venue Owner:    owner@b1bybackhaus.com / owner123");
}

seed().catch(console.error);
