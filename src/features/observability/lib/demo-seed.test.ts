import { beforeEach, describe, expect, it } from "vitest";

import { CARDINALITY_LIMITS } from "./cardinality";
import { METRIC_NAMES } from "./constants";
import {
  DEMO_SEED_BUDGET,
  buildDemoEvents,
  hasDemoData,
  seedDemoObservability,
} from "./demo-seed";
import { resetAlertState } from "./alerting";
import { getEvents, resetStore } from "./store";
import { trackMetric } from "./track";

const FIXED_NOW = new Date("2026-10-11T12:00:00.000Z");

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|apikey|api_key|ssn|credit|card|cvv|otp|code)/i;

describe("buildDemoEvents", () => {
  it("menghasilkan output identik untuk input waktu yang sama", () => {
    const first = buildDemoEvents(FIXED_NOW);
    const second = buildDemoEvents(FIXED_NOW);

    expect(first).toEqual(second);
  });

  it("hanya memakai nama metrik yang terdaftar", () => {
    const events = buildDemoEvents(FIXED_NOW);
    const validNames = new Set<string>(Object.values(METRIC_NAMES));

    for (const event of events) {
      expect(validNames.has(event.name)).toBe(true);
    }
  });

  it("menjaga batas kardinalitas tag", () => {
    const events = buildDemoEvents(FIXED_NOW);

    for (const event of events) {
      expect(Object.keys(event.tags ?? {}).length).toBeLessThanOrEqual(
        CARDINALITY_LIMITS.maxTagKeys,
      );
    }

    const routeValues = new Set(
      events.map((event) => event.tags?.route).filter(Boolean),
    );
    expect(routeValues.size).toBeLessThanOrEqual(CARDINALITY_LIMITS.perTag);
  });

  it("tidak melebihi budget event", () => {
    expect(buildDemoEvents(FIXED_NOW).length).toBeLessThanOrEqual(
      DEMO_SEED_BUDGET,
    );
  });

  it("tidak menyertakan actorId", () => {
    const events = buildDemoEvents(FIXED_NOW);

    for (const event of events) {
      expect(event.actorId).toBeUndefined();
    }
  });

  it("tidak memakai key tag sensitif", () => {
    const events = buildDemoEvents(FIXED_NOW);

    for (const event of events) {
      for (const key of Object.keys(event.tags ?? {})) {
        expect(SENSITIVE_KEY_PATTERN.test(key)).toBe(false);
      }
    }
  });

  it("menandai semua event sebagai demo", () => {
    const events = buildDemoEvents(FIXED_NOW);

    for (const event of events) {
      expect(event.source).toBe("demo");
    }
  });
});

describe("seedDemoObservability", () => {
  beforeEach(() => {
    resetStore();
    resetAlertState();
  });

  it("mengisi store saat kosong", () => {
    expect(getEvents()).toHaveLength(0);

    seedDemoObservability(FIXED_NOW);

    expect(getEvents().length).toBeGreaterThan(0);
  });

  it("idempoten: panggilan kedua tidak menambah event", () => {
    seedDemoObservability(FIXED_NOW);
    const countAfterFirst = getEvents().length;

    seedDemoObservability(FIXED_NOW);

    expect(getEvents()).toHaveLength(countAfterFirst);
  });

  it("tidak menimpa metrik yang sudah punya data", () => {
    seedDemoObservability(FIXED_NOW);

    trackMetric({
      name: METRIC_NAMES.LOGIN_ATTEMPT,
      kind: "counter",
      value: 1,
      tags: { route: "/real" },
    });

    const demoBefore = getEvents({ name: METRIC_NAMES.LOGIN_ATTEMPT }).filter(
      (event) => event.source === "demo",
    ).length;

    seedDemoObservability(FIXED_NOW);

    const demoAfter = getEvents({ name: METRIC_NAMES.LOGIN_ATTEMPT }).filter(
      (event) => event.source === "demo",
    ).length;

    expect(demoAfter).toBe(demoBefore);
  });
});

describe("hasDemoData", () => {
  beforeEach(() => {
    resetStore();
    resetAlertState();
  });

  it("false saat store kosong", () => {
    expect(hasDemoData()).toBe(false);
  });

  it("true setelah seed", () => {
    seedDemoObservability(FIXED_NOW);
    expect(hasDemoData()).toBe(true);
  });
});
