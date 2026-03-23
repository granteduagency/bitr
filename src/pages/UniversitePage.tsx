import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Label, Surface, TextField } from '@heroui/react';
import { FileUpload } from '@/components/shared/FileUpload';
import { PassportUploadField } from '@/components/shared/PassportUploadField';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import {
  recordStoredClientActivity,
  recordStoredClientApplication,
} from '@/lib/client-tracking';
import type { PassportUploadValue } from '@/lib/docupipe';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildUniversityFilterOptions,
  fetchUniversityCatalog,
  filterUniversityCatalog,
  getMatchingCatalogPrograms,
  splitProgramLanguages,
  type UniversityCatalogFilters,
  type UniversityCatalogUniversity,
} from '@/lib/university-catalog';
import { validatePortraitPhoto } from '@/lib/photo-validation';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, ArrowUpRight, Globe2, MapPin } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { motion } from 'framer-motion';

const UNI_COLORS = [
  { bg: '#C8E6D0', color: '#3A8A56' }, { bg: '#C8D5F5', color: '#4A6EC5' },
  { bg: '#F2E8A0', color: '#8B7E2A' }, { bg: '#E0D4F0', color: '#7B5EA7' },
  { bg: '#FDD6B5', color: '#C67832' },
];

const EMPTY_FILTERS: UniversityCatalogFilters = {
  degree: '',
  faculty: '',
  program: '',
  language: '',
};

const EMPTY_APPLICATION_SELECTION = {
  faculty: '',
  programId: '',
};

const EMPTY_SELECT_VALUES = {
  faculty: '__empty-faculty__',
  program: '__empty-program__',
  language: '__empty-language__',
} as const;

const UniversitySearchSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-5 w-56 rounded-full" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-3 md:flex-row">
      <Skeleton className="h-11 w-44 rounded-2xl" />
      <Skeleton className="h-11 w-44 rounded-2xl" />
    </div>
  </div>
);

const UniversityResultsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {Array.from({ length: 4 }, (_, index) => (
      <div
        key={index}
        className="min-h-[160px] rounded-[1.5rem] border border-slate-100 bg-white/70 p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

function renderSelectItems(
  options: string[],
  emptyValue: string,
  emptyLabel: string,
) {
  if (options.length === 0) {
    return (
      <SelectItem value={emptyValue} disabled>
        {emptyLabel}
      </SelectItem>
    );
  }

  return options.map((option) => (
    <SelectItem key={option} value={option}>
      {option}
    </SelectItem>
  ));
}

export default function UniversitePage() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'search' | 'results' | 'apply'>('search');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [degreeOptions, setDegreeOptions] = useState<string[]>([]);
  const [universities, setUniversities] = useState<UniversityCatalogUniversity[]>([]);
  const [selectedUni, setSelectedUni] = useState<UniversityCatalogUniversity | null>(null);
  const [applicationSelection, setApplicationSelection] = useState(EMPTY_APPLICATION_SELECTION);
  const [passportMeta, setPassportMeta] = useState<PassportUploadValue | null>(null);
  const [search, setSearch] = useState<UniversityCatalogFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<UniversityCatalogFilters>(EMPTY_FILTERS);
  const [form, setForm] = useState({
    passport_url: '', diploma_url: '', diploma_supplement_url: '', photo_url: '',
    phone: localStorage.getItem('client_phone') || '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const data = await fetchUniversityCatalog();
        if (cancelled) {
          return;
        }

        setUniversities(data.universities);
        setDegreeOptions(data.degrees);
        setWorkspaceName(data.workspaceName);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : t('universite.catalogError');
        setCatalogError(message);
        setDegreeOptions([]);
        setUniversities([]);
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const filterOptions = useMemo(
    () => buildUniversityFilterOptions(universities, search, degreeOptions),
    [degreeOptions, search, universities],
  );

  useEffect(() => {
    setSearch((current) => {
      const next = { ...current };
      let changed = false;

      if (current.degree && !filterOptions.degrees.includes(current.degree)) {
        next.degree = '';
        changed = true;
      }
      if (current.faculty && !filterOptions.faculties.includes(current.faculty)) {
        next.faculty = '';
        changed = true;
      }
      if (current.program && !filterOptions.programs.includes(current.program)) {
        next.program = '';
        changed = true;
      }
      if (current.language && !filterOptions.languages.includes(current.language)) {
        next.language = '';
        changed = true;
      }

      return changed ? next : current;
    });
  }, [filterOptions]);

  const filteredUniversities = useMemo(
    () => filterUniversityCatalog(universities, appliedFilters),
    [appliedFilters, universities],
  );

  const selectedUniversityPrograms = useMemo(
    () => selectedUni?.programs.filter((program) => program.isActive) ?? [],
    [selectedUni],
  );

  const selectedUniversityFaculties = useMemo(
    () =>
      Array.from(
        new Set(
          (selectedUni?.faculties ?? [])
            .map((facultyName) => facultyName?.trim())
            .filter((facultyName): facultyName is string => Boolean(facultyName)),
        ),
      ).sort((left, right) => left.localeCompare(right, 'uz')),
    [selectedUni],
  );

  const selectedUniversityProgramOptions = useMemo(() => {
    if (selectedUniversityFaculties.length === 0) {
      return selectedUniversityPrograms;
    }

    if (!applicationSelection.faculty) {
      return [];
    }

    return selectedUniversityPrograms.filter(
      (program) => (program.facultyName?.trim() ?? '') === applicationSelection.faculty,
    );
  }, [applicationSelection.faculty, selectedUniversityFaculties, selectedUniversityPrograms]);

  const selectedUniversityProgram = useMemo(
    () =>
      selectedUniversityPrograms.find(
        (program) => program.id === applicationSelection.programId,
      ) ?? null,
    [applicationSelection.programId, selectedUniversityPrograms],
  );

  const requiresFacultySelection = selectedUniversityFaculties.length > 0;

  const openUniversityApplication = (university: UniversityCatalogUniversity) => {
    const activePrograms = university.programs.filter((program) => program.isActive);
    const exactProgramMatch = activePrograms.find(
      (program) =>
        (!appliedFilters.degree || program.degree === appliedFilters.degree) &&
        (!appliedFilters.faculty || (program.facultyName ?? '') === appliedFilters.faculty) &&
        (!appliedFilters.program || program.name === appliedFilters.program) &&
        (!appliedFilters.language ||
          splitProgramLanguages(program.language).includes(appliedFilters.language)),
    );
    const facultyOptions = Array.from(
      new Set(
        university.faculties
          .map((facultyName) => facultyName?.trim())
          .filter((facultyName): facultyName is string => Boolean(facultyName)),
      ),
    ).sort((left, right) => left.localeCompare(right, 'uz'));
    const defaultFaculty =
      exactProgramMatch?.facultyName ??
      (facultyOptions.length === 1 ? facultyOptions[0] : '');
    const defaultProgramId =
      exactProgramMatch?.id ??
      (() => {
        if (!defaultFaculty) {
          return activePrograms.length === 1 ? activePrograms[0].id : '';
        }

        const facultyPrograms = activePrograms.filter(
          (program) => (program.facultyName ?? '') === defaultFaculty,
        );
        return facultyPrograms.length === 1 ? facultyPrograms[0].id : '';
      })();

    setSelectedUni(university);
    setApplicationSelection({
      faculty: defaultFaculty,
      programId: defaultProgramId,
    });
    setStep('apply');
  };

  const openResults = () => {
    setAppliedFilters(search);
    setStep('results');
    void recordStoredClientActivity({
      route: '/dashboard/universite',
      serviceKey: 'universite',
      action: 'university_search',
      details: {
        ...search,
        workspaceName,
        resultCount: filterUniversityCatalog(universities, search).length,
      },
      throttleKey: `university-search:${JSON.stringify(search)}`,
      throttleMs: 15000,
    }).catch((error) => {
      console.error('University search tracking error:', error);
    });
  };

  const handleDegreeChange = (value: string) => {
    setSearch({
      degree: value,
      faculty: '',
      program: '',
      language: '',
    });
  };

  const handleFacultyChange = (value: string) => {
    setSearch((current) => ({
      ...current,
      faculty: value,
      program: '',
      language: '',
    }));
  };

  const handleProgramChange = (value: string) => {
    setSearch((current) => ({
      ...current,
      program: value,
      language: '',
    }));
  };

  const handleLanguageChange = (value: string) => {
    setSearch((current) => ({
      ...current,
      language: value,
    }));
  };

  const clearSearch = () => {
    setSearch(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const canSelectFaculty = Boolean(search.degree);
  const canSelectProgram = Boolean(search.degree && search.faculty);
  const canSelectLanguage = Boolean(search.degree && search.faculty && search.program);
  const canSearch = Boolean(search.degree) && !catalogLoading && !catalogError;

  if (submitted) return <SuccessScreen />;

  if (step === 'search' && catalogLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-52 rounded-full" />
            <Skeleton className="h-4 w-72 rounded-full" />
          </div>
        </div>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          <UniversitySearchSkeleton />
        </Surface>
      </motion.div>
    );
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (requiresFacultySelection && !applicationSelection.faculty) {
      missingFields.push(t('universite.faculty'));
    }
    if (!applicationSelection.programId) {
      missingFields.push(t('universite.program'));
    }
    if (!form.passport_url) {
      missingFields.push(t('universite.passportUpload'));
    }
    if (!form.photo_url) {
      missingFields.push(t('universite.photoUpload'));
    }

    if (missingFields.length > 0) {
      const formatter = new Intl.ListFormat(
        i18n.language.startsWith('uz') ? 'uz' : 'tr',
        { style: 'long', type: 'conjunction' },
      );

      toast({
        title: t('common.error'),
        description: t('common.missingFieldsDescription', {
          fields: formatter.format(missingFields),
        }),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase.from('university_applications').insert({
        id: applicationId,
        client_id: cId,
        university_id: null,
        external_workspace_id: selectedUni?.workspaceId ?? null,
        external_university_id: selectedUni?.id ?? null,
        external_university_name: selectedUni?.name ?? null,
        external_university_city: selectedUni?.city ?? null,
        external_university_country: selectedUni?.country ?? null,
        external_university_website: selectedUni?.website ?? null,
        degree: selectedUniversityProgram?.degree ?? appliedFilters.degree ?? null,
        faculty: applicationSelection.faculty || selectedUniversityProgram?.facultyName || null,
        program: selectedUniversityProgram?.name ?? null,
        language: selectedUniversityProgram?.language ?? appliedFilters.language ?? null,
        passport_document_id: passportMeta?.documentId ?? null,
        passport_extraction: passportMeta?.extraction ?? null,
        ...form,
      });
      if (error) throw error;
      await recordStoredClientApplication({
        route: '/dashboard/universite',
        serviceKey: 'universite',
        referenceId: applicationId,
        details: {
          workspaceName,
          universityName: selectedUni?.name ?? null,
          degree: selectedUniversityProgram?.degree ?? appliedFilters.degree ?? null,
          faculty: applicationSelection.faculty || selectedUniversityProgram?.facultyName || null,
          program: selectedUniversityProgram?.name ?? null,
          language: selectedUniversityProgram?.language ?? appliedFilters.language ?? null,
        },
      }).catch((trackingError) => {
        console.error('University application tracking error:', trackingError);
      });
      void notifyAdminNewApplication('universite', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  /* ── Apply step ── */
  if (step === 'apply' && selectedUni) return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Button type="button" variant="ghost" onClick={() => setStep('results')} className="w-fit px-0 text-sm font-medium text-slate-500 hover:bg-transparent hover:text-slate-900">← {t('common.back')}</Button>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#C8D5F5] flex items-center justify-center"><GraduationCap className="h-7 w-7 text-[#4A6EC5]" /></div>
        <div>
          <h2 className="font-heading text-xl font-extrabold text-slate-900">{selectedUni.name}</h2>
          <p className="text-slate-400 text-sm">{t('universite.applyTitle')}</p>
        </div>
      </div>
      <form onSubmit={handleApply}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('universite.faculty')}</Label>
              <Select
                value={applicationSelection.faculty || ''}
                onValueChange={(value) => {
                  const facultyPrograms = selectedUniversityPrograms.filter(
                    (program) => (program.facultyName?.trim() ?? '') === value,
                  );
                  setApplicationSelection({
                    faculty: value,
                    programId: facultyPrograms.length === 1 ? facultyPrograms[0].id : '',
                  });
                }}
              >
                <SelectTrigger className="w-full" disabled={!requiresFacultySelection}>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {renderSelectItems(
                    selectedUniversityFaculties,
                    EMPTY_SELECT_VALUES.faculty,
                    t('universite.noFaculties'),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('universite.program')}</Label>
              <Select
                value={applicationSelection.programId || ''}
                onValueChange={(value) =>
                  setApplicationSelection((current) => ({
                    ...current,
                    programId: value,
                  }))
                }
              >
                <SelectTrigger
                  className="w-full"
                  disabled={!applicationSelection.faculty}
                >
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {selectedUniversityProgramOptions.length === 0 ? (
                    <SelectItem value={EMPTY_SELECT_VALUES.program} disabled>
                      {t('universite.noPrograms')}
                    </SelectItem>
                  ) : (
                    selectedUniversityProgramOptions.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} · {program.degree} · {program.language}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PassportUploadField
              label={t('universite.passportUpload')}
              required
              onChange={(value) => {
                setPassportMeta(value);
                u('passport_url', value?.storageUrl || '');
              }}
            />
            <FileUpload label={t('universite.diplomaUpload')} onUpload={url => u('diploma_url', url)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload label={t('universite.diplomaSupplementUpload')} onUpload={url => u('diploma_supplement_url', url)} />
            <FileUpload
              label={t('universite.photoUpload')}
              required
              onUpload={url => u('photo_url', url)}
              accept="image/*"
              validateFile={validatePortraitPhoto}
            />
          </div>
          <TextField fullWidth isRequired name="phone" type="tel" variant="secondary" onChange={v => u('phone', v)} value={form.phone}>
            <Label>{t('form.phone')}</Label>
            <Input placeholder="+90 5XX XXX XX XX" />
          </TextField>
          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );

  /* ── Results step ── */
  if (step === 'results') return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">{t('universite.results')}</h2>
          {catalogLoading ? (
            <Skeleton className="mt-2 h-4 w-48 rounded-full" />
          ) : workspaceName ? (
            <p className="text-slate-400 text-sm mt-1">
              {t('universite.workspaceLabel')}: {workspaceName}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" onClick={() => setStep('search')} className="w-fit px-0 text-sm font-medium text-slate-500 hover:bg-transparent hover:text-slate-900">{t('common.back')}</Button>
      </div>
      {catalogLoading ? (
        <UniversityResultsSkeleton />
      ) : filteredUniversities.length === 0 ? (
        <p className="text-slate-400 py-12 text-center">{t('common.noData')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUniversities.map((uni, i) => {
            const matchingPrograms = getMatchingCatalogPrograms(uni, appliedFilters).slice(0, 3);

            return (
            <motion.div key={uni.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-[1.5rem] p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[160px] flex flex-col justify-between"
              style={{ backgroundColor: UNI_COLORS[i % UNI_COLORS.length].bg }}
              onClick={() => {
                void recordStoredClientActivity({
                  route: '/dashboard/universite',
                  serviceKey: 'universite',
                  action: 'university_selected',
                  details: {
                    universityId: uni.id,
                    universityName: uni.name,
                    workspaceName,
                    degree: appliedFilters.degree || null,
                    faculty: appliedFilters.faculty || null,
                    program: appliedFilters.program || null,
                    language: appliedFilters.language || null,
                  },
                  throttleKey: `university-selected:${uni.id}:${appliedFilters.program}:${appliedFilters.language}`,
                  throttleMs: 10000,
                }).catch((error) => {
                  console.error('University selection tracking error:', error);
                });
                openUniversityApplication(uni);
              }}
            >
              <div className="flex items-start gap-3">
                {uni.logoUrl ? (
                  <img
                    src={uni.logoUrl}
                    alt={uni.name}
                    className="h-11 w-11 rounded-2xl object-cover shrink-0 bg-white/70"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-6 w-6" style={{ color: UNI_COLORS[i % UNI_COLORS.length].color }} />
                  </div>
                )}
                <div>
                  <p className="font-heading font-bold text-slate-800">{uni.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600/80">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {uni.city}, {uni.country}
                    </span>
                    {uni.website ? (
                      <span className="inline-flex items-center gap-1">
                        <Globe2 className="h-3.5 w-3.5" />
                        {uni.website.replace(/^https?:\/\//, '')}
                      </span>
                    ) : null}
                  </div>
                  {matchingPrograms.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {matchingPrograms.map((program) => (
                        <span
                          key={program.id}
                          className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {program.name} · {program.degree} · {program.language}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end">
                <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center transition-transform group-hover:scale-110">
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          )})}
        </div>
      )}
    </div>
  );

  /* ── Search step ── */
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#C8D5F5] flex items-center justify-center"><GraduationCap className="h-7 w-7 text-[#4A6EC5]" /></div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('universite.title')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{t('universite.searchSubtitle')}</p>
        </div>
      </div>
      <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
        {!catalogLoading && workspaceName ? (
          <p className="text-sm text-slate-500">
            {t('universite.workspaceLabel')}: <span className="font-semibold text-slate-700">{workspaceName}</span>
          </p>
        ) : null}

        {catalogError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {catalogError}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('universite.degree')}</Label>
                <Select value={search.degree || ''} onValueChange={handleDegreeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.degrees.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('universite.faculty')}</Label>
                <Select value={search.faculty || ''} onValueChange={handleFacultyChange}>
                  <SelectTrigger className="w-full" disabled={!canSelectFaculty}>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {renderSelectItems(
                      filterOptions.faculties,
                      EMPTY_SELECT_VALUES.faculty,
                      t('universite.noFaculties'),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('universite.program')}</Label>
                <Select value={search.program || ''} onValueChange={handleProgramChange}>
                  <SelectTrigger className="w-full" disabled={!canSelectProgram}>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {renderSelectItems(
                      filterOptions.programs,
                      EMPTY_SELECT_VALUES.program,
                      t('universite.noPrograms'),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('universite.language')}</Label>
                <Select value={search.language || ''} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full" disabled={!canSelectLanguage}>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {renderSelectItems(
                      filterOptions.languages,
                      EMPTY_SELECT_VALUES.language,
                      t('universite.noLanguages'),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                type="button"
                onClick={openResults}
                disabled={!canSearch}
                className="h-11 w-fit rounded-2xl bg-black px-6 font-semibold text-white hover:bg-black/90"
              >
                {t('universite.searchBtn')}
              </Button>
              <Button
                type="button"
                onClick={clearSearch}
                className="h-11 w-fit rounded-2xl bg-black px-6 font-semibold text-white hover:bg-black/90"
              >
                {t('universite.clearFilters')}
              </Button>
            </div>
          </>
        )}
      </Surface>
      {!catalogError && universities.length > 0 ? (
        <Surface className="rounded-md p-6 md:p-8 space-y-4 bg-white/50">
          <div>
            <h3 className="font-heading text-xl font-extrabold text-slate-900">
              {t('universite.allUniversities')}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {t('universite.allUniversitiesDescription')}
            </p>
          </div>
          <Table>
            <TableCaption>{t('universite.allUniversitiesDescription')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.universityName')}</TableHead>
                <TableHead>{t('universite.city')}</TableHead>
                <TableHead>{t('universite.country')}</TableHead>
                <TableHead>{t('universite.facultyCount')}</TableHead>
                <TableHead>{t('universite.programCount')}</TableHead>
                <TableHead className="text-right">{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((uni) => (
                <TableRow
                  key={uni.id}
                  className="cursor-pointer"
                  onClick={() => openUniversityApplication(uni)}
                >
                  <TableCell className="font-medium">{uni.name}</TableCell>
                  <TableCell>{uni.city}</TableCell>
                  <TableCell>{uni.country}</TableCell>
                  <TableCell>{uni.faculties.length}</TableCell>
                  <TableCell>{uni.programs.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        openUniversityApplication(uni);
                      }}
                    >
                      {t('universite.apply')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5}>{t('universite.allUniversities')}</TableCell>
                <TableCell className="text-right">{universities.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Surface>
      ) : null}
    </motion.div>
  );
}
