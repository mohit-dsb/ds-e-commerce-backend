# E-commerce Backend

A modern e-commerce backend built with Hono, Bun, and Drizzle ORM with Neon PostgreSQL.

## Features

- 🔐 **Authentication System**
  - User registration and login
  - JWT-based sessions
  - Password reset functionality
  - Secure password hashing with bcrypt
  - Session management

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
