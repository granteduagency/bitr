import { describe, expect, it } from "vitest";
import {
  getPassportFatherName,
  getPassportGivenName,
  getPassportSurname,
  toPassportExtractionData,
} from "@/lib/docupipe";

describe("docupipe passport helpers", () => {
  it("parses uzbek-style patronymic names into separate fields", () => {
    const extraction = toPassportExtractionData({
      surname: "KODIROV",
      given_names: "SOBITKHON AKRAMJON UGLI",
      full_name: "SOBITKHON AKRAMJON UGLI KODIROV",
    });

    expect(extraction).not.toBeNull();
    expect(getPassportGivenName(extraction)).toBe("SOBITKHON");
    expect(getPassportFatherName(extraction)).toBe("AKRAMJON");
    expect(getPassportSurname(extraction)).toBe("KODIROV");
  });

  it("drops mrz and unknown keys from legacy extraction payloads", () => {
    const extraction = toPassportExtractionData({
      surname: "KODIROV",
      given_names: "SOBITKHON AKRAMJON UGLI",
      mrz: "P<UZBKODIROV<<SOBITKHON<AKRAMJON<UE",
      unexpected: "value",
    });

    expect(extraction).toEqual({
      passport_number: null,
      surname: "KODIROV",
      given_names: "SOBITKHON AKRAMJON UGLI",
      full_name: null,
      nationality: null,
      date_of_birth: null,
      date_of_issue: null,
      date_of_expiry: null,
      sex: null,
      place_of_birth: null,
      personal_number: null,
      issuing_country: null,
    });
    expect(extraction && "mrz" in extraction).toBe(false);
  });
});
