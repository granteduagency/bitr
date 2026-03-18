import { describe, expect, it } from "vitest";
import {
  formatPhoneForLookup,
  normalizePhoneInput,
  suggestAppointmentCheckType,
} from "@/lib/randevu";

describe("randevu helpers", () => {
  it("normalizes Turkish phone input to 10 digits", () => {
    expect(normalizePhoneInput("+90 (501) 008-88-01")).toBe("5010088801");
    expect(normalizePhoneInput("05010088801")).toBe("5010088801");
  });

  it("formats phone for e-ikamet lookup", () => {
    expect(formatPhoneForLookup("5010088801")).toBe("(501) 008-88-01");
  });

  it("prefers phone when both phone and email exist", () => {
    expect(suggestAppointmentCheckType("5010088801", "user@example.com")).toBe("phone");
    expect(suggestAppointmentCheckType("", "user@example.com")).toBe("email");
    expect(suggestAppointmentCheckType("", "")).toBeNull();
  });
});
