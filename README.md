# DS E-Commerce Backend

A production-ready, enterprise-grade e-commerce backend API built with modern technologies and industry best practices.

## 🚀 Features

### ✨ Core Features
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Product Management**: Complete product lifecycle with variants, categories, and inventory
- **Image Upload & Management**: Cloudinary integration for product photo storage with transformations
- **Category Management**: Hierarchical product categories with admin-only access
- **User Management**: Registration, login, password reset, profile management
- **Session Management**: Secure session handling with automatic cleanup
- **Inventory Tracking**: Multiple inventory modes (none, quantity, variants)
- **Search & Filtering**: Advanced product search with multiple filter options

### 🛡️ Security Features
- **Password Security**: Bcrypt hashing with configurable rounds
- **JWT Tokens**: Secure token generation and validation
- **Role-Based Access**: Customer and admin role separation
- **Input Validation**: Comprehensive Zod schema validation
- **Error Handling**: Structured error responses without sensitive data exposure

### 🏗️ Production-Ready Architecture
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Error Handling**: Comprehensive error classes and centralized error handling
- **Logging**: Structured JSON logging with different levels and contexts
- **Validation**: Request validation middleware with user-friendly error messages
- **Database**: Type-safe database operations with Drizzle ORM
- **Health Checks**: Built-in health monitoring endpoints

A modern e-commerce backend built with Hono, Bun, and Drizzle ORM with Neon PostgreSQL.

## Features

- 🔐 **Authentication System**
  - User registration and login
  - JWT-based sessions
  - Password reset functionality
  - Secure password hashing with bcrypt
  - Session management

- 🛍️ **Product Management**
  - Complete product CRUD operations
  - Product variants with different prices and attributes
  - Multiple product images and gallery support
  - Product categories (primary and additional)
  - Product options (size, color, etc.)
  - inventory tracking
  - Product status management (draft, active, inactive, discontinued)
  - Advanced search and filtering
  - Low stock alerts and bulk operations
  - SEO-friendly slugs and meta tags

- 📦 **Inventory Management**
  - Multiple tracking modes: none, quantity, variants
  - Low stock threshold alerts
  - Backorder support
  - Bulk status updates

- � **Enterprise-Grade Error Handling**
  - Structured logging with request tracing
  - Custom error classes with proper categorization
  - Database error mapping and handling
  - Security-aware error sanitization
  - Consistent API response format
  - Production-ready error monitoring

- �🛠 **Tech Stack**
  - **Runtime**: Bun
  - **Framework**: Hono
  - **Database**: Neon PostgreSQL
  - **ORM**: Drizzle ORM
  - **Validation**: Zod
  - **Authentication**: JWT + bcrypt
  - **Logging**: Structured JSON logging
  - **Error Handling**: Custom error classes with context

