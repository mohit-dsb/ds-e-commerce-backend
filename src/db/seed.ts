import { db } from "./index";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { eq, and, sql, type InferSelectModel } from "drizzle-orm";
import { hashPassword } from "../utils/password";
import { generateSlug } from "../utils/slug";
import { users, categories, products, shippingAddresses, orders, orderItems, productReviews, orderStatusHistory } from "./schema";

// Type definitions
type Product = InferSelectModel<typeof products>;
type ShippingAddress = InferSelectModel<typeof shippingAddresses>;
type Order = InferSelectModel<typeof orders>;

// ============================================================================
// Configuration & Constants
// ============================================================================

const SEED_CONFIG = {
  // User accounts
  ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? "admin@ecommerce.com",
  ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!@#",

  // Control what to seed
  SEED_USERS: process.env.SEED_USERS !== "false",
  SEED_CATEGORIES: process.env.SEED_CATEGORIES !== "false",
  SEED_PRODUCTS: process.env.SEED_PRODUCTS !== "false",
  SEED_ORDERS: process.env.SEED_ORDERS !== "false",
  SEED_REVIEWS: process.env.SEED_REVIEWS !== "false",

  // Data volume control
  CUSTOMER_COUNT: parseInt(process.env.SEED_CUSTOMER_COUNT ?? "10", 10),
  ORDERS_PER_CUSTOMER: parseInt(process.env.SEED_ORDERS_PER_CUSTOMER ?? "3", 10),
  REVIEWS_PERCENTAGE: parseFloat(process.env.SEED_REVIEWS_PERCENTAGE ?? "0.7"), // 70% of orders get reviews

  // Environment
  ENVIRONMENT: env.NODE_ENV || "development",
} as const;

// ============================================================================
// Data Definitions
// ============================================================================

// Main category hierarchy for modern e-commerce
const CATEGORY_HIERARCHY = [
  {
    name: "Electronics",
    description: "Latest technology and electronic devices",
    children: [
      { name: "Smartphones", description: "Mobile phones and accessories" },
      { name: "Laptops", description: "Portable computers and notebooks" },
      { name: "Tablets", description: "Tablet computers and e-readers" },
      { name: "Audio", description: "Headphones, speakers, and audio equipment" },
      { name: "Gaming", description: "Gaming consoles, accessories, and equipment" },
      { name: "Smart Home", description: "IoT devices and home automation" },
      { name: "Wearables", description: "Smartwatches and fitness trackers" },
    ],
  },
  {
    name: "Fashion",
    description: "Clothing, shoes, and fashion accessories",
    children: [
      { name: "Men's Clothing", description: "Fashion for men" },
      { name: "Women's Clothing", description: "Fashion for women" },
      { name: "Shoes", description: "Footwear for all occasions" },
      { name: "Accessories", description: "Bags, jewelry, and fashion accessories" },
      { name: "Sportswear", description: "Athletic and fitness clothing" },
    ],
  },
  {
    name: "Home & Garden",
    description: "Home improvement and garden supplies",
    children: [
      { name: "Furniture", description: "Home and office furniture" },
      { name: "Kitchen", description: "Kitchen appliances and cookware" },
      { name: "Bedding", description: "Bed linens and bedroom accessories" },
      { name: "Garden Tools", description: "Gardening equipment and supplies" },
      { name: "Home Decor", description: "Decorative items and artwork" },
    ],
  },
  {
    name: "Sports & Outdoors",
    description: "Sports equipment and outdoor gear",
    children: [
      { name: "Fitness", description: "Exercise and fitness equipment" },
      { name: "Outdoor Recreation", description: "Camping, hiking, and outdoor gear" },
      { name: "Team Sports", description: "Equipment for team sports" },
      { name: "Water Sports", description: "Swimming, surfing, and water activities" },
    ],
  },
  {
    name: "Books & Media",
    description: "Books, movies, music, and educational content",
    children: [
      { name: "Books", description: "Physical and digital books" },
      { name: "Movies & TV", description: "DVDs, Blu-rays, and digital content" },
      { name: "Music", description: "CDs, vinyl records, and digital music" },
      { name: "Games", description: "Board games, puzzles, and educational games" },
    ],
  },
] as const;

