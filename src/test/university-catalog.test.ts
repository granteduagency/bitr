import { describe, expect, it } from "vitest";

import {
  buildUniversityFilterOptions,
  filterUniversityCatalog,
  type UniversityCatalogFilters,
  type UniversityCatalogUniversity,
} from "@/lib/university-catalog";

const universities: UniversityCatalogUniversity[] = [
  {
    id: "uni-1",
    workspaceId: "ws-1",
    name: "Alpha University",
    country: "Turkey",
    city: "Istanbul",
    website: null,
    logoUrl: null,
    description: null,
    faculties: ["Engineering", "Business"],
    programs: [
      {
        id: "prog-1",
        name: "Computer Engineering",
        degree: "Bachelor",
        language: "English",
        facultyId: "fac-1",
        facultyName: "Engineering",
        isActive: true,
        durationYears: 4,
        tuitionFee: null,
        currency: null,
        description: null,
        requirements: null,
      },
      {
        id: "prog-2",
        name: "Business Administration",
        degree: "Master",
        language: "Turkish",
        facultyId: "fac-2",
        facultyName: "Business",
        isActive: true,
        durationYears: 2,
        tuitionFee: null,
        currency: null,
        description: null,
        requirements: null,
      },
    ],
  },
];

const emptyFilters: UniversityCatalogFilters = {
  degree: "",
  faculty: "",
  program: "",
  language: "",
};

describe("university catalog filters", () => {
  it("includes provided degree options even when no program uses them", () => {
    const options = buildUniversityFilterOptions(universities, emptyFilters, [
      "Bachelor",
      "Master",
      "PhD",
    ]);

    expect(options.degrees).toEqual(["Bachelor", "Master", "PhD"]);
    expect(options.faculties).toEqual([]);
    expect(options.programs).toEqual([]);
    expect(options.languages).toEqual([]);
  });

  it("cascades options by degree, faculty, and program", () => {
    const afterDegree = buildUniversityFilterOptions(universities, {
      ...emptyFilters,
      degree: "Bachelor",
    });
    expect(afterDegree.faculties).toEqual(["Engineering"]);
    expect(afterDegree.programs).toEqual([]);

    const afterFaculty = buildUniversityFilterOptions(universities, {
      degree: "Bachelor",
      faculty: "Engineering",
      program: "",
      language: "",
    });
    expect(afterFaculty.programs).toEqual(["Computer Engineering"]);
    expect(afterFaculty.languages).toEqual([]);

    const afterProgram = buildUniversityFilterOptions(universities, {
      degree: "Bachelor",
      faculty: "Engineering",
      program: "Computer Engineering",
      language: "",
    });
    expect(afterProgram.languages).toEqual(["English"]);
  });

  it("filters universities only after all chosen constraints match", () => {
    const filtered = filterUniversityCatalog(universities, {
      degree: "Bachelor",
      faculty: "Engineering",
      program: "Computer Engineering",
      language: "English",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Alpha University");
  });
});