## Setup

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your values:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `JWT_SECRET`: A secure random string (min 32 characters)
   
   **Important**: You need to create a Neon PostgreSQL database and get the connection string from [console.neon.tech](https://console.neon.tech)

4. **Database setup**:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

5. **Start development server**:
   ```bash
   bun run dev
   ```

## Next Steps

1. **Set up your Neon PostgreSQL database**:
   - Go to [console.neon.tech](https://console.neon.tech)
   - Create a new project/database
   - Copy the connection string to your `.env` file

2. **Run database migrations** (only after setting up the database):
   ```bash
   bun run db:migrate
   ```

3. **Test the API**:
   ```bash
   bun run test:api
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/categories/slug/:slug` - Get category by slug
- `POST /api/categories` - Create category (Admin)
- `PATCH /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Products

#### Public Endpoints
- `GET /api/products` - Get all products with filtering and pagination
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/slug/:slug` - Get product by slug
- `GET /api/products/category/:categoryId` - Get products by category
- `GET /api/products/search` - Search products

#### Admin Endpoints
- `POST /api/products` - Create new product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/low-stock` - Get low stock products
- `PATCH /api/products/bulk-status` - Bulk update product status

#### Image Upload Endpoints (Admin Only)
- `POST /api/products/upload-image` - Upload a single product image
- `POST /api/products/upload-images` - Upload multiple product images (batch)
- `PATCH /api/products/:id/images` - Update product images (add/remove/replace)
- `DELETE /api/products/:id/images/:publicId` - Delete a specific product image

#### Product Query Parameters

**GET /api/products** supports the following query parameters:
- `status` - Filter by status: `draft`, `active`, `inactive`, `discontinued`
- `categoryId` - Filter by category UUID
- `minPrice` - Minimum price filter (decimal string)
- `maxPrice` - Maximum price filter (decimal string)
- `inStock` - Filter by availability: `true`/`false`
- `tags` - Comma-separated list of tags
- `search` - Search in name, description
- `sortBy` - Sort field: `name`, `price`, `createdAt`, `updatedAt`, `inventoryQuantity`
- `sortOrder` - Sort direction: `asc`, `desc`
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Examples:**
```bash
# Get active products under $100
GET /api/products?status=active&maxPrice=100&sortBy=price&sortOrder=asc

# Search for "laptop" in electronics category
GET /api/products?search=laptop&categoryId=uuid-here&page=1&limit=10

# Get products with specific tags
GET /api/products?tags=featured,bestseller&inStock=true
```

### Image Upload API

The API provides comprehensive image upload functionality using Cloudinary for storage and CDN delivery.

#### Configuration

Set up the following environment variables for Cloudinary integration:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=ecommerce
```

#### Single Image Upload

**POST /api/products/upload-image**

Upload a single product image with optional transformations.

```bash
curl -X POST \
  -H "Authorization: Bearer your_jwt_token" \
  -F "image=@product-photo.jpg" \
  -F 'transformation={"width":800,"height":600,"crop":"fill","quality":"auto","format":"webp"}' \
  http://localhost:3000/api/products/upload-image
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "image": {
      "publicId": "products/abc123def456",
      "url": "http://res.cloudinary.com/your-cloud/image/upload/products/abc123def456.jpg",
      "secureUrl": "https://res.cloudinary.com/your-cloud/image/upload/products/abc123def456.jpg",
      "format": "jpg",
      "width": 800,
      "height": 600,
      "bytes": 245760
    }
  }
}
```

#### Multiple Images Upload

**POST /api/products/upload-images**

Upload multiple product images in a single request.

```bash
curl -X POST \
  -H "Authorization: Bearer your_jwt_token" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "images=@photo3.png" \
  -F "maxFiles=5" \
  -F 'transformation={"width":1200,"height":800,"crop":"fill","quality":"auto"}' \
  http://localhost:3000/api/products/upload-images
```

#### Update Product Images

**PATCH /api/products/:id/images**

Add, remove, or replace product images.

```bash
# Add new images to existing ones
curl -X PATCH \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/products/new-image1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/products/new-image2.jpg"
    ]
  }' \
  http://localhost:3000/api/products/product-id/images

# Remove specific images
curl -X PATCH \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "remove",
    "imagesToRemove": ["products/old-image1", "products/old-image2"]
  }' \
  http://localhost:3000/api/products/product-id/images

# Replace all images
curl -X PATCH \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "replace",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/products/replacement1.jpg"
    ]
  }' \
  http://localhost:3000/api/products/product-id/images
```

#### Delete Single Image

**DELETE /api/products/:id/images/:publicId**

Remove a specific image from a product and Cloudinary.

```bash
curl -X DELETE \
  -H "Authorization: Bearer your_jwt_token" \
  http://localhost:3000/api/products/product-id/images/products%2Fimage-public-id
```

#### Image Transformation Options

All upload endpoints support optional transformations:

- `width` - Target width (50-2000px)
- `height` - Target height (50-2000px)
- `crop` - Crop mode: `fill`, `fit`, `limit`, `scale`, `pad`, `crop`
- `quality` - Quality: `auto` or 1-100
- `format` - Output format: `auto`, `jpg`, `png`, `webp`

#### File Constraints

- **Maximum file size**: 5MB per image
- **Allowed formats**: JPEG, PNG, WebP
- **Maximum images per product**: 10
- **Batch upload limit**: 5 images per request

## Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio
- `bun run test:api` - Test API endpoints (server must be running)
- `bun test-error-handling.ts` - Test error handling system

## Error Handling

This project implements comprehensive error handling following industry best practices:

### Key Features

- **Structured Logging**: JSON-formatted logs with request tracing
- **Custom Error Classes**: Specific error types for different scenarios
- **Request Correlation**: Every request gets a unique ID for tracing
- **Database Error Mapping**: PostgreSQL errors mapped to user-friendly messages
- **Security Sanitization**: Sensitive information filtered in production
- **Consistent API Format**: All responses follow the same structure

### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email" }],
    "timestamp": "2025-08-26T10:30:00.000Z",
    "requestId": "abc123def456",
    "path": "/api/auth/register"
  }
}
```

### Error Types

- `VALIDATION_ERROR` - Input validation failures
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RESOURCE_EXISTS` - Duplicate resource
- `DATABASE_ERROR` - Database operation failures
- `INTERNAL_SERVER_ERROR` - System errors

For detailed documentation, see [Error Handling Guide](./docs/ERROR_HANDLING.md).
