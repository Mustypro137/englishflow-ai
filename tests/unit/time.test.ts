import { describe, expect, it } from "vitest";
import { greetingFor } from "@/lib/learning/time";

describe("greetingFor", () => {
  it("switches at noon and 6 pm local time", () => {
    expect(greetingFor(new Date("2026-10-20T11:59:00Z"), "UTC")).toBe("Good morning");
    expect(greetingFor(new Date("2026-10-20T12:00:00Z"), "UTC")).toBe("Good afternoon");
    expect(greetingFor(new Date("2026-10-20T17:59:00Z"), "UTC")).toBe("Good afternoon");
    expect(greetingFor(new Date("2026-10-20T18:00:00Z"), "UTC")).toBe("Good evening");
  });

  it("uses the learner's time zone, not UTC", () => {
    // 11:30 UTC is 12:30 in Lagos (UTC+1).
    expect(greetingFor(new Date("2026-10-20T11:30:00Z"), "Africa/Lagos")).toBe("Good afternoon");
    expect(greetingFor(new Date("2026-10-20T23:30:00Z"), "Africa/Lagos")).toBe("Good morning");
  });
});
