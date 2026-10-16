/** True for a connection the server closed (ECONNRESET), as reported by the pg driver adapter. */
export function isConnectionClosed(err: unknown, depth = 0): boolean {
  if (!err || typeof err !== "object" || depth > 4) return false;
  const e = err as Record<string, unknown>;
  if (e.kind === "ConnectionClosed" || e.code === "ECONNRESET") return true;
  if (typeof e.message === "string" && e.message.includes("ConnectionClosed")) return true;
  return [e.cause, e.meta, (e.meta as Record<string, unknown> | undefined)?.driverAdapterError].some((c) =>
    isConnectionClosed(c, depth + 1),
  );
}