// Sample product templates for realistic catalog
const PRODUCT_TEMPLATES = {
  Smartphones: [
    {
      name: "iPhone 15 Pro",
      description:
        "The most advanced iPhone yet with titanium design, A17 Pro chip, and professional camera system. Features 48MP main camera, 5x telephoto zoom, and all-day battery life.",
      price: "999.99",
      weight: "0.187",
      inventoryQuantity: 50,
      tags: ["apple", "smartphone", "5g", "camera", "titanium"],
      images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"],
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      description:
        "Ultimate smartphone experience with S Pen, 200MP camera, and AI-powered features. Built with premium materials and exceptional performance.",
      price: "1199.99",
      weight: "0.233",
      inventoryQuantity: 35,
      tags: ["samsung", "android", "s-pen", "camera", "5g"],
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
    },
    {
      name: "Google Pixel 8",
      description:
        "Pure Android experience with Google's most advanced AI photography. Features Magic Eraser, Real Tone, and 7 years of security updates.",
      price: "699.99",
      weight: "0.197",
      inventoryQuantity: 40,
      tags: ["google", "pixel", "android", "ai", "camera"],
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
    },
  ],
  Laptops: [
    {
      name: "MacBook Pro 14-inch M3",
      description:
        "Supercharged by M3 chip, featuring 18-hour battery life, Liquid Retina XDR display, and advanced camera and audio. Perfect for professionals.",
      price: "1999.99",
      weight: "1.550",
      inventoryQuantity: 25,
      tags: ["apple", "macbook", "m3", "professional", "retina"],
      images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
    },
    {
      name: "Dell XPS 13 Plus",
      description:
        "Ultra-portable laptop with InfinityEdge display, 12th Gen Intel processors, and premium carbon fiber build. Ideal for productivity.",
      price: "1299.99",
      weight: "1.240",
      inventoryQuantity: 30,
      tags: ["dell", "xps", "ultrabook", "intel", "carbon-fiber"],
      images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800"],
    },
    {
      name: "ASUS ROG Strix G15",
      description:
        "Gaming laptop powered by AMD Ryzen 9 and NVIDIA RTX 4070. Features 144Hz display, RGB keyboard, and advanced cooling system.",
      price: "1599.99",
      weight: "2.300",
      inventoryQuantity: 20,
      tags: ["asus", "gaming", "ryzen", "rtx", "rgb"],
      images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"],
    },
  ],
  Audio: [
    {
      name: "Sony WH-1000XM5",
      description:
        "Industry-leading noise canceling with exceptional sound quality. 30-hour battery life and crystal-clear hands-free calling.",
      price: "399.99",
      weight: "0.250",
      inventoryQuantity: 45,
      tags: ["sony", "wireless", "noise-canceling", "bluetooth", "premium"],
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
    },
    {
      name: "Bose QuietComfort 45",
      description:
        "Legendary noise cancellation meets incredible audio performance. Comfortable design for all-day listening with 24-hour battery.",
      price: "329.99",
      weight: "0.240",
      inventoryQuantity: 40,
      tags: ["bose", "quietcomfort", "noise-canceling", "comfort", "wireless"],
      images: ["https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800"],
    },
  ],
  "Men's Clothing": [
    {
      name: "Classic Denim Jacket",
      description:
        "Timeless denim jacket crafted from premium cotton. Perfect for layering with versatile styling options for casual to smart-casual looks.",
      price: "89.99",
      weight: "0.680",
      inventoryQuantity: 60,
      tags: ["denim", "jacket", "casual", "cotton", "classic"],
      images: ["https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800"],
    },
    {
      name: "Premium Cotton T-Shirt",
      description:
        "Essential crew neck t-shirt made from 100% organic cotton. Soft, comfortable, and sustainably sourced with a perfect fit.",
      price: "29.99",
      weight: "0.180",
      inventoryQuantity: 100,
      tags: ["t-shirt", "cotton", "organic", "casual", "sustainable"],
      images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"],
    },
  ],
  "Women's Clothing": [
    {
      name: "Elegant Summer Dress",
      description:
        "Flowing midi dress perfect for summer occasions. Made from breathable fabric with flattering silhouette and vibrant prints.",
      price: "79.99",
      weight: "0.320",
      inventoryQuantity: 45,
      tags: ["dress", "summer", "midi", "elegant", "breathable"],
      images: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800"],
    },
  ],
  Fitness: [
    {
      name: "Adjustable Dumbbells Set",
      description:
        "Space-saving adjustable dumbbells ranging from 5-50 lbs per hand. Quick-change weight system perfect for home workouts.",
      price: "299.99",
      weight: "30.000",
      inventoryQuantity: 15,
      tags: ["dumbbells", "fitness", "adjustable", "home-gym", "strength"],
      images: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"],
    },
  ],
  Books: [
    {
      name: "The Psychology of Programming",
      description:
        "Essential reading for software developers and managers. Explores the human factors in programming and software development.",
      price: "34.99",
      weight: "0.450",
      inventoryQuantity: 75,
      tags: ["programming", "psychology", "software", "development", "technical"],
      images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800"],
    },
  ],
} as const;

