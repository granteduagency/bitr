import { invokePublicFunction } from "@/lib/public-functions";

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
  degrees: string[];
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

export const splitProgramLanguages = (value?: string | null) =>
  normalizeValue(value)
    .split(/[/,;|]+/g)
    .map((language) => language.trim())
    .filter(Boolean);

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(values.map((value) => normalizeValue(value)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, SORT_LOCALE));

const mergeDegreeOptions = (
  catalogDegrees: string[],
  universities: UniversityCatalogUniversity[],
) => {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const degree of catalogDegrees) {
    const normalized = normalizeValue(degree);
    const key = normalized.toLocaleLowerCase(SORT_LOCALE);
    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(normalized);
  }

  const extras = uniqueSorted(
    universities.flatMap((university) => getActivePrograms(university).map((program) => program.degree)),
  ).filter((degree) => !seen.has(degree.toLocaleLowerCase(SORT_LOCALE)));

  return [...ordered, ...extras];
};

const matchesCatalogProgram = (
  program: UniversityCatalogProgram,
  filters: UniversityCatalogFilters,
  omittedKey?: keyof UniversityCatalogFilters,
) => {
  if (omittedKey !== "degree" && filters.degree && program.degree !== filters.degree) {
    return false;
  }

  if (omittedKey !== "language" && filters.language) {
    const languages = splitProgramLanguages(program.language);
    if (!languages.includes(filters.language)) {
      return false;
    }
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
        values.push(...splitProgramLanguages(program.language));
      }
    }
  }

  return uniqueSorted(values);
}

export function buildUniversityFilterOptions(
  universities: UniversityCatalogUniversity[],
  filters: UniversityCatalogFilters,
  catalogDegrees: string[] = [],
): UniversityCatalogFilterOptions {
  const degreeOptions = mergeDegreeOptions(catalogDegrees, universities);

  return {
    degrees: degreeOptions,
    faculties: filters.degree ? collectOptionsForField(universities, filters, "faculty") : [],
    programs:
      filters.degree && filters.faculty
        ? collectOptionsForField(universities, filters, "program")
        : [],
    languages:
      filters.degree && filters.faculty && filters.program
        ? collectOptionsForField(universities, filters, "language")
        : [],
  };
}

export async function fetchUniversityCatalog(): Promise<UniversityCatalogResponse> {
  const data = await invokePublicFunction<{ workspaceId?: unknown; workspaceName?: unknown; degrees?: unknown; universities?: unknown }>(
    "university-catalog",
    { action: "catalog" },
  );

  const universities = Array.isArray(data?.universities)
    ? (data.universities as UniversityCatalogUniversity[])
    : [];

  return {
    workspaceId: typeof data?.workspaceId === "string" ? data.workspaceId : null,
    workspaceName: typeof data?.workspaceName === "string" ? data.workspaceName : null,
    degrees: Array.isArray(data?.degrees)
      ? data.degrees
          .map((degree) => (typeof degree?.name === "string" ? degree.name : typeof degree === "string" ? degree : ""))
          .filter(Boolean)
      : [],
    universities,
  };
}
