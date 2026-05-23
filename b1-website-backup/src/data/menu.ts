export type DietaryTag = 'V' | 'GF' | 'DF' | 'VG';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  dietary: DietaryTag[];
  category: 'coffee' | 'pastries' | 'bread';
  origin?: {
    region: string;
    farm: string;
    altitude: string;
    process: string;
    tastingNotes: string[];
    story: string;
  };
  isDailySpecial?: boolean;
  isLimited?: boolean;
}

export const dietaryLabels: Record<DietaryTag, string> = {
  V: 'Vegetarian',
  GF: 'Gluten Free',
  DF: 'Dairy Free',
  VG: 'Vegan',
};

export const menuItems: MenuItem[] = [
  // COFFEE
  {
    id: 'espresso',
    name: 'Espresso',
    description: 'Single origin, daily rotation',
    price: 4.50,
    dietary: ['V', 'DF', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Ethiopia, Yirgacheffe',
      farm: 'Chelbesa Washing Station',
      altitude: '1950–2150m',
      process: 'Washed',
      tastingNotes: ['Jasmine', 'Bergamot', 'Lemon Zest'],
      story: 'This lot comes from the Gedeo zone in southern Ethiopia, where smallholder farmers cultivate heirloom varietals on steep, forested slopes. The Chelbesa washing station processes cherries from over 400 local families, producing a cup that is unmistakably Ethiopian — floral, bright, and complex.',
    },
  },
  {
    id: 'long-black',
    name: 'Long Black',
    description: 'Double ristretto, hot water',
    price: 5.00,
    dietary: ['V', 'DF', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Colombia, Huila',
      farm: 'Finca El Paraíso',
      altitude: '1700m',
      process: 'Double Anaerobic Thermal Shock',
      tastingNotes: ['Mandarin', 'Brown Sugar', 'Dark Chocolate'],
      story: 'From the highlands of Huila, this innovative lot undergoes a unique double anaerobic fermentation process developed by Diego Bermudez. The thermal shock technique locks in volatile aromatic compounds, creating a cup with extraordinary clarity and sweetness.',
    },
  },
  {
    id: 'flat-white',
    name: 'Flat White',
    description: 'Silky microfoam, house blend',
    price: 5.50,
    dietary: ['V', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Brazil / Guatemala Blend',
      farm: 'Multiple Smallholders',
      altitude: '1200–1600m',
      process: 'Natural / Washed',
      tastingNotes: ['Hazelnut', 'Caramel', 'Milk Chocolate'],
      story: 'Our house blend combines a natural-processed Brazilian lot with a washed Guatemalan. The Brazilian component adds body and nutty sweetness, while the Guatemalan brings acidity and floral complexity. Designed specifically to shine through milk.',
    },
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    description: 'Rich foam, chocolate dusted',
    price: 5.50,
    dietary: ['V', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Brazil / Guatemala Blend',
      farm: 'Multiple Smallholders',
      altitude: '1200–1600m',
      process: 'Natural / Washed',
      tastingNotes: ['Hazelnut', 'Caramel', 'Milk Chocolate'],
      story: 'Our house blend combines a natural-processed Brazilian lot with a washed Guatemalan. The Brazilian component adds body and nutty sweetness, while the Guatemalan brings acidity and floral complexity. Designed specifically to shine through milk.',
    },
  },
  {
    id: 'latte',
    name: 'Latte',
    description: 'Smooth, creamy, full-bodied',
    price: 5.50,
    dietary: ['V', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Brazil / Guatemala Blend',
      farm: 'Multiple Smallholders',
      altitude: '1200–1600m',
      process: 'Natural / Washed',
      tastingNotes: ['Hazelnut', 'Caramel', 'Milk Chocolate'],
      story: 'Our house blend combines a natural-processed Brazilian lot with a washed Guatemalan. The Brazilian component adds body and nutty sweetness, while the Guatemalan brings acidity and floral complexity. Designed specifically to shine through milk.',
    },
  },
  {
    id: 'piccolo',
    name: 'Piccolo',
    description: 'Espresso & warm milk, small',
    price: 4.50,
    dietary: ['V', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Ethiopia, Guji',
      farm: 'Benti Nenka',
      altitude: '2000m',
      process: 'Natural',
      tastingNotes: ['Blueberry', 'Vanilla', 'Rose'],
      story: 'A small-format milk drink that lets the coffee sing. The Guji natural brings intense blueberry and vanilla aromatics that cut through the milk without being overwhelming. Perfect for those who want flavour in a smaller cup.',
    },
  },
  {
    id: 'mocha',
    name: 'Mocha',
    description: 'House chocolate, espresso, steamed milk',
    price: 6.00,
    dietary: ['V', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Papua New Guinea, Eastern Highlands',
      farm: 'Kainantu Cooperative',
      altitude: '1600m',
      process: 'Washed',
      tastingNotes: ['Cocoa', 'Dried Fruit', 'Walnut'],
      story: 'PNG coffees are often overlooked, but the Eastern Highlands produces some of the Pacific\'s most interesting cups. This washed lot from the Kainantu Cooperative has an inherent cocoa quality that pairs beautifully with our house-made dark chocolate syrup.',
    },
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: '18-hour steep, single origin',
    price: 6.00,
    dietary: ['V', 'DF', 'GF'],
    category: 'coffee',
    isDailySpecial: true,
    origin: {
      region: 'Kenya, Nyeri',
      farm: 'Kiamabara Factory',
      altitude: '1800m',
      process: 'Washed',
      tastingNotes: ['Blackcurrant', 'Grapefruit', 'Brown Sugar'],
      story: 'Kenyan coffees are famous for their bright, juicy acidity — and cold brewing transforms that acidity into something round and syrupy. This Nyeri lot steeps for 18 hours, producing a concentrate that we dilute to a perfect drinking strength. The blackcurrant notes are extraordinary.',
    },
  },
  {
    id: 'batch-brew',
    name: 'Batch Brew',
    description: 'Filter coffee, rotating origins',
    price: 5.00,
    dietary: ['V', 'DF', 'GF'],
    category: 'coffee',
    origin: {
      region: 'Rotating Weekly',
      farm: 'Various',
      altitude: 'Varies',
      process: 'Varies',
      tastingNotes: ['Check daily board'],
      story: 'Our batch brew changes weekly, giving us the chance to showcase exceptional single origins at an accessible price point. Check the daily board above the machine for this week\'s offering.',
    },
  },
  // PASTRIES
  {
    id: 'almond-croissant',
    name: 'Almond Croissant',
    description: 'House-made frangipane, flaked almonds',
    price: 6.50,
    dietary: ['V'],
    category: 'pastries',
  },
  {
    id: 'plain-croissant',
    name: 'Plain Croissant',
    description: 'Butter-layered, baked fresh',
    price: 5.50,
    dietary: ['V'],
    category: 'pastries',
  },
  {
    id: 'pain-au-chocolat',
    name: 'Pain au Chocolat',
    description: 'Dark chocolate, flaky pastry',
    price: 6.00,
    dietary: ['V'],
    category: 'pastries',
  },
  {
    id: 'cinnamon-scroll',
    name: 'Cinnamon Scroll',
    description: 'Slow-proved, cream cheese glaze',
    price: 6.50,
    dietary: ['V'],
    category: 'pastries',
  },
  {
    id: 'portuguese-tart',
    name: 'Portuguese Tart',
    description: 'Caramelised custard, puff pastry',
    price: 5.00,
    dietary: ['V'],
    category: 'pastries',
  },
  {
    id: 'fruit-danish',
    name: 'Seasonal Fruit Danish',
    description: 'Daily changing, local fruit',
    price: 6.50,
    dietary: ['V'],
    category: 'pastries',
    isDailySpecial: true,
  },
  // BREAD
  {
    id: 'sourdough',
    name: 'Sourdough Loaf',
    description: '48-hour ferment, house starter',
    price: 9.00,
    dietary: ['V', 'DF'],
    category: 'bread',
  },
  {
    id: 'baguette',
    name: 'Baguette',
    description: 'Traditional French, crisp crust',
    price: 6.00,
    dietary: ['V', 'DF'],
    category: 'bread',
  },
  {
    id: 'ciabatta',
    name: 'Ciabatta',
    description: 'Rustic Italian, open crumb',
    price: 7.00,
    dietary: ['V', 'DF'],
    category: 'bread',
  },
  {
    id: 'brioche',
    name: 'Brioche Loaf',
    description: 'Enriched butter dough, soft',
    price: 8.50,
    dietary: ['V'],
    category: 'bread',
  },
  {
    id: 'olive-rosemary',
    name: 'Olive & Rosemary',
    description: 'Mediterranean flavours, dense crumb',
    price: 8.00,
    dietary: ['V', 'DF'],
    category: 'bread',
  },
  {
    id: 'multigrain',
    name: 'Multigrain',
    description: 'Seven seeds, wholemeal base',
    price: 8.00,
    dietary: ['V', 'DF'],
    category: 'bread',
  },
];

export interface DailyRotation {
  date: string;
  coffeeOrigin: string;
  coffeeOriginShort: string;
  pastryOfTheDay: string;
  breadOfTheDay: string;
  limitedDrop: string | null;
}

export const todayRotation: DailyRotation = {
  date: new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
  coffeeOrigin: 'Ethiopia Yirgacheffe — Chelbesa Washing Station',
  coffeeOriginShort: 'Ethiopia Yirgacheffe',
  pastryOfTheDay: 'Seasonal Fruit Danish — Raspberry & White Peach',
  breadOfTheDay: 'Olive & Rosemary Sourdough',
  limitedDrop: 'House-made Hot Cross Buns — This week only',
};

export function getCoffeeItems(): MenuItem[] {
  return menuItems.filter((i) => i.category === 'coffee');
}

export function getPastryItems(): MenuItem[] {
  return menuItems.filter((i) => i.category === 'pastries');
}

export function getBreadItems(): MenuItem[] {
  return menuItems.filter((i) => i.category === 'bread');
}

export function getItemById(id: string): MenuItem | undefined {
  return menuItems.find((i) => i.id === id);
}
