import { describe, expect, it } from "vitest";
import { formatSignalDateTime } from "./format-signal-datetime";

describe("formatSignalDateTime", () => {
  it("returns em dash for null/undefined", () => {
    expect(formatSignalDateTime("no", null)).toBe("—");
    expect(formatSignalDateTime("no", undefined)).toBe("—");
  });

  it("returns em dash for invalid ISO", () => {
    expect(formatSignalDateTime("no", "not-a-date")).toBe("—");
  });

  it("formats fixed instant for no and en (stable across TZ in CI)", () => {
    const iso = "2026-03-20T14:32:00.000Z";
    const no = formatSignalDateTime("no", iso);
    const en = formatSignalDateTime("en", iso);
    expect(no.length).toBeGreaterThan(6);
    expect(en.length).toBeGreaterThan(6);
    expect(no).toMatch(/20/);
    expect(en).toMatch(/20/);
  });
});