// Sample customer data for realistic testing
const SAMPLE_CUSTOMERS = [
  { firstName: "Alice", lastName: "Johnson", email: "alice.johnson@example.com" },
  { firstName: "Bob", lastName: "Smith", email: "bob.smith@example.com" },
  { firstName: "Carol", lastName: "Davis", email: "carol.davis@example.com" },
  { firstName: "David", lastName: "Wilson", email: "david.wilson@example.com" },
  { firstName: "Emma", lastName: "Brown", email: "emma.brown@example.com" },
  { firstName: "Frank", lastName: "Miller", email: "frank.miller@example.com" },
  { firstName: "Grace", lastName: "Taylor", email: "grace.taylor@example.com" },
  { firstName: "Henry", lastName: "Anderson", email: "henry.anderson@example.com" },
  { firstName: "Iris", lastName: "Thomas", email: "iris.thomas@example.com" },
  { firstName: "Jack", lastName: "Jackson", email: "jack.jackson@example.com" },
] as const;

// Sample review templates for realistic feedback
const REVIEW_TEMPLATES = {
  positive: [
    {
      rating: 5,
      title: "Excellent quality!",
      comment: "Exceeded my expectations. The build quality is outstanding and it works perfectly. Highly recommended!",
    },
    {
      rating: 4,
      title: "Great value for money",
      comment: "Really impressed with this purchase. Good quality and arrived quickly. Would buy again.",
    },
    {
      rating: 5,
      title: "Perfect!",
      comment: "Exactly what I was looking for. Fast shipping and excellent customer service.",
    },
  ],
  neutral: [
    {
      rating: 3,
      title: "It's okay",
      comment: "Does what it's supposed to do, but nothing special. Average quality for the price.",
    },
    {
      rating: 4,
      title: "Good but could be better",
      comment: "Generally satisfied with the purchase, though there are some minor issues to be aware of.",
    },
  ],
  negative: [
    {
      rating: 2,
      title: "Not as described",
      comment: "The product didn't match the description completely. It works but has some quality issues.",
    },
    {
      rating: 1,
      title: "Disappointed",
      comment: "Poor quality and doesn't work as expected. Would not recommend this product.",
    },
  ],
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get random element from array
 */
function getRandomElement<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random elements from array
 */
function getRandomElements<T>(array: readonly T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate random price variation (±10%)
 */
function varyPrice(basePrice: string): string {
  const base = parseFloat(basePrice);
  const variation = (Math.random() - 0.5) * 0.2; // ±10%
  const newPrice = base * (1 + variation);
  return newPrice.toFixed(2);
}

/**
 * Generate order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}-${random}`;
}

/**
 * Check if data already exists to make seeding idempotent
 */
async function checkExistingData() {
  const [adminUser, categoriesCount, productsCount] = await Promise.all([
    db.select().from(users).where(eq(users.email, SEED_CONFIG.ADMIN_EMAIL)).limit(1),
    db.select({ count: sql<number>`count(*)` }).from(categories),
    db.select({ count: sql<number>`count(*)` }).from(products),
  ]);

  return {
    hasAdmin: adminUser.length > 0,
    hasCategories: categoriesCount[0].count > 0,
    hasProducts: productsCount[0].count > 0,
  };
}

// ============================================================================
// Seeding Functions
// ============================================================================

/**
 * Create admin and sample users
 */
async function seedUsers() {
  logger.info("🔐 Seeding users...");

  const existingData = await checkExistingData();

  if (existingData.hasAdmin) {
    logger.info("Admin user already exists, skipping user seeding");
    return;
  }

  // Create admin user
  const hashedAdminPassword = await hashPassword(SEED_CONFIG.ADMIN_PASSWORD);

  const [adminUser] = await db
    .insert(users)
    .values({
      email: SEED_CONFIG.ADMIN_EMAIL,
      password: hashedAdminPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
    })
    .returning();

  logger.info(`✅ Created admin user: ${adminUser.email}`);

  // Create sample customers
  if (SEED_CONFIG.SEED_USERS) {
    const customerData = await Promise.all(
      SAMPLE_CUSTOMERS.slice(0, SEED_CONFIG.CUSTOMER_COUNT).map(async (customer) => ({
        ...customer,
        password: await hashPassword("Customer123!"),
        role: "customer" as const,
      }))
    );

    const customers = await db.insert(users).values(customerData).returning();
    logger.info(`✅ Created ${customers.length} sample customers`);
  }
}

/**
 * Create category hierarchy
 */
async function seedCategories() {
  if (!SEED_CONFIG.SEED_CATEGORIES) {
    return;
  }

  logger.info("📁 Seeding categories...");

  const existingData = await checkExistingData();
  if (existingData.hasCategories) {
    logger.info("Categories already exist, skipping category seeding");
    return;
  }

  // Get admin user for createdBy field
  const adminUser = await db.select().from(users).where(eq(users.role, "admin")).limit(1);

  if (adminUser.length === 0) {
    throw new Error("Admin user not found. Please run user seeding first.");
  }

  const adminId = adminUser[0].id;
  const categoryMap = new Map<string, string>();

  // Create parent categories first
  for (const parentCategory of CATEGORY_HIERARCHY) {
    const [category] = await db
      .insert(categories)
      .values({
        name: parentCategory.name,
        slug: generateSlug(parentCategory.name),
        description: parentCategory.description,
        isActive: true,
        createdBy: adminId,
      })
      .returning();

    categoryMap.set(parentCategory.name, category.id);
    logger.info(`📁 Created parent category: ${category.name}`);

    // Create child categories
    for (const childCategory of parentCategory.children) {
      const [child] = await db
        .insert(categories)
        .values({
          name: childCategory.name,
          slug: generateSlug(childCategory.name),
          description: childCategory.description,
          parentId: category.id,
          isActive: true,
          createdBy: adminId,
        })
        .returning();

      categoryMap.set(childCategory.name, child.id);
      logger.info(`  📄 Created child category: ${child.name}`);
    }
  }

  logger.info(`✅ Created ${categoryMap.size} categories`);
  return categoryMap;
}

/**
 * Create sample products
 */
async function seedProducts(categoryMap?: Map<string, string>) {
  if (!SEED_CONFIG.SEED_PRODUCTS) {
    return;
  }

  logger.info("📦 Seeding products...");

  const existingData = await checkExistingData();
  if (existingData.hasProducts) {
    logger.info("Products already exist, skipping product seeding");
    return;
  }

  // Get admin user and categories if not provided
  const adminUser = await db.select().from(users).where(eq(users.role, "admin")).limit(1);

  if (adminUser.length === 0) {
    throw new Error("Admin user not found. Please run user seeding first.");
  }

  if (!categoryMap) {
    const allCategories = await db.select().from(categories);
    categoryMap = new Map(allCategories.map((cat) => [cat.name, cat.id]));
  }

  const adminId = adminUser[0].id;
  const allProducts = [];

  // Create products for each category
  for (const [categoryName, templates] of Object.entries(PRODUCT_TEMPLATES)) {
    const categoryId = categoryMap.get(categoryName);

    if (!categoryId) {
      logger.warn(`Category not found: ${categoryName}`);
      continue;
    }

    for (const template of templates) {
      const productData = {
        ...template,
        slug: generateSlug(template.name),
        categoryId,
        createdBy: adminId,
        status: "active" as const,
        price: varyPrice(template.price), // Add price variation
        allowBackorder: false,
        images: [...template.images], // Convert readonly array to mutable
        tags: [...template.tags], // Convert readonly array to mutable
      };

      const [product] = await db.insert(products).values(productData).returning();
      allProducts.push(product);

      logger.info(`📦 Created product: ${product.name} (${categoryName})`);
    }
  }

  logger.info(`✅ Created ${allProducts.length} products`);
  return allProducts;
}

/**
 * Create sample shipping addresses for customers
 */
async function seedShippingAddresses() {
  logger.info("🏠 Seeding shipping addresses...");

  const customers = await db.select().from(users).where(eq(users.role, "customer"));

  if (customers.length === 0) {
    logger.info("No customers found, skipping shipping addresses");
    return;
  }

  const addressTemplates = [
    {
      firstName: "Default",
      lastName: "Address",
      addressLine1: "123 Main Street",
      addressLine2: undefined,
      company: undefined,
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "United States",
    },
    {
      firstName: "Work",
      lastName: "Address",
      company: "Tech Corp",
      addressLine1: "456 Business Ave",
      addressLine2: "Suite 100",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "United States",
    },
  ];

  const addresses = [];

  for (const customer of customers) {
    for (let i = 0; i < addressTemplates.length; i++) {
      const template = addressTemplates[i];
      const [address] = await db
        .insert(shippingAddresses)
        .values({
          userId: customer.id,
          firstName: template.firstName || customer.firstName,
          lastName: template.lastName || customer.lastName,
          company: template.company,
          addressLine1: template.addressLine1,
          addressLine2: template.addressLine2,
          city: template.city,
          state: template.state,
          postalCode: template.postalCode,
          country: template.country,
          isDefault: i === 0, // First address is default
        })
        .returning();

      addresses.push(address);
    }
  }

  logger.info(`✅ Created ${addresses.length} shipping addresses`);
  return addresses;
}

/**
 * Create sample orders
 */
async function seedOrders(productList?: Product[], addressList?: ShippingAddress[]) {
  if (!SEED_CONFIG.SEED_ORDERS) {
    return;
  }

  logger.info("🛒 Seeding orders...");

  const customers = await db.select().from(users).where(eq(users.role, "customer"));

  productList ??= await db.select().from(products);
  addressList ??= await db.select().from(shippingAddresses);

  if (customers.length === 0 || productList.length === 0 || addressList.length === 0) {
    logger.info("Missing required data for orders, skipping");
    return;
  }

  const allOrders = [];

  for (const customer of customers) {
    const customerAddresses = addressList.filter((addr) => addr.userId === customer.id);
    if (customerAddresses.length === 0) {
      continue;
    }

    const orderCount = Math.min(SEED_CONFIG.ORDERS_PER_CUSTOMER, 5);

    for (let i = 0; i < orderCount; i++) {
      const orderProducts = getRandomElements(productList, Math.floor(Math.random() * 3) + 1);
      const shippingAddress = getRandomElement(customerAddresses);

      let subtotal = 0;
      const items = orderProducts.map((product) => {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = parseFloat(product.price);
        const totalPrice = unitPrice * quantity;
        subtotal += totalPrice;

        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        };
      });

      const taxAmount = subtotal * 0.08; // 8% tax
      const shippingAmount = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order
      const [order] = await db
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          userId: customer.id,
          shippingAddressId: shippingAddress.id,
          status: getRandomElement(["pending", "confirmed", "processing", "shipped", "delivered"]),
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          shippingAmount: shippingAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          shippingMethod: getRandomElement(["standard", "express", "free_shipping"]),
          confirmedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
        })
        .returning();

      // Create order items
      const orderItemsData = items.map((item) => ({
        ...item,
        orderId: order.id,
      }));

      await db.insert(orderItems).values(orderItemsData);

      // Create status history
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        previousStatus: null,
        newStatus: order.status,
        comment: "Order created",
        isCustomerVisible: true,
      });

      allOrders.push({ order, items: orderItemsData });
      logger.info(`🛒 Created order: ${order.orderNumber} for ${customer.email}`);
    }
  }

  logger.info(`✅ Created ${allOrders.length} orders`);
  return allOrders;
}

