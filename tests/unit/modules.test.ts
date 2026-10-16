import { describe, expect, it } from "vitest";
import {
  getNavModules,
  groupModules,
  LEARNER_MODULES,
  type LearnerModule,
  MOBILE_PRIMARY_LIMIT,
  splitMobileNav,
} from "@/lib/modules";

const mod = (id: string, overrides: Partial<LearnerModule> = {}): LearnerModule => ({
  id,
  label: id,
  href: `/app/${id}`,
  description: `${id} description`,
  icon: "dashboard",
  group: "study",
  milestone: 1,
  status: "available",
  ...overrides,
});

describe("module registry", () => {
  it("has unique ids and hrefs", () => {
    const ids = LEARNER_MODULES.map((m) => m.id);
    const hrefs = LEARNER_MODULES.map((m) => m.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("assigns every module to a roadmap milestone between 1 and 8 with a description", () => {
    for (const m of LEARNER_MODULES) {
      expect(m.milestone).toBeGreaterThanOrEqual(1);
      expect(m.milestone).toBeLessThanOrEqual(8);
      expect(m.description.length).toBeGreaterThan(20);
    }
  });

  it("does not flag more modules for the mobile bar than fit", () => {
    expect(LEARNER_MODULES.filter((m) => m.primaryOnMobile).length).toBeLessThanOrEqual(MOBILE_PRIMARY_LIMIT);
  });

  it("covers every learner area listed in the master requirements", () => {
    const ids = new Set(LEARNER_MODULES.map((m) => m.id));
    for (const required of [
      "dashboard",
      "learn",
      "grammar",
      "vocabulary",
      "listening",
      "pronunciation",
      "reading",
      "writing",
      "sentences",
      "conversation",
      "tutor",
      "review",
      "challenges",
      "notebook",
      "mistakes",
      "progress",
      "calendar",
      "settings",
    ]) {
      expect(ids.has(required), required).toBe(true);
    }
  });
});

describe("getNavModules", () => {
  it("excludes planned modules", () => {
    const result = getNavModules([mod("a"), mod("b", { status: "planned" }), mod("c")]);
    expect(result.map((m) => m.id)).toEqual(["a", "c"]);
  });

  it("shows only modules that work: Curriculum and Settings so far", () => {
    expect(getNavModules().map((m) => m.id)).toEqual(["learn", "settings"]);
  });
});

describe("splitMobileNav", () => {
  it("puts everything in the bar when it fits, with no More menu", () => {
    const { primary, more } = splitMobileNav([mod("a"), mod("b")]);
    expect(primary.map((m) => m.id)).toEqual(["a", "b"]);
    expect(more).toEqual([]);
  });

  it("puts primary modules in the bar, up to the limit, and the rest under More", () => {
    const modules = [
      mod("a", { primaryOnMobile: true }),
      mod("b", { primaryOnMobile: true }),
      mod("c"),
      mod("d", { primaryOnMobile: true }),
      mod("e", { primaryOnMobile: true }),
      mod("f", { primaryOnMobile: true }),
    ];
    const { primary, more } = splitMobileNav(modules);
    expect(primary.map((m) => m.id)).toEqual(["a", "b", "d", "e"]);
    expect(more.map((m) => m.id)).toEqual(["c", "f"]);
  });

  it("never includes planned modules", () => {
    const { primary, more } = splitMobileNav([mod("a", { primaryOnMobile: true, status: "planned" }), mod("b")]);
    expect([...primary, ...more].map((m) => m.id)).toEqual(["b"]);
  });
});

describe("groupModules", () => {
  it("groups in a fixed order and omits empty groups", () => {
    const groups = groupModules([mod("s", { group: "skills" }), mod("a", { group: "study" })]);
    expect(groups.map((g) => g.group)).toEqual(["study", "skills"]);
  });
});
