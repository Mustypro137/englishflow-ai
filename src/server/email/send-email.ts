import "server-only";
import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** True when a real email provider is configured. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

let resend: Resend | null = null;

/**
 * Send a transactional email through Resend.
 * Without Resend configured, development prints the email to the server console
 * so links (verification, password reset) can still be used locally.
 * Production never prints email contents, because they contain sign-in tokens.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email] Not sent ("${message.subject}"): RESEND_API_KEY and EMAIL_FROM are not configured.`);
      return;
    }
    console.info(
      `\n[email — development only, not actually sent]\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
    );
    return;
  }

  resend ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
  if (error) console.error(`[email] Failed to send "${message.subject}": ${error.message}`);
}
