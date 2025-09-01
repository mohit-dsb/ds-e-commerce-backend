// Email service using nodemailer with modern functional approach and industry-standard practices
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface WelcomeEmailData {
  email: string;
  firstName: string;
  lastName: string;
}

export interface SecurityAlertEmailData {
  email: string;
  firstName: string;
  eventType: "password_reset" | "password_changed" | "login_from_new_device";
  timestamp: Date;
  ipAddress?: string;
  location?: string;
}

// ============================================================================
// Internal State Management
// ============================================================================

let transporter: Transporter | null = null;
let isInitialized = false;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Initialize the email transporter with secure configuration
 */
const initializeTransporter = async (): Promise<void> => {
  if (isInitialized && transporter) {
    return;
  }

  try {
    // Create transporter with secure configuration
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: env.NODE_ENV === "production",
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 5,
    });

    // Verify connection configuration
    if (transporter) {
      await transporter.verify();
    }
    isInitialized = true;

    logger.info("Email service initialized successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to initialize email service", error instanceof Error ? error : new Error(errorMessage));
    throw new Error("Email service initialization failed");
  }
};

/**
 * Send an email with the configured transporter
 */
const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    await initializeTransporter();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const mailOptions = {
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? stripHtml(options.html),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "DS E-commerce Backend",
      },
    };

    const result = (await transporter.sendMail(mailOptions)) as { messageId?: string };

    logger.info("Email sent successfully", {
      metadata: {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      },
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to send email", error instanceof Error ? error : new Error(errorMessage), {
      metadata: {
        to: options.to,
        subject: options.subject,
      },
    });
    return false;
  }
};

/**
 * Strip HTML tags for plain text version
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Parse user agent for display purposes
 */
const parseUserAgent = (userAgent: string): string => {
  if (userAgent.includes("Chrome")) {
    return "Chrome Browser";
  }
  if (userAgent.includes("Firefox")) {
    return "Firefox Browser";
  }
  if (userAgent.includes("Safari")) {
    return "Safari Browser";
  }
  if (userAgent.includes("Edge")) {
    return "Edge Browser";
  }
  if (userAgent.includes("Mobile")) {
    return "Mobile Device";
  }
  return "Unknown Device";
};

// ============================================================================
// Email Template Generators
// ============================================================================

/**
 * Generate password reset email HTML template
 */
