import { getSessionUser } from "@/server/auth/session";
import { getPreferences } from "@/server/db/learner-profile";
import { ApplyPreferences } from "./apply-preferences";
import { SignOutButton } from "./sign-out-button";

/** Signed-in learner's name, sign-out, and their display preferences. Reads the session. */
export async function AccountMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  const prefs = await getPreferences(user.id);
  return (
    <div className="flex items-center gap-2 md:justify-between md:px-2 md:py-1">
      <ApplyPreferences textScale={prefs.textScale} colorTheme={prefs.colorTheme} reducedMotion={prefs.reducedMotion} />
      <span className="text-ink hidden max-w-36 truncate text-sm font-medium md:inline" title={user.email}>
        {user.name}
      </span>
      <SignOutButton />
    </div>
  );
}
