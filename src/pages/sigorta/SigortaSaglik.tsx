import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, Label, Surface, TextField, Spinner } from '@heroui/react';
import { FileUpload } from '@/components/shared/FileUpload';
import { PassportUploadField } from '@/components/shared/PassportUploadField';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { recordStoredClientApplication } from '@/lib/client-tracking';
import {
  passportSexToGender,
  type PassportExtractionData,
  type PassportUploadValue,
} from '@/lib/docupipe';
import { toast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';

export default function SigortaSaglik() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const citizenType = searchParams.get('type') || 'yabanci';
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passportMeta, setPassportMeta] = useState<PassportUploadValue | null>(null);
  const [form, setForm] = useState({
    passport_url: '', father_name: '', mother_name: '', country: '',
    start_date: '', duration: '1', birth_date: '', gender: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const applyPassportAutofill = (extraction: PassportExtractionData) => {
    const gender = passportSexToGender(extraction.sex);
    setForm((prev) => ({
      ...prev,
      birth_date: prev.birth_date || extraction.date_of_birth || '',
      gender: prev.gender || gender,
      country: prev.country || extraction.nationality || '',
    }));
  };

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase.from('sigorta_applications').insert({
        id: applicationId,
        client_id: cId,
        type: 'saglik',
        data: {
          ...form,
          citizenType,
          passport_document_id: passportMeta?.documentId ?? null,
          passport_extraction: passportMeta?.extraction ?? null,
        },
      });
      if (error) throw error;
      await recordStoredClientApplication({
        route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard/sigorta/saglik',
        serviceKey: 'sigorta',
        referenceId: applicationId,
        details: {
          type: 'saglik',
          citizenType,
          country: form.country,
          duration: form.duration,
        },
      }).catch((trackingError) => {
        console.error('Health insurance tracking error:', trackingError);
      });
      void notifyAdminNewApplication('sigorta', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F5D5D5] flex items-center justify-center">
          <HeartPulse className="h-7 w-7 text-[#B85555]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('sigorta.saglik')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{citizenType === 'turk' ? t('form.turkish') : t('form.foreign')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6">
          {/* 1. Ota & Ona ismi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="father_name" variant="secondary" onChange={v => u('father_name', v)} value={form.father_name}>
              <Label>{t('form.fatherName')}</Label>
              <Input placeholder="Otangizning ismi" />
            </TextField>
            <TextField fullWidth isRequired name="mother_name" variant="secondary" onChange={v => u('mother_name', v)} value={form.mother_name}>
              <Label>{t('form.motherName')}</Label>
              <Input placeholder="Onangizning ismi" />
            </TextField>
          </div>

          {/* 2. Tug'ilgan sana & Jinsi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="birth_date" type="date" variant="secondary" onChange={v => u('birth_date', v)} value={form.birth_date}>
              <Label>{t('form.birthDate')}</Label>
              <Input />
            </TextField>
            <div className="flex flex-col gap-1.5">
              <Label>{t('form.gender')}</Label>
              <Select value={form.gender || ''} onValueChange={v => u('gender', v)}>
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('common.male')}</SelectItem>
                  <SelectItem value="female">{t('common.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Mamlakat & Boshlanish sanasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="country" variant="secondary" onChange={v => u('country', v)} value={form.country}>
              <Label>{t('form.country')}</Label>
              <Input />
            </TextField>
            <TextField fullWidth isRequired name="start_date" type="date" variant="secondary" onChange={v => u('start_date', v)} value={form.start_date}>
              <Label>{t('sigorta.startDate')}</Label>
              <Input />
            </TextField>
          </div>

          {/* 4. Muddat */}
          <div className="space-y-2">
            <Label>{t('sigorta.duration')}</Label>
            <TabSelector tabs={[{ key: '1', label: t('sigorta.year1') }, { key: '2', label: t('sigorta.year2') }, { key: '3', label: t('sigorta.year3') }]} value={form.duration} onChange={v => u('duration', v)} />
          </div>

          {/* 5. Pasport (fayl) */}
          <PassportUploadField
            label={t('sigorta.passportTc')}
            onChange={(value) => {
              setPassportMeta(value);
              u('passport_url', value?.storageUrl || '');
              if (value?.extraction) {
                applyPassportAutofill(value.extraction);
              }
            }}
          />

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
