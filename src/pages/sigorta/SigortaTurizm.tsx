import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Label, Surface, TextField } from '@heroui/react';
import { TabSelector } from '@/components/shared/TabSelector';
import { FileUpload } from '@/components/shared/FileUpload';
import { PassportUploadField } from '@/components/shared/PassportUploadField';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { recordStoredClientApplication } from '@/lib/client-tracking';
import {
  getPassportFatherName,
  getPassportGivenName,
  getPassportSurname,
  passportSexToGender,
  type PassportExtractionData,
  type PassportUploadValue,
} from '@/lib/docupipe';
import { toast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { Palmtree } from 'lucide-react';

export default function SigortaTurizm() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sponsorType, setSponsorType] = useState('person');
  const [passportMeta, setPassportMeta] = useState<PassportUploadValue | null>(null);
  const [form, setForm] = useState({
    passport_url: '', birth_date: '', name: '', surname: '', father_name: '',
    nationality: '', plan: '', policy_duration: '', policy_start: '', gender: '',
    sponsor_nationality: '', sponsor_passport_tc: '', sponsor_gender: '',
    sponsor_name: '', sponsor_birth_date: '', sponsor_surname: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const applyPassportAutofill = (extraction: PassportExtractionData) => {
    const gender = passportSexToGender(extraction.sex);
    setForm((prev) => ({
      ...prev,
      name: prev.name || getPassportGivenName(extraction),
      surname: prev.surname || getPassportSurname(extraction),
      father_name: prev.father_name || getPassportFatherName(extraction),
      birth_date: prev.birth_date || extraction.date_of_birth || '',
      nationality: prev.nationality || extraction.nationality || '',
      gender: prev.gender || gender,
    }));
  };

  if (submitted) return <SuccessScreen />;

  const plans = ['p1','p2','p3','p4','p5','p6','p7','p8','p9'];
  const genderOpts = [{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase.from('sigorta_applications').insert({
        id: applicationId,
        client_id: cId,
        type: 'turizm',
        data: {
          ...form,
          sponsorType,
          passport_document_id: passportMeta?.documentId ?? null,
          passport_extraction: passportMeta?.extraction ?? null,
        },
      });
      if (error) throw error;
      await recordStoredClientApplication({
        route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard/sigorta/turizm',
        serviceKey: 'sigorta',
        referenceId: applicationId,
        details: {
          type: 'turizm',
          sponsorType,
          plan: form.plan,
          nationality: form.nationality,
        },
      }).catch((trackingError) => {
        console.error('Tourism insurance tracking error:', trackingError);
      });
      void notifyAdminNewApplication('sigorta', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const HeroSel = ({ fk, opts, label, fit }: { fk: string; opts: { value: string; label: string }[]; label: string; fit?: boolean }) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={form[fk as keyof typeof form] || ''} onValueChange={v => u(fk, v)}>
        <SelectTrigger className={fit ? "w-fit" : "w-full"}>
          <SelectValue placeholder={t('common.select')} />
        </SelectTrigger>
        <SelectContent>
          {opts.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#C8E6D0] flex items-center justify-center">
          <Palmtree className="h-7 w-7 text-[#3A8A56]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('sigorta.turizm')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Turizm paketi sug'urtasi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6">
          {/* 1. Ism & Familiya */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="name" variant="secondary" onChange={v => u('name', v)} value={form.name}>
              <Label>{t('form.name')}</Label>
              <Input placeholder="Ismingizni kiriting" />
            </TextField>
            <TextField fullWidth isRequired name="surname" variant="secondary" onChange={v => u('surname', v)} value={form.surname}>
              <Label>{t('form.surname')}</Label>
              <Input placeholder="Familiyangizni kiriting" />
            </TextField>
          </div>

          {/* 2. Ota ismi & Millati */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="father_name" variant="secondary" onChange={v => u('father_name', v)} value={form.father_name}>
              <Label>{t('sigorta.fatherNameShort')}</Label>
              <Input placeholder="Otangizning ismi" />
            </TextField>
            <TextField fullWidth isRequired name="nationality" variant="secondary" onChange={v => u('nationality', v)} value={form.nationality}>
              <Label>{t('form.nationality')}</Label>
              <Input placeholder="O'zbekiston" />
            </TextField>
          </div>

          {/* 3. Tug'ilgan sana & Jinsi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="birth_date" type="date" variant="secondary" onChange={v => u('birth_date', v)} value={form.birth_date}>
              <Label>{t('form.birthDate')}</Label>
              <Input placeholder="Tug'ilgan sanangiz" />
            </TextField>
            <HeroSel fk="gender" label={t('form.gender')} opts={genderOpts} fit />
          </div>

          {/* 4. Paket & Muddat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroSel fk="plan" label={t('sigorta.plan')} opts={plans.map(k => ({ value: k, label: t(`sigorta.turizmPlans.${k}`) }))} />
            <HeroSel fk="policy_duration" label={t('sigorta.policyDuration')} opts={[{ value: '3m', label: t('sigorta.month3') }, { value: '6m', label: t('sigorta.month6') }, { value: '12m', label: t('sigorta.year1') }]} />
          </div>

          {/* 5. Polisa boshlanishi */}
          <TextField fullWidth isRequired name="policy_start" type="date" variant="secondary" onChange={v => u('policy_start', v)} value={form.policy_start}>
            <Label>{t('sigorta.policyStart')}</Label>
            <Input placeholder="Polisa boshlanish sanasi" />
          </TextField>

          {/* 6. Pasport (fayl) */}
          <PassportUploadField
            label={t('form.passport')}
            onChange={(value) => {
              setPassportMeta(value);
              u('passport_url', value?.storageUrl || '');
              if (value?.extraction) {
                applyPassportAutofill(value.extraction);
              }
            }}
          />

          {/* Sponsor section */}
          <div className="border-t border-default/20 pt-5 space-y-5">
            <h3 className="font-heading font-bold text-base">{t('sigorta.sponsorInfo')}</h3>
            <TabSelector tabs={[{ key: 'person', label: t('common.person') }, { key: 'corporate', label: t('common.corporate') }]} value={sponsorType} onChange={setSponsorType} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth name="sponsor_name" variant="secondary" onChange={v => u('sponsor_name', v)} value={form.sponsor_name}>
                <Label>{t('sigorta.sponsorName')}</Label>
                <Input placeholder="Homiyning ismi" />
              </TextField>
              <TextField fullWidth name="sponsor_surname" variant="secondary" onChange={v => u('sponsor_surname', v)} value={form.sponsor_surname}>
                <Label>{t('sigorta.sponsorSurname')}</Label>
                <Input placeholder="Homiyning familiyasi" />
              </TextField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth name="sponsor_nationality" variant="secondary" onChange={v => u('sponsor_nationality', v)} value={form.sponsor_nationality}>
                <Label>{t('sigorta.sponsorNationality')}</Label>
                <Input placeholder="Homiyning millati" />
              </TextField>
              <TextField fullWidth name="sponsor_passport_tc" variant="secondary" onChange={v => u('sponsor_passport_tc', v)} value={form.sponsor_passport_tc}>
                <Label>{t('sigorta.sponsorPassportTc')}</Label>
                <Input placeholder="Pasport yoki TC raqami" />
              </TextField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth name="sponsor_birth_date" type="date" variant="secondary" onChange={v => u('sponsor_birth_date', v)} value={form.sponsor_birth_date}>
                <Label>{t('sigorta.sponsorBirthDate')}</Label>
                <Input placeholder="Tug'ilgan sanasi" />
              </TextField>
              <HeroSel fk="sponsor_gender" label={t('form.gender')} opts={genderOpts} fit />
            </div>
          </div>

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
