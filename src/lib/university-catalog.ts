import { supabase } from "@/lib/supabase";

export interface UniversityCatalogFilters {
  degree: string;
  faculty: string;
  program: string;
  language: string;
}

export interface UniversityCatalogProgram {
  id: string;
  name: string;
  degree: string;
  language: string;
  facultyId: string | null;
  facultyName: string | null;
  isActive: boolean;
  durationYears: number | null;
  tuitionFee: number | null;
  currency: string | null;
  description: string | null;
  requirements: string | null;
}

export interface UniversityCatalogUniversity {
  id: string;
  workspaceId: string;
  name: string;
  country: string;
  city: string;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  faculties: string[];
  programs: UniversityCatalogProgram[];
}

export interface UniversityCatalogResponse {
  workspaceId: string | null;
  workspaceName: string | null;
  universities: UniversityCatalogUniversity[];
}

export interface UniversityCatalogFilterOptions {
  degrees: string[];
  faculties: string[];
  programs: string[];
  languages: string[];
}

const SORT_LOCALE = "uz";

const normalizeValue = (value?: string | null) => value?.trim() ?? "";

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(values.map((value) => normalizeValue(value)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, SORT_LOCALE));

const matchesCatalogProgram = (
  program: UniversityCatalogProgram,
  filters: UniversityCatalogFilters,
  omittedKey?: keyof UniversityCatalogFilters,
) => {
  if (omittedKey !== "degree" && filters.degree && program.degree !== filters.degree) {
    return false;
  }

  if (omittedKey !== "language" && filters.language && program.language !== filters.language) {
    return false;
  }

  if (omittedKey !== "program" && filters.program && program.name !== filters.program) {
    return false;
  }

  if (omittedKey !== "faculty" && filters.faculty) {
    const facultyName = program.facultyName ?? "";
    if (facultyName !== filters.faculty) {
      return false;
    }
  }

  return true;
};

const getActivePrograms = (university: UniversityCatalogUniversity) =>
  university.programs.filter((program) => program.isActive);

export function getMatchingCatalogPrograms(
  university: UniversityCatalogUniversity,
  filters: UniversityCatalogFilters,
) {
  return getActivePrograms(university).filter((program) =>
    matchesCatalogProgram(program, filters),
  );
}

export function filterUniversityCatalog(
  universities: UniversityCatalogUniversity[],
  filters: UniversityCatalogFilters,
) {
  return universities.filter(
    (university) => getMatchingCatalogPrograms(university, filters).length > 0,
  );
}

function collectOptionsForField(
  universities: UniversityCatalogUniversity[],
  filters: UniversityCatalogFilters,
  field: keyof UniversityCatalogFilters,
) {
  const values: string[] = [];

  for (const university of universities) {
    for (const program of getActivePrograms(university)) {
      if (!matchesCatalogProgram(program, filters, field)) {
        continue;
      }

      if (field === "degree") {
        values.push(program.degree);
      } else if (field === "faculty" && program.facultyName) {
        values.push(program.facultyName);
      } else if (field === "program") {
        values.push(program.name);
      } else if (field === "language") {
        values.push(program.language);
      }
    }
  }

  return uniqueSorted(values);
}

export function buildUniversityFilterOptions(
  universities: UniversityCatalogUniversity[],
  filters: UniversityCatalogFilters,
): UniversityCatalogFilterOptions {
  return {
    degrees: collectOptionsForField(universities, filters, "degree"),
    faculties: collectOptionsForField(universities, filters, "faculty"),
    programs: collectOptionsForField(universities, filters, "program"),
    languages: collectOptionsForField(universities, filters, "language"),
  };
}

export async function fetchUniversityCatalog(): Promise<UniversityCatalogResponse> {
  const { data, error } = await supabase.functions.invoke("university-catalog", {
    body: { action: "catalog" },
  });

  if (error) {
    throw new Error(error.message || "University catalog could not be loaded.");
  }

  const universities = Array.isArray(data?.universities)
    ? (data.universities as UniversityCatalogUniversity[])
    : [];

  return {
    workspaceId: typeof data?.workspaceId === "string" ? data.workspaceId : null,
    workspaceName: typeof data?.workspaceName === "string" ? data.workspaceName : null,
    universities,
  };
}
