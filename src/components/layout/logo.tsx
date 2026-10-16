import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("text-ink inline-flex items-center gap-2 rounded-sm font-semibold", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="text-primary size-7" fill="none">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
        <path d="M7 8.5h10M7 12h7M7 15.5h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="text-lg tracking-tight">
        EnglishFlow <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
