import {
  buildUniversityFilterOptions,
  filterUniversityCatalog,
  getMatchingCatalogPrograms,
  type UniversityCatalogUniversity,
  type UniversityCatalogFilters,
} from "@/lib/university-catalog";

const sampleUniversities: UniversityCatalogUniversity[] = [
  {
    id: "uni-1",
    workspaceId: "ws-1",
    name: "Atlas",
    country: "Turkey",
    city: "Istanbul",
    website: "https://atlas.example",
    logoUrl: null,
    description: null,
    faculties: ["Engineering", "Design"],
    programs: [
      {
        id: "p-1",
        name: "Computer Science",
        degree: "Bakalavr",
        language: "Turkish",
        facultyId: "f-1",
        facultyName: "Engineering",
        isActive: true,
        durationYears: 4,
        tuitionFee: null,
        currency: "USD",
        description: null,
        requirements: null,
      },
      {
        id: "p-2",
        name: "Graphic Design",
        degree: "Magistr",
        language: "English",
        facultyId: "f-2",
        facultyName: "Design",
        isActive: true,
        durationYears: 2,
        tuitionFee: null,
        currency: "USD",
        description: null,
        requirements: null,
      },
    ],
  },
  {
    id: "uni-2",
    workspaceId: "ws-1",
    name: "Kent",
    country: "Turkey",
    city: "Ankara",
    website: null,
    logoUrl: null,
    description: null,
    faculties: ["Business"],
    programs: [
      {
        id: "p-3",
        name: "Business Administration",
        degree: "Bakalavr",
        language: "English",
        facultyId: "f-3",
        facultyName: "Business",
        isActive: true,
        durationYears: 4,
        tuitionFee: null,
        currency: "USD",
        description: null,
        requirements: null,
      },
      {
        id: "p-4",
        name: "Dormant Program",
        degree: "Sertifikat",
        language: "Turkish",
        facultyId: null,
        facultyName: null,
        isActive: false,
        durationYears: 1,
        tuitionFee: null,
        currency: "USD",
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
  it("filters universities by all selected fields", () => {
    const results = filterUniversityCatalog(sampleUniversities, {
      degree: "Bakalavr",
      faculty: "Business",
      program: "Business Administration",
      language: "English",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Kent");
  });

  it("ignores inactive programs when matching", () => {
    const matchingPrograms = getMatchingCatalogPrograms(sampleUniversities[1], {
      ...emptyFilters,
      degree: "Sertifikat",
    });

    expect(matchingPrograms).toHaveLength(0);
  });

  it("builds dependent options from matching active programs", () => {
    const options = buildUniversityFilterOptions(sampleUniversities, {
      ...emptyFilters,
      degree: "Bakalavr",
    });

    expect(options.degrees).toEqual(["Bakalavr", "Magistr"]);
    expect(options.faculties).toEqual(["Business", "Engineering"]);
    expect(options.programs).toEqual(["Business Administration", "Computer Science"]);
    expect(options.languages).toEqual(["English", "Turkish"]);
  });
});
