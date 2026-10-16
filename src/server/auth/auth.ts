import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/server/db/client";
import { isEmailConfigured, sendEmail } from "@/server/email/send-email";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

/**
 * Email verification is required whenever a real email provider is configured
 * (it can be switched off explicitly with AUTH_REQUIRE_EMAIL_VERIFICATION=false).
 * Before a public launch, configure Resend so verification is enforced.
 */
const requireEmailVerification = isEmailConfigured() && process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false";

export const auth = betterAuth({
  appName: "EnglishFlow AI",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    requireEmailVerification,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited, so response time does not reveal whether an account exists.
      void sendEmail({
        to: user.email,
        subject: "Reset your EnglishFlow AI password",
        text: `Hello ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Confirm your email for EnglishFlow AI",
        text: `Hello ${user.name},\n\nPlease confirm your email address with this link (valid for 1 hour):\n${url}`,
      });
    },
  },

  user: {
    deleteUser: { enabled: true },
  },

  rateLimit: {
    // On by default in production; AUTH_RATE_LIMIT=off is used only by the automated browser tests.
    enabled: process.env.AUTH_RATE_LIMIT === "off" ? false : undefined,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },

  plugins: [nextCookies()],
});

export const authConfig = { requireEmailVerification } as const;
