import { describe, expect, it } from "vitest";
import {
  extractAppointmentFieldsFromText,
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

  it("extracts fields from student application form text", () => {
    const parsed = extractAppointmentFieldsFromText(`
      Belge No FA9081227
      2026-11-0040386 Kayıt Numarası (Registration Number)
      Telefon 1 5010088801
      E Posta informer@gmail.com
    `);

    expect(parsed.registrationNumber).toBe("2026-11-0040386");
    expect(parsed.documentNumber).toBe("FA9081227");
    expect(parsed.phone).toBe("5010088801");
    expect(parsed.email).toBe("informer@gmail.com");
    expect(parsed.suggestedCheckType).toBe("phone");
  });
});
