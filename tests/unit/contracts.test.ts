import { describe, expect, it } from "vitest";
import { fail, HTTP_STATUS, ok } from "@/contracts/result";
import { uuidv7 } from "@/lib/ids";

describe("ActionResult (TECH-01 §5.3)", () => {
  it("wraps data and errors", () => {
    expect(ok({ id: "x" })).toEqual({ ok: true, data: { id: "x" } });
    expect(fail("VERSION_CONFLICT", "Changed")).toEqual({ ok: false, code: "VERSION_CONFLICT", message: "Changed", retryable: false });
    expect(fail("UNAVAILABLE", "Down")).toMatchObject({ retryable: true });
    expect(HTTP_STATUS.NOT_MEMBER).toBe(404);
  });
});

describe("uuidv7", () => {
  it("is a time-ordered v7 UUID", () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});
