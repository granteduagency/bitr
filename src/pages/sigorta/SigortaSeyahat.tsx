import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Surface, TextField, Spinner } from '@heroui/react';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { toast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';

export default function SigortaSeyahat() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idType, setIdType] = useState('yabanci');
  const [form, setForm] = useState({
    nationality: '', purpose: '', target_country: '', passport_tc: '',
    birth_date: '', name: '', surname: '', duration: '', start_date: '', gender: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const purposes = ['p1','p2','p3','p4','p5'];
  const durations = [
    { value: '1w', label: t('sigorta.week1') }, { value: '2w', label: t('sigorta.week2') },
    { value: '1m', label: t('sigorta.month1') }, { value: '2m', label: t('sigorta.month2') },
    { value: '3m', label: t('sigorta.month3') }, { value: '4m', label: t('sigorta.month4') },
    { value: '6m', label: t('sigorta.month6') }, { value: '1y', label: t('sigorta.year1') },
  ];
  const genderOpts = [{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase
        .from('sigorta_applications')
        .insert({ id: applicationId, client_id: cId, type: 'seyahat', data: { ...form, idType } });
      if (error) throw error;
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
        <div className="w-14 h-14 rounded-2xl bg-[#D4ECFA] flex items-center justify-center">
          <Plane className="h-7 w-7 text-[#3A8DC1]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('sigorta.seyahat')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Sayohat sug'urtasi</p>
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

          {/* 2. Millati & Borish mamlakati */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="nationality" variant="secondary" onChange={v => u('nationality', v)} value={form.nationality}>
              <Label>{t('form.nationality')}</Label>
              <Input placeholder="O'zbekiston" />
            </TextField>
            <TextField fullWidth isRequired name="target_country" variant="secondary" onChange={v => u('target_country', v)} value={form.target_country}>
              <Label>{t('sigorta.targetCountry')}</Label>
              <Input placeholder="Bormoqchi bo'lgan mamlakat" />
            </TextField>
          </div>

          {/* 3. Maqsad & Muddat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroSel fk="purpose" label={t('sigorta.purpose')} opts={purposes.map(p => ({ value: p, label: t(`sigorta.seyahatPurposes.${p}`) }))} />
            <HeroSel fk="duration" label={t('sigorta.duration')} opts={durations} />
          </div>

          {/* 4. Hujjat turi */}
          <div className="space-y-2">
            <Label>{t('sigorta.idType')}</Label>
            <TabSelector tabs={[{ key: 'yabanci', label: t('form.foreign') }, { key: 'turk', label: t('form.turkish') }]} value={idType} onChange={setIdType} />
          </div>

          {/* 5. Pasport/TC & Tug'ilgan sana */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="passport_tc" variant="secondary" onChange={v => u('passport_tc', v)} value={form.passport_tc}>
              <Label>{idType === 'turk' ? t('form.tcNo') : t('form.passport')}</Label>
              <Input placeholder="Pasport yoki TC raqamingiz" />
            </TextField>
            <TextField fullWidth isRequired name="birth_date" type="date" variant="secondary" onChange={v => u('birth_date', v)} value={form.birth_date}>
              <Label>{t('form.birthDate')}</Label>
              <Input placeholder="Tug'ilgan sanangiz" />
            </TextField>
          </div>

          {/* 6. Boshlanish sanasi & Jinsi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="start_date" type="date" variant="secondary" onChange={v => u('start_date', v)} value={form.start_date}>
              <Label>{t('sigorta.startDate')}</Label>
              <Input placeholder="Polisa boshlanish sanasi" />
            </TextField>
            <HeroSel fk="gender" label={t('form.gender')} opts={genderOpts} fit />
          </div>

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