/**
 * Create sample product reviews
 */
async function seedReviews(orderList?: { order: Order; items: { productId: string; orderId: string }[] }[]) {
  if (!SEED_CONFIG.SEED_REVIEWS) {
    return;
  }

  logger.info("⭐ Seeding product reviews...");

  if (!orderList) {
    // Get orders with their items
    const ordersData = await db
      .select()
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(orders.status, "delivered"));

    orderList = ordersData.map((row) => ({
      order: row.orders,
      items: [row.order_items],
    }));
  }

  const reviews = [];

  for (const { order, items } of orderList) {
    // Only create reviews for a percentage of delivered orders
    if (Math.random() > SEED_CONFIG.REVIEWS_PERCENTAGE) {
      continue;
    }

    for (const item of items) {
      // Skip if review already exists
      const existingReview = await db
        .select()
        .from(productReviews)
        .where(and(eq(productReviews.userId, order.userId), eq(productReviews.productId, item.productId)))
        .limit(1);

      if (existingReview.length > 0) {
        continue;
      }

      // Choose review type based on weighted probability
      const rand = Math.random();
      let reviewTemplate;

      if (rand < 0.7) {
        // 70% positive
        reviewTemplate = getRandomElement(REVIEW_TEMPLATES.positive);
      } else if (rand < 0.9) {
        // 20% neutral
        reviewTemplate = getRandomElement(REVIEW_TEMPLATES.neutral);
      } else {
        // 10% negative
        reviewTemplate = getRandomElement(REVIEW_TEMPLATES.negative);
      }

      const [review] = await db
        .insert(productReviews)
        .values({
          userId: order.userId,
          productId: item.productId,
          orderId: order.id,
          rating: reviewTemplate.rating,
          title: reviewTemplate.title,
          comment: reviewTemplate.comment,
          isVerifiedPurchase: true,
          createdAt: new Date((order.confirmedAt?.getTime() ?? Date.now()) + Math.random() * 14 * 24 * 60 * 60 * 1000), // 1-14 days after order
        })
        .returning();

      reviews.push(review);
    }
  }

  logger.info(`✅ Created ${reviews.length} product reviews`);
  return reviews;
}

