import { logger } from "@/utils/logger";
import { isProduction } from "@/config/env";

// ============================================================================
// Cookie Configuration Constants
// ============================================================================

/**
 * Production-level cookie security configuration
 * Following OWASP recommendations and industry best practices
 */
export const COOKIE_CONFIG = {
  // Access token cookie - short-lived
  ACCESS_TOKEN: {
    name: "ds-e-commerce-auth-token",
    maxAge: 15 * 60, // 15 minutes in seconds
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "strict" as const, // CSRF protection
    path: "/",
    domain: undefined, // Let browser determine domain
  },

  // Refresh token cookie - long-lived
  REFRESH_TOKEN: {
    name: "ds-e-commerce-refresh-token",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "strict" as const, // CSRF protection via SameSite
    path: "/api/auth", // Restrict to auth endpoints only
    domain: undefined, // Let browser determine domain
  },
} as const;

/**
 * Development-specific cookie configuration
 * Less restrictive for development environments
 */
export const DEV_COOKIE_CONFIG = {
  ACCESS_TOKEN: {
    ...COOKIE_CONFIG.ACCESS_TOKEN,
    secure: false,
    sameSite: "lax" as const,
  },
  REFRESH_TOKEN: {
    ...COOKIE_CONFIG.REFRESH_TOKEN,
    secure: false,
    sameSite: "lax" as const,
  },
} as const;

// ============================================================================
// Cookie Utility Functions
// ============================================================================

/**
 * Get appropriate cookie configuration based on environment
 */
export const getCookieConfig = () => {
  return isProduction ? COOKIE_CONFIG : DEV_COOKIE_CONFIG;
};

/**
 * Create a secure cookie string for Set-Cookie header
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns Formatted cookie string
 */
export const createCookieString = (
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    path?: string;
    domain?: string;
  }
): string => {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
    // Also set Expires for older browsers
    const expires = new Date(Date.now() + options.maxAge * 1000);
    parts.push(`Expires=${expires.toUTCString()}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  return parts.join("; ");
};

/**
 * Set multiple cookies in response headers
 * @param setCookieHeaders - Array to push Set-Cookie headers to
 * @param cookies - Object containing cookie name-value pairs
 */
export const setSecureCookies = (
  setCookieHeaders: string[],
  cookies: {
    accessToken?: string;
    refreshToken?: string;
  }
): void => {
  const config = getCookieConfig();

  if (cookies.accessToken) {
    setCookieHeaders.push(createCookieString(config.ACCESS_TOKEN.name, cookies.accessToken, config.ACCESS_TOKEN));

    logger.debug("Access token cookie set", {
      metadata: {
        cookieName: config.ACCESS_TOKEN.name,
        maxAge: config.ACCESS_TOKEN.maxAge,
        secure: config.ACCESS_TOKEN.secure,
        httpOnly: config.ACCESS_TOKEN.httpOnly,
      },
    });
  }

  if (cookies.refreshToken) {
    setCookieHeaders.push(createCookieString(config.REFRESH_TOKEN.name, cookies.refreshToken, config.REFRESH_TOKEN));

    logger.debug("Refresh token cookie set", {
      metadata: {
        cookieName: config.REFRESH_TOKEN.name,
        maxAge: config.REFRESH_TOKEN.maxAge,
        path: config.REFRESH_TOKEN.path,
      },
    });
  }
};

/**
 * Clear authentication cookies by setting them to expire
 * @param setCookieHeaders - Array to push Set-Cookie headers to
 */
export const clearAuthCookies = (setCookieHeaders: string[]): void => {
  const config = getCookieConfig();

  // Clear access token
  setCookieHeaders.push(
    createCookieString(config.ACCESS_TOKEN.name, "", {
      ...config.ACCESS_TOKEN,
      maxAge: 0,
    })
  );

  // Clear refresh token
  setCookieHeaders.push(
    createCookieString(config.REFRESH_TOKEN.name, "", {
      ...config.REFRESH_TOKEN,
      maxAge: 0,
    })
  );

  logger.info("Authentication cookies cleared");
};

/**
 * Extract token from cookies
 * @param cookieHeader - Cookie header string
 * @param tokenName - Name of the token cookie
 * @returns Token value or null if not found
 */
export const extractTokenFromCookies = (cookieHeader: string | undefined, tokenName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        acc[name] = decodeURIComponent(value);
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return cookies[tokenName] || null;
};

/**
 * Extract all authentication tokens from cookies
 * @param cookieHeader - Cookie header string
 * @returns Object containing extracted tokens
 */
export const extractAuthTokensFromCookies = (cookieHeader: string | undefined) => {
  const config = getCookieConfig();

  return {
    accessToken: extractTokenFromCookies(cookieHeader, config.ACCESS_TOKEN.name),
    refreshToken: extractTokenFromCookies(cookieHeader, config.REFRESH_TOKEN.name),
  };
};
