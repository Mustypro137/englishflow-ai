import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/marketing/legal-placeholder";

export const metadata: Metadata = {
  title: "Privacy policy (placeholder)",
  robots: { index: false },
};

const TOPICS = [
  "What personal data is collected (account details, learning records, tutor conversations) and why",
  "How AI providers process learner text, and what is and is not sent to them",
  "Microphone and audio: when recording happens and whether recordings are stored",
  "How long learning records are kept, and how to export or delete them",
  "Cookies and session storage",
  "Third-party services used to run the platform (hosting, database, email, error monitoring)",
  "Your rights and how to contact us",
];

export default function PrivacyPage() {
  return <LegalPlaceholder title="Privacy policy" topics={TOPICS} />;
}
