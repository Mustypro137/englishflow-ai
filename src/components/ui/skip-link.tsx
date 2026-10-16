/** First focusable element on every page; jumps keyboard users past the navigation. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-primary text-on-primary sr-only rounded-md px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to main content
    </a>
  );
}