// ============================================================================
// Main Seeding Function
// ============================================================================

/**
 * Main seeding function with comprehensive error handling
 */
async function runSeed() {
  const startTime = Date.now();

  try {
    logger.info("🌱 Starting database seeding...");
    logger.info(`Environment: ${SEED_CONFIG.ENVIRONMENT}`);
    logger.info(`Admin Email: ${SEED_CONFIG.ADMIN_EMAIL}`);

    // Check if this is production environment
    if (SEED_CONFIG.ENVIRONMENT === "production") {
      logger.warn("⚠️  Running in PRODUCTION environment!");
      logger.warn("⚠️  Make sure this is intentional and you have proper backups!");

      // In production, require explicit confirmation
      if (!process.env.SEED_PRODUCTION_CONFIRMED) {
        throw new Error("Production seeding requires SEED_PRODUCTION_CONFIRMED=true environment variable");
      }
    }

    // Run seeding steps in dependency order
    logger.info("📋 Seeding plan:");
    logger.info(`  - Users: ${SEED_CONFIG.SEED_USERS ? "✓" : "✗"}`);
    logger.info(`  - Categories: ${SEED_CONFIG.SEED_CATEGORIES ? "✓" : "✗"}`);
    logger.info(`  - Products: ${SEED_CONFIG.SEED_PRODUCTS ? "✓" : "✗"}`);
    logger.info(`  - Orders: ${SEED_CONFIG.SEED_ORDERS ? "✓" : "✗"}`);
    logger.info(`  - Reviews: ${SEED_CONFIG.SEED_REVIEWS ? "✓" : "✗"}`);

    // Execute seeding steps
    await seedUsers();
    const categoryMap = await seedCategories();
    const productList = await seedProducts(categoryMap);
    const addressList = await seedShippingAddresses();
    const orderList = await seedOrders(productList, addressList);
    await seedReviews(orderList);

    const duration = Date.now() - startTime;
    logger.info(`🎉 Database seeding completed successfully in ${duration}ms`);

    // Log summary
    const [userCount, categoryCount, productCount, orderCount, reviewCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(categories),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(productReviews),
    ]);

    logger.info("📊 Final counts:");
    logger.info(`  - Users: ${userCount[0].count}`);
    logger.info(`  - Categories: ${categoryCount[0].count}`);
    logger.info(`  - Products: ${productCount[0].count}`);
    logger.info(`  - Orders: ${orderCount[0].count}`);
    logger.info(`  - Reviews: ${reviewCount[0].count}`);

    // Log admin credentials for convenience
    if (SEED_CONFIG.ENVIRONMENT !== "production") {
      logger.info("🔑 Admin credentials:");
      logger.info(`  Email: ${SEED_CONFIG.ADMIN_EMAIL}`);
      logger.info(`  Password: ${SEED_CONFIG.ADMIN_PASSWORD}`);
    }

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("❌ Database seeding failed", error as Error, {
      duration,
    });
    process.exit(1);
  }
}

// ============================================================================
// Export & Execution
// ============================================================================

// Export individual functions for testing
export { seedUsers, seedCategories, seedProducts, seedShippingAddresses, seedOrders, seedReviews, SEED_CONFIG };

// Run seeding if called directly
if (import.meta.main) {
  runSeed().catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}

export default runSeed;
