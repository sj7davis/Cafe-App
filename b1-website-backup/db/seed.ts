import { getDb } from "../api/queries/connection";
import bcrypt from "bcryptjs";
import { menuItems, bundles, locations, staffAccounts } from "./schema";

async function seed() {
  const db = getDb();
  const existing = await db.select().from(menuItems).limit(1);
  if (existing.length > 0) { console.log("Already seeded."); return; }

  await db.insert(locations).values({
    name: "B1 by Backhaus — East Keilor",
    address: "42 East Keilor Road, East Keilor VIC 3033",
    phone: "(03) 9336 0000",
    isDefault: true,
    hoursWeekday: "06:00–15:00",
    hoursSaturday: "07:00–14:00",
    hoursSunday: "07:00–13:00",
  });

  await db.insert(menuItems).values([
    { slug: "espresso", name: "Espresso", description: "Single origin, daily rotation", price: "4.50", category: "coffee", dietary: JSON.stringify(["V","DF","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Ethiopia, Yirgacheffe", originFarm: "Chelbesa Washing Station", originAltitude: "1950-2150m", originProcess: "Washed", originTastingNotes: JSON.stringify(["Jasmine","Bergamot","Lemon Zest"]), originStory: "This lot comes from the Gedeo zone in southern Ethiopia, where smallholder farmers cultivate heirloom varietals on steep, forested slopes." },
    { slug: "long-black", name: "Long Black", description: "Double ristretto, hot water", price: "5.00", category: "coffee", dietary: JSON.stringify(["V","DF","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Colombia, Huila", originFarm: "Finca El Paraiso", originAltitude: "1700m", originProcess: "Double Anaerobic Thermal Shock", originTastingNotes: JSON.stringify(["Mandarin","Brown Sugar","Dark Chocolate"]), originStory: "From the highlands of Huila, this innovative lot undergoes a unique double anaerobic fermentation process." },
    { slug: "flat-white", name: "Flat White", description: "Silky microfoam, house blend", price: "5.50", category: "coffee", dietary: JSON.stringify(["V","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Brazil / Guatemala Blend", originFarm: "Multiple Smallholders", originAltitude: "1200-1600m", originProcess: "Natural / Washed", originTastingNotes: JSON.stringify(["Hazelnut","Caramel","Milk Chocolate"]), originStory: "Our house blend combines a natural-processed Brazilian lot with a washed Guatemalan. Designed specifically to shine through milk." },
    { slug: "cappuccino", name: "Cappuccino", description: "Rich foam, chocolate dusted", price: "5.50", category: "coffee", dietary: JSON.stringify(["V","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Brazil / Guatemala Blend", originFarm: "Multiple Smallholders", originAltitude: "1200-1600m", originProcess: "Natural / Washed", originTastingNotes: JSON.stringify(["Hazelnut","Caramel","Milk Chocolate"]), originStory: "Our house blend combines a natural-processed Brazilian lot with a washed Guatemalan." },
    { slug: "latte", name: "Latte", description: "Smooth, creamy, full-bodied", price: "5.50", category: "coffee", dietary: JSON.stringify(["V","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Brazil / Guatemala Blend", originFarm: "Multiple Smallholders", originAltitude: "1200-1600m", originProcess: "Natural / Washed", originTastingNotes: JSON.stringify(["Hazelnut","Caramel","Milk Chocolate"]), originStory: "Our house blend designed specifically to shine through milk." },
    { slug: "piccolo", name: "Piccolo", description: "Espresso & warm milk, small", price: "4.50", category: "coffee", dietary: JSON.stringify(["V","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Ethiopia, Guji", originFarm: "Benti Nenka", originAltitude: "2000m", originProcess: "Natural", originTastingNotes: JSON.stringify(["Blueberry","Vanilla","Rose"]), originStory: "A small-format milk drink that lets the coffee sing." },
    { slug: "mocha", name: "Mocha", description: "House chocolate, espresso, steamed milk", price: "6.00", category: "coffee", dietary: JSON.stringify(["V","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Papua New Guinea, Eastern Highlands", originFarm: "Kainantu Cooperative", originAltitude: "1600m", originProcess: "Washed", originTastingNotes: JSON.stringify(["Cocoa","Dried Fruit","Walnut"]), originStory: "PNG coffees are often overlooked, but the Eastern Highlands produces some of the Pacific's most interesting cups." },
    { slug: "cold-brew", name: "Cold Brew", description: "18-hour steep, single origin", price: "6.00", category: "coffee", dietary: JSON.stringify(["V","DF","GF"]), image: "/images/menu-coffee.jpg", isDailySpecial: true, originRegion: "Kenya, Nyeri", originFarm: "Kiamabara Factory", originAltitude: "1800m", originProcess: "Washed", originTastingNotes: JSON.stringify(["Blackcurrant","Grapefruit","Brown Sugar"]), originStory: "Kenyan coffees are famous for their bright, juicy acidity. Cold brewing transforms that acidity into something round and syrupy." },
    { slug: "batch-brew", name: "Batch Brew", description: "Filter coffee, rotating origins", price: "5.00", category: "coffee", dietary: JSON.stringify(["V","DF","GF"]), image: "/images/menu-coffee.jpg", originRegion: "Rotating Weekly", originFarm: "Various", originAltitude: "Varies", originProcess: "Varies", originTastingNotes: JSON.stringify(["Check daily board"]), originStory: "Our batch brew changes weekly, giving us the chance to showcase exceptional single origins at an accessible price point." },
    { slug: "almond-croissant", name: "Almond Croissant", description: "House-made frangipane, flaked almonds", price: "6.50", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg" },
    { slug: "plain-croissant", name: "Plain Croissant", description: "Butter-layered, baked fresh", price: "5.50", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg" },
    { slug: "pain-au-chocolat", name: "Pain au Chocolat", description: "Dark chocolate, flaky pastry", price: "6.00", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg" },
    { slug: "cinnamon-scroll", name: "Cinnamon Scroll", description: "Slow-proved, cream cheese glaze", price: "6.50", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg" },
    { slug: "portuguese-tart", name: "Portuguese Tart", description: "Caramelised custard, puff pastry", price: "5.00", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg" },
    { slug: "seasonal-fruit-danish", name: "Seasonal Fruit Danish", description: "Daily changing, local fruit", price: "6.50", category: "pastries", dietary: JSON.stringify(["V"]), image: "/images/menu-pastries.jpg", isDailySpecial: true },
    { slug: "sourdough-loaf", name: "Sourdough Loaf", description: "48-hour ferment, house starter", price: "9.00", category: "bread", dietary: JSON.stringify(["V","DF"]), image: "/images/menu-bread.jpg" },
    { slug: "baguette", name: "Baguette", description: "Traditional French, crisp crust", price: "6.00", category: "bread", dietary: JSON.stringify(["V","DF"]), image: "/images/menu-bread.jpg" },
    { slug: "ciabatta", name: "Ciabatta", description: "Rustic Italian, open crumb", price: "7.00", category: "bread", dietary: JSON.stringify(["V","DF"]), image: "/images/menu-bread.jpg" },
    { slug: "brioche-loaf", name: "Brioche Loaf", description: "Enriched butter dough, soft", price: "8.50", category: "bread", dietary: JSON.stringify(["V"]), image: "/images/menu-bread.jpg" },
    { slug: "olive-rosemary", name: "Olive & Rosemary", description: "Mediterranean flavours, dense crumb", price: "8.00", category: "bread", dietary: JSON.stringify(["V","DF"]), image: "/images/menu-bread.jpg" },
    { slug: "multigrain", name: "Multigrain", description: "Seven seeds, wholemeal base", price: "8.00", category: "bread", dietary: JSON.stringify(["V","DF"]), image: "/images/menu-bread.jpg" },
  ]);

  await db.insert(bundles).values([
    { name: "Morning Fix", description: "Coffee + Pastry — Save $2", itemSlugs: JSON.stringify(["flat-white", "almond-croissant"]), bundlePrice: "10.00" },
    { name: "The Commuter", description: "Long Black + Plain Croissant", itemSlugs: JSON.stringify(["long-black", "plain-croissant"]), bundlePrice: "9.00" },
    { name: "Sweet Tooth", description: "Mocha + Pain au Chocolat", itemSlugs: JSON.stringify(["mocha", "pain-au-chocolat"]), bundlePrice: "10.50" },
  ]);

  // Default admin account
  const existingAdmin = await db.select().from(staffAccounts).limit(1);
  if (existingAdmin.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await db.insert(staffAccounts).values({
      name: "Store Manager",
      username: "admin",
      passwordHash: hash,
      role: "admin",
    });
    console.log("Default admin created: username=admin, password=admin123");
  }

  console.log("Seeded: 21 menu items, 1 location, 3 bundles, 1 admin.");
}

seed().catch(console.error);