const generatePasswordResetEmail = (data: PasswordResetEmailData): string => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${data.resetToken}`;
  const expiryMinutes = Math.floor((data.expiresAt.getTime() - Date.now()) / (1000 * 60));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        .content {
            margin-bottom: 30px;
        }
        .reset-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .security-info {
            background-color: #f8fafc;
            padding: 20px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .warning {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">DS E-commerce</div>
        </div>
        
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${data.firstName},</p>
            <p>We received a request to reset your password for your DS E-commerce account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
            </div>
            
            <p>This password reset link will expire in <strong>${expiryMinutes} minutes</strong>.</p>
            
            <div class="security-info">
                <h3>Security Information</h3>
                <p><strong>Request Details:</strong></p>
                <ul>
                    <li>Time: ${new Date().toLocaleString()}</li>
                    ${data.ipAddress ? `<li>IP Address: ${data.ipAddress}</li>` : ""}
                    ${data.userAgent ? `<li>Device: ${parseUserAgent(data.userAgent)}</li>` : ""}
                </ul>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged. For your security, consider changing your password if you suspect unauthorized access to your account.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from DS E-commerce. Please do not reply to this email.</p>
            <p>If you have questions, contact our support team.</p>
            <p>&copy; 2025 DS E-commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generate welcome email HTML template
 */
const generateWelcomeEmail = (data: WelcomeEmailData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to DS E-commerce</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        .welcome-banner {
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">DS E-commerce</div>
        </div>
        
        <div class="welcome-banner">
            <h1>Welcome to DS E-commerce!</h1>
            <p>Your account has been successfully created</p>
        </div>
        
        <div class="content">
            <p>Hello ${data.firstName},</p>
            <p>Welcome to DS E-commerce! We're excited to have you join our community of smart shoppers.</p>
            
            <p>Your account is now ready to use. You can:</p>
            <ul>
                <li>Browse our extensive product catalog</li>
                <li>Add items to your cart and wishlist</li>
                <li>Track your orders in real-time</li>
                <li>Manage your profile and preferences</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${env.FRONTEND_URL}/products" class="cta-button">Start Shopping</a>
            </div>
            
            <p>If you have any questions, our support team is here to help!</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing DS E-commerce!</p>
            <p>&copy; 2025 DS E-commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generate security alert email HTML template
 */
const generateSecurityAlertEmail = (data: SecurityAlertEmailData): string => {
  const eventMessages = {
    password_reset: "A password reset was requested for your account",
    password_changed: "Your account password was changed",
    login_from_new_device: "A new device logged into your account",
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .alert-header {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .alert-icon {
            color: #dc2626;
            font-size: 20px;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="alert-header">
            <span class="alert-icon">🔒</span>
            <strong>Security Alert</strong>
        </div>
        
        <p>Hello ${data.firstName},</p>
        <p>${eventMessages[data.eventType]}.</p>
        
        <p><strong>Event Details:</strong></p>
        <ul>
            <li>Time: ${data.timestamp.toLocaleString()}</li>
            ${data.ipAddress ? `<li>IP Address: ${data.ipAddress}</li>` : ""}
            ${data.location ? `<li>Location: ${data.location}</li>` : ""}
        </ul>
        
        <p>If this was you, no action is needed. If you didn't perform this action, please:</p>
        <ol>
            <li>Change your password immediately</li>
            <li>Review your account activity</li>
            <li>Contact our support team</li>
        </ol>
        
        <div class="footer">
            <p>This is an automated security alert from DS E-commerce.</p>
            <p>&copy; 2025 DS E-commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

// ============================================================================
// Public API Functions (Modern Functional Approach)
// ============================================================================

/**
 * Send password reset email with secure token
 */
export const sendPasswordResetEmail = async (data: PasswordResetEmailData): Promise<boolean> => {
  const html = generatePasswordResetEmail(data);

  return await sendEmail({
    to: data.email,
    subject: "Reset Your Password - DS E-commerce",
    html,
  });
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<boolean> => {
  const html = generateWelcomeEmail(data);

  return await sendEmail({
    to: data.email,
    subject: "Welcome to DS E-commerce!",
    html,
  });
};

/**
 * Send security alert emails for important events
 */
export const sendSecurityAlertEmail = async (data: SecurityAlertEmailData): Promise<boolean> => {
  const html = generateSecurityAlertEmail(data);

  return await sendEmail({
    to: data.email,
    subject: "Security Alert - DS E-commerce",
    html,
  });
};

/**
 * Test email configuration and connectivity
 */
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    await initializeTransporter();

    if (!transporter) {
      return false;
    }

    await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: env.EMAIL_FROM,
      subject: "Test Email - DS E-commerce",
      text: "This is a test email to verify email configuration.",
      html: "<p>This is a test email to verify email configuration.</p>",
    });

    logger.info("Test email sent successfully");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Test email failed", error instanceof Error ? error : new Error(errorMessage), {
      metadata: { errorMessage },
    });
    return false;
  }
};

/**
 * Close email service connections and cleanup resources
 */
export const closeEmailService = (): void => {
  if (transporter) {
    transporter.close();
    transporter = null;
    isInitialized = false;
    logger.info("Email service closed");
  }
};

/**
 * Send custom email with provided options
 */
export const sendCustomEmail = async (options: EmailOptions): Promise<boolean> => {
  return await sendEmail(options);
};

/**
 * Get the current initialization status
 */
export const getEmailServiceStatus = (): { isInitialized: boolean; hasTransporter: boolean } => {
  return {
    isInitialized,
    hasTransporter: transporter !== null,
  };
};

// ============================================================================
// Legacy Compatibility Object (for backward compatibility)
// ============================================================================

export const emailService = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  testEmailConfiguration,
  close: closeEmailService,
  sendCustomEmail,
  getStatus: getEmailServiceStatus,
};

// Default export for convenience
export default emailService;

// ============================================================================
// Named Exports for Tree Shaking and Modern Usage
// ============================================================================

export {
  // Core functions
  initializeTransporter,
  sendEmail,
  stripHtml,
  parseUserAgent,

  // Template generators
  generatePasswordResetEmail,
  generateWelcomeEmail,
  generateSecurityAlertEmail,
};
