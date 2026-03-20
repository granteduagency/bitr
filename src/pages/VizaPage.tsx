import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Label, Surface, TextField } from '@heroui/react';
import { CountrySelectField } from '@/components/shared/CountrySelectField';
import { Button } from '@/components/ui/button';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { recordStoredClientApplication } from '@/lib/client-tracking';
import { getCountryNameFromCode } from '@/lib/countries';
import { toast } from '@/hooks/use-toast';
import { Plane, Briefcase, GraduationCap, Users, Globe, ArrowRightLeft, Truck, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const vizaTypes = ['seyahat','isci','ogrenci','aile','biznes','transit','sofor'] as const;
type VizaType = (typeof vizaTypes)[number];

const VIZA_ICONS: Record<VizaType, LucideIcon> = {
  seyahat: Plane,
  isci: Briefcase,
  ogrenci: GraduationCap,
  aile: Users,
  biznes: Globe,
  transit: ArrowRightLeft,
  sofor: Truck,
};
const VIZA_COLORS = [
  { bg: '#D4ECFA', color: '#3A8DC1' }, { bg: '#FDD6B5', color: '#C67832' },
  { bg: '#C8D5F5', color: '#4A6EC5' }, { bg: '#C8E6D0', color: '#3A8A56' },
  { bg: '#E0D4F0', color: '#7B5EA7' }, { bg: '#F2E8A0', color: '#8B7E2A' },
  { bg: '#F5D5D5', color: '#B85555' },
];

export default function VizaPage() {
  const { t, i18n } = useTranslation();
  const [selectedType, setSelectedType] = useState<VizaType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    from_country: '', to_country: '', travel_date: '',
    phone: localStorage.getItem('client_phone') || '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const submissionForm = {
        ...form,
        from_country: getCountryNameFromCode(form.from_country, i18n.language),
        to_country: getCountryNameFromCode(form.to_country, i18n.language),
      };
      const { error } = await supabase
        .from('visa_applications')
        .insert({ id: applicationId, client_id: cId, type: selectedType!, ...submissionForm });
      if (error) throw error;
      await recordStoredClientApplication({
        route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard/viza',
        serviceKey: 'visa',
        referenceId: applicationId,
        details: {
          type: selectedType,
          fromCountry: submissionForm.from_country,
          toCountry: submissionForm.to_country,
          travelDate: form.travel_date,
        },
      }).catch((trackingError) => {
        console.error('Visa application tracking error:', trackingError);
      });
      void notifyAdminNewApplication('visa', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  if (selectedType) {
    const idx = vizaTypes.indexOf(selectedType);
    const style = VIZA_COLORS[idx % VIZA_COLORS.length];
    const IconComp = VIZA_ICONS[selectedType] || Plane;
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Button type="button" variant="ghost" onClick={() => setSelectedType(null)} className="w-fit px-0 text-sm font-medium text-slate-500 hover:bg-transparent hover:text-slate-900">
          ← {t('common.back')}
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: style.bg }}>
            <IconComp className="h-7 w-7" style={{ color: style.color }} />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-slate-900">{t(`viza.types.${selectedType}`)}</h2>
            <p className="text-slate-400 text-sm">Viza arizasi</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CountrySelectField
                label={t('viza.fromCountry')}
                required
                value={form.from_country}
                onChange={(value) => u('from_country', value)}
              />
              <CountrySelectField
                label={t('viza.toCountry')}
                required
                value={form.to_country}
                onChange={(value) => u('to_country', value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth isRequired name="travel_date" type="date" variant="secondary" onChange={v => u('travel_date', v)} value={form.travel_date}>
                <Label>{t('viza.travelDate')}</Label>
                <Input />
              </TextField>
              <TextField fullWidth isRequired name="phone" type="tel" variant="secondary" onChange={v => u('phone', v)} value={form.phone}>
                <Label>{t('form.phone')}</Label>
                <Input placeholder="+90 5XX XXX XX XX" />
              </TextField>
            </div>
            <p className="text-sm text-muted">{t('viza.contactInfo')}</p>
            <SubmitButton isPending={loading} />
          </Surface>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('viza.title')}</h2>
        <p className="text-slate-400 text-sm mt-1">Viza turini tanlang</p>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {vizaTypes.map((type, i) => {
          const IconComp = VIZA_ICONS[type] || Plane;
          const style = VIZA_COLORS[i % VIZA_COLORS.length];
          return (
            <motion.div key={type} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[1.5rem] p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[140px] flex flex-col justify-between"
              style={{ backgroundColor: style.bg }} onClick={() => setSelectedType(type)}
            >
              <div>
                <IconComp className="h-7 w-7 mb-3" style={{ color: style.color }} strokeWidth={1.8} />
                <h3 className="font-heading font-bold text-[0.9rem] text-slate-800">{t(`viza.types.${type}`)}</h3>
              </div>
              <div className="flex justify-end mt-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: style.color, color: '#fff' }}>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
