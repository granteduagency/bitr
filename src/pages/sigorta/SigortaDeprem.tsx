import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Surface, TextField, Spinner } from '@heroui/react';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { recordStoredClientApplication } from '@/lib/client-tracking';
import { toast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { Mountain } from 'lucide-react';

const makeOptions = (keys: string[], tPrefix: string, t: (k: string) => string) =>
  keys.map(k => ({ value: k, label: t(`${tPrefix}.${k}`) }));

export default function SigortaDeprem() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idType, setIdType] = useState('tc');
  const [form, setForm] = useState({
    id_number: '', building_area: '', building_type: '', usage_type: '',
    floor_count: '', apartment_no: '', mobile_phone: '', address_code: '',
    build_year: '', insured_type: '', damage_status: '', birth_date: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase
        .from('sigorta_applications')
        .insert({ id: applicationId, client_id: cId, type: 'deprem', data: { ...form, idType } });
      if (error) throw error;
      await recordStoredClientApplication({
        route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard/sigorta/deprem',
        serviceKey: 'sigorta',
        referenceId: applicationId,
        details: {
          type: 'deprem',
          idType,
          buildingType: form.building_type,
          usageType: form.usage_type,
        },
      }).catch((trackingError) => {
        console.error('Earthquake insurance tracking error:', trackingError);
      });
      void notifyAdminNewApplication('sigorta', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const HeroSel = ({ fieldKey, opts, label }: { fieldKey: string; opts: { value: string; label: string }[]; label: string }) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={form[fieldKey as keyof typeof form] || ''} onValueChange={k => u(fieldKey, k)}>
        <SelectTrigger className="w-full">
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
        <div className="w-14 h-14 rounded-2xl bg-[#F2E8A0] flex items-center justify-center">
          <Mountain className="h-7 w-7 text-[#8B7E2A]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('sigorta.deprem')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Zilzila sug'urtasi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          {/* 1. Hujjat turi */}
          <div className="space-y-2">
            <Label>{t('sigorta.idType')}</Label>
            <TabSelector tabs={[{ key: 'tc', label: t('form.tc') }, { key: 'vergi', label: t('form.vergi') }]} value={idType} onChange={setIdType} />
          </div>

          {/* 2. ID raqami & Telefon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="id_number" variant="secondary" onChange={v => u('id_number', v)} value={form.id_number}>
              <Label>{idType === 'tc' ? t('form.tcNo') : t('form.vergiNo')}</Label>
              <Input placeholder="TC veya vergi numarası" />
            </TextField>
            <TextField fullWidth isRequired name="mobile_phone" type="tel" variant="secondary" onChange={v => u('mobile_phone', v)} value={form.mobile_phone}>
              <Label>{t('sigorta.mobilePhone')}</Label>
              <Input placeholder="+90 5XX XXX XX XX" />
            </TextField>
          </div>

          {/* 3. Bino turi, foydalanish turi, qavat soni */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HeroSel fieldKey="building_type" label={t('sigorta.buildingType')} opts={makeOptions(['t1','t2'], 'sigorta.buildingTypes', t)} />
            <HeroSel fieldKey="usage_type" label={t('sigorta.usageType')} opts={makeOptions(['u1','u2','u3'], 'sigorta.usageTypes', t)} />
            <HeroSel fieldKey="floor_count" label={t('sigorta.floorCount')} opts={makeOptions(['f1','f2','f3','f4'], 'sigorta.floorCounts', t)} />
          </div>

          {/* 4. Bino maydoni & Kvartira raqami */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="building_area" type="number" variant="secondary" onChange={v => u('building_area', v)} value={form.building_area}>
              <Label>{t('sigorta.buildingArea')}</Label>
              <Input placeholder="Bino maydoni (m²)" />
            </TextField>
            <TextField fullWidth name="apartment_no" variant="secondary" onChange={v => u('apartment_no', v)} value={form.apartment_no}>
              <Label>{t('sigorta.apartmentNo')}</Label>
              <Input placeholder="Daire numarası" />
            </TextField>
          </div>

          {/* 5. Manzil kodi */}
          <TextField fullWidth name="address_code" variant="secondary" onChange={v => u('address_code', v)} value={form.address_code}>
            <Label>{t('sigorta.addressCode')}</Label>
            <Input />
          </TextField>

          {/* 6. Qurilish yili, Sug'urta turi, Shikast holati */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HeroSel fieldKey="build_year" label={t('sigorta.buildYear')} opts={makeOptions(['y1','y2','y3','y4','y5'], 'sigorta.buildYears', t)} />
            <HeroSel fieldKey="insured_type" label={t('sigorta.insuredType')} opts={makeOptions(['i1','i2','i3','i4'], 'sigorta.insuredTypes', t)} />
            <HeroSel fieldKey="damage_status" label={t('sigorta.damageStatus')} opts={makeOptions(['d1','d2','d3'], 'sigorta.damageStatuses', t)} />
          </div>

          {/* 7. Tug'ilgan sana (faqat TC) */}
          {idType === 'tc' && (
            <TextField fullWidth name="birth_date" type="date" variant="secondary" onChange={v => u('birth_date', v)} value={form.birth_date}>
              <Label>{t('form.birthDate')}</Label>
              <Input />
            </TextField>
          )}

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
