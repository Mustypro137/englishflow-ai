import { describe, expect, it } from "vitest";
import { isConnectionClosed } from "@/server/db/connection-errors";

describe("isConnectionClosed", () => {
  it("recognises a reset connection however Prisma wraps it", () => {
    expect(isConnectionClosed({ code: "ECONNRESET" })).toBe(true);
    expect(isConnectionClosed({ meta: { driverAdapterError: { cause: { kind: "ConnectionClosed" } } } })).toBe(true);
    expect(isConnectionClosed(new Error("driverAdapterError: DriverAdapterError: ConnectionClosed"))).toBe(true);
    expect(isConnectionClosed(new Error("Client has encountered a connection error and is not queryable"))).toBe(true);
    expect(isConnectionClosed(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("does not retry other errors", () => {
    expect(isConnectionClosed(new Error("Unique constraint failed"))).toBe(false);
    expect(isConnectionClosed({ code: "P2002" })).toBe(false);
    expect(isConnectionClosed(null)).toBe(false);
  });
});
