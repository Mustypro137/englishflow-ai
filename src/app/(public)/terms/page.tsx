import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/marketing/legal-placeholder";

export const metadata: Metadata = {
  title: "Terms of service (placeholder)",
  robots: { index: false },
};

const TOPICS = [
  "Who may create an account and account responsibilities",
  "Acceptable use, including use of the AI tutor",
  "The limits of AI-generated feedback and level estimates",
  "Content ownership: curriculum content and learner-created notes and writing",
  "Paid plans, if and when they exist",
  "Service availability, changes and termination",
  "Liability, governing law and contact details",
];

export default function TermsPage() {
  return <LegalPlaceholder title="Terms of service" topics={TOPICS} />;
}
