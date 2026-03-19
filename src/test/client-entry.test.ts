import { describe, expect, it } from "vitest";
import {
  formatClientPhoneInput,
  normalizeClientName,
  normalizeClientPhoneDigits,
  toStoredClientPhone,
  validateClientName,
  validateClientPhone,
} from "@/lib/client-entry";

describe("client entry helpers", () => {
  it("normalizes and validates full names", () => {
    expect(normalizeClientName("  Aziz   Rahimov  ")).toBe("Aziz Rahimov");
    expect(validateClientName("Aziz Rahimov")).toBeNull();
    expect(validateClientName("asdf asdf")).toBe("landing.nameErrorFake");
    expect(validateClientName("A Z")).toBe("landing.nameErrorShort");
  });

  it("normalizes and formats Turkish mobile numbers", () => {
    expect(normalizeClientPhoneDigits("+90 (501) 008-88-01")).toBe("5010088801");
    expect(formatClientPhoneInput("05010088801")).toBe("+90 501 008 88 01");
    expect(toStoredClientPhone("05010088801")).toBe("+90 501 008 88 01");
  });

  it("rejects obviously fake phone numbers", () => {
    expect(validateClientPhone("+90 501 008 88 01")).toBeNull();
    expect(validateClientPhone("1234")).toBe("landing.phoneErrorInvalid");
    expect(validateClientPhone("+90 555 555 55 55")).toBe("landing.phoneErrorFake");
    expect(validateClientPhone("+90 500 000 00 00")).toBe("landing.phoneErrorFake");
  });
});
