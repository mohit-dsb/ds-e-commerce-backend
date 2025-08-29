import { Context } from "hono";
import { extractAuthTokensFromCookies, setSecureCookies, clearAuthCookies } from "@/utils/cookie";

// ============================================================================
// Security Middleware for Cookie-based Authentication
// ============================================================================

/**
 * Security Headers Middleware
 * Adds security headers for cookie-based authentication
 */
export const securityHeadersMiddleware = async (c: Context, next: () => Promise<void>) => {
  // Add security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add CSP header for additional protection
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );

  await next();
};

// ============================================================================
// Helper Functions for Controllers
// ============================================================================

/**
 * Set authentication cookies in response
 * @param c - Hono context
 * @param tokens - Authentication tokens to set
 */
export const setAuthenticationCookies = (
  c: Context,
  tokens: {
    accessToken: string;
    refreshToken: string;
  }
) => {
  const setCookieHeaders: string[] = [];

  setSecureCookies(setCookieHeaders, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  // Add Set-Cookie headers to response
  setCookieHeaders.forEach((cookieHeader) => {
    c.header("Set-Cookie", cookieHeader);
  });
};

/**
 * Clear authentication cookies from response
 * @param c - Hono context
 */
export const clearAuthenticationCookies = (c: Context) => {
  const setCookieHeaders: string[] = [];
  clearAuthCookies(setCookieHeaders);

  // Add Set-Cookie headers to response
  setCookieHeaders.forEach((cookieHeader) => {
    c.header("Set-Cookie", cookieHeader);
  });
};

/**
 * Get authentication tokens from request (cookies or headers)
 * Prioritizes cookie-based authentication
 * @param c - Hono context
 * @returns Authentication tokens and method used
 */
export const getAuthenticationTokens = (c: Context) => {
  // First try cookies
  const cookieHeader = c.req.header("Cookie");
  const cookieTokens = extractAuthTokensFromCookies(cookieHeader);

  if (cookieTokens.accessToken) {
    return {
      ...cookieTokens,
      method: "cookie" as const,
    };
  }

  // Fallback to Authorization header
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return {
      accessToken: authHeader.substring(7),
      refreshToken: null,
      method: "bearer" as const,
    };
  }

  return {
    accessToken: null,
    refreshToken: null,
    method: null,
  };
};
