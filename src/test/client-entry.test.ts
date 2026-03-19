import { describe, expect, it } from "vitest";
import {
  formatClientPhoneInput,
  getDefaultClientPhoneCountry,
  normalizeClientName,
  toStoredClientPhone,
  validateClientName,
  validateClientPhone,
} from "@/lib/client-entry";

describe("client entry helpers", () => {
  it("normalizes and validates full names", () => {
    expect(normalizeClientName("  Aziz   Rahimov  ")).toBe("Aziz Rahimov");
    expect(validateClientName("Aziz Rahimov")).toBeNull();
    expect(validateClientName("asdf asdf")).toBe("landing.nameErrorFake");
    expect(validateClientName("adasdasdas dasdasdas")).toBe("landing.nameErrorFake");
    expect(validateClientName("qweqwe qweqwe")).toBe("landing.nameErrorFake");
    expect(validateClientName("Sabitkhon Akramjon Ugli Kodirov")).toBeNull();
    expect(validateClientName("A Z")).toBe("landing.nameErrorShort");
  });

  it("normalizes and formats E.164 phone numbers", () => {
    expect(toStoredClientPhone("+905010088801")).toBe("+905010088801");
    expect(formatClientPhoneInput("+905010088801")).toContain("+90");
    expect(getDefaultClientPhoneCountry("+998901234567")).toBe("UZ");
  });

  it("accepts valid international numbers and blocks fake ones", () => {
    expect(validateClientPhone("+998901234567", "UZ")).toBeNull();
    expect(validateClientPhone("+905010088801", "TR")).toBeNull();
    expect(validateClientPhone("+905555555555", "TR")).toBe("landing.phoneErrorFake");
    expect(validateClientPhone("+902121231234", "TR")).toBe("landing.phoneErrorTurkeyMobile");
    expect(validateClientPhone("1234", "TR")).toBe("landing.phoneErrorInvalid");
  });
});
