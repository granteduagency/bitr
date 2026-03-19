import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
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
import { Car } from 'lucide-react';

const carBrandKeys = ['toyota','mercedes','bmw','volkswagen','ford','audi','honda','nissan','hyundai','kia','renault','peugeot','fiat','skoda','seat','opel','volvo','mazda','mitsubishi','suzuki'];
const modelYears = Array.from({ length: 47 }, (_, i) => (2026 - i).toString());

export default function SigortaArac() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const isKasko = type === 'kasko';
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plateType, setPlateType] = useState('turkish');
  const [idType, setIdType] = useState('tc');
  const [vehicleType, setVehicleType] = useState('v1');

  const [form, setForm] = useState({
    id_number: '', plate_no_1: '', plate_no_2: '', serial_1: '', serial_2: '',
    model_year: '', birth_date: '', motor_no: '', chassis_no: '', car_brand: '',
    name: '', surname: '', policy_duration: '', disabled_vehicle: 'no', has_lpg: 'no',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const { data: application, error } = await supabase.from('sigorta_applications').insert({
        client_id: cId, type: isKasko ? 'kasko' : 'trafik',
        data: { ...form, plateType, idType, vehicleType, isKasko },
      }).select('id').single();
      if (error) throw error;
      void notifyAdminNewApplication('sigorta', application.id).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const showNoPlateFields = plateType === 'noplate' || plateType === 'foreign' || isKasko;
  const showForeignExtra = plateType === 'foreign' || isKasko;

  const HeroSel = ({ fieldKey, opts, label, fit }: { fieldKey: string; opts: { value: string; label: string }[]; label: string; fit?: boolean }) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={form[fieldKey as keyof typeof form] || ''} onValueChange={k => u(fieldKey, k)}>
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
        <div className="w-14 h-14 rounded-2xl bg-[#E0D4F0] flex items-center justify-center">
          <Car className="h-7 w-7 text-[#7B5EA7]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
            {isKasko ? t('sigorta.kasko') : t('sigorta.trafik')}
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Avtomobil sug'urtasi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          {/* 1. Hujjat turi */}
          <div className="space-y-2">
            <Label>{t('sigorta.idType')}</Label>
            <TabSelector tabs={[{ key: 'tc', label: t('form.tc') }, { key: 'vergi', label: t('form.vergi') }]} value={idType} onChange={setIdType} />
          </div>

          {/* 2. ID raqami */}
          <TextField fullWidth isRequired name="id_number" variant="secondary" onChange={v => u('id_number', v)} value={form.id_number}>
            <Label>{idType === 'tc' ? t('form.tcNo') : t('form.vergiNo')}</Label>
            <Input placeholder="TC veya vergi numarası" />
          </TextField>

          {/* 3. Plaka turi (faqat trafik) */}
          {!isKasko && (
            <div className="space-y-2">
              <Label>{t('sigorta.plateType')}</Label>
              <TabSelector tabs={[
                { key: 'turkish', label: t('sigorta.turkishPlate') },
                { key: 'noplate', label: t('sigorta.noPlate') },
                { key: 'foreign', label: t('sigorta.foreignPlate') },
              ]} value={plateType} onChange={setPlateType} />
            </div>
          )}

          {/* 4. Plaka raqami */}
          {plateType === 'turkish' && !isKasko && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <TextField fullWidth name="plate_no_1" variant="secondary" onChange={v => u('plate_no_1', v)} value={form.plate_no_1}>
                  <Label>{t('sigorta.plateNo')}</Label>
                  <Input placeholder="34" />
                </TextField>
                <TextField fullWidth name="plate_no_2" variant="secondary" onChange={v => u('plate_no_2', v)} value={form.plate_no_2}>
                  <Label>&nbsp;</Label>
                  <Input placeholder="ABC 1234" />
                </TextField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextField fullWidth name="serial_1" variant="secondary" onChange={v => u('serial_1', v)} value={form.serial_1}>
                  <Label>{t('sigorta.serialNo')}</Label>
                  <Input />
                </TextField>
                <TextField fullWidth name="serial_2" variant="secondary" onChange={v => u('serial_2', v)} value={form.serial_2}>
                  <Label>&nbsp;</Label>
                  <Input />
                </TextField>
              </div>
            </>
          )}

          {/* 5. Motor/Shassi/Marka (plakasiz yoki chet el) */}
          {showNoPlateFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth name="motor_no" variant="secondary" onChange={v => u('motor_no', v)} value={form.motor_no}>
                <Label>{t('sigorta.motorNo')}</Label>
                <Input placeholder="Motor seri numarası" />
              </TextField>
              <TextField fullWidth name="chassis_no" variant="secondary" onChange={v => u('chassis_no', v)} value={form.chassis_no}>
                <Label>{t('sigorta.chassisNo')}</Label>
                <Input placeholder="Şasi numarası" />
              </TextField>
            </div>
          )}

          {showNoPlateFields && (
            <HeroSel fieldKey="car_brand" label={t('sigorta.carBrand')} opts={carBrandKeys.map(k => ({ value: k, label: t(`carBrands.${k}`) }))} />
          )}

          {/* 6. Ism/Familiya & Polisa muddati (chet el / kasko) */}
          {showForeignExtra && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField fullWidth name="name" variant="secondary" onChange={v => u('name', v)} value={form.name}>
                  <Label>{t('form.name')}</Label>
                  <Input placeholder="Adınız" />
                </TextField>
                <TextField fullWidth name="surname" variant="secondary" onChange={v => u('surname', v)} value={form.surname}>
                  <Label>{t('form.surname')}</Label>
                  <Input placeholder="Soyadınız" />
                </TextField>
              </div>
              <HeroSel fieldKey="policy_duration" label={t('sigorta.policyDuration')} opts={['m1','m2','m3','m6','m12'].map(k => ({ value: k, label: t(`policyMonths.${k}`) }))} />
            </>
          )}

          {/* 7. Model yili */}
          <HeroSel fieldKey="model_year" label={t('sigorta.modelYear')} opts={modelYears.map(y => ({ value: y, label: y }))} />

          {/* 8. Transport turi (faqat trafik) */}
          {!isKasko && (
            <div className="space-y-2">
              <Label>{t('sigorta.vehicleType')}</Label>
              <TabSelector tabs={['v1','v2','v3','v4','v5'].map(k => ({ key: k, label: t(`sigorta.vehicleTypes.${k}`) }))} value={vehicleType} onChange={setVehicleType} />
            </div>
          )}

          {/* 9. Tug'ilgan sana */}
          {(idType === 'tc' || (plateType === 'foreign' && !isKasko)) && (
            <TextField fullWidth name="birth_date" type="date" variant="secondary" onChange={v => u('birth_date', v)} value={form.birth_date}>
              <Label>{t('form.birthDate')}</Label>
              <Input />
            </TextField>
          )}

          {/* 10. Kasko: nogironlar avto / LPG (w-fit — Ha/Yo'q) */}
          {isKasko && (
            <div className="flex flex-wrap gap-4">
              <HeroSel fieldKey="disabled_vehicle" label={t('sigorta.disabledVehicle')} opts={[{ value: 'no', label: t('common.no') }, { value: 'yes', label: t('common.yes') }]} fit />
              <HeroSel fieldKey="has_lpg" label={t('sigorta.hasLpg')} opts={[{ value: 'no', label: t('common.no') }, { value: 'yes', label: t('common.yes') }]} fit />
            </div>
          )}

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
