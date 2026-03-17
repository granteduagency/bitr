import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

const carBrandKeys = ['toyota','mercedes','bmw','volkswagen','ford','audi','honda','nissan','hyundai','kia','renault','peugeot','fiat','skoda','seat','opel','volvo','mazda','mitsubishi','suzuki'];
const modelYears = Array.from({ length: 47 }, (_, i) => (2026 - i).toString());

export default function SigortaArac() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>(); // trafik or kasko
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
      await supabase.from('sigorta_applications').insert({
        client_id: cId, type: isKasko ? 'kasko' : 'trafik',
        data: { ...form, plateType, idType, vehicleType, isKasko },
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const showPlateInputs = !isKasko;
  const showNoPlateFields = plateType === 'noplate' || plateType === 'foreign' || isKasko;
  const showForeignExtra = plateType === 'foreign' || isKasko;

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{isKasko ? t('sigorta.kasko') : t('sigorta.trafik')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {showPlateInputs && (
          <TabSelector tabs={[
            { key: 'turkish', label: t('sigorta.turkishPlate') },
            { key: 'noplate', label: t('sigorta.noPlate') },
            { key: 'foreign', label: t('sigorta.foreignPlate') },
          ]} value={plateType} onChange={setPlateType} />
        )}

        <TabSelector tabs={[{ key: 'tc', label: t('form.tc') }, { key: 'vergi', label: t('form.vergi') }]} value={idType} onChange={setIdType} />
        <div className="space-y-2"><label className="text-sm font-medium">{idType === 'tc' ? t('form.tcNo') : t('form.vergiNo')}</label><Input value={form.id_number} onChange={e => u('id_number', e.target.value)} required /></div>

        {plateType === 'turkish' && !isKasko && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.plateNo')}</label><Input value={form.plate_no_1} onChange={e => u('plate_no_1', e.target.value)} placeholder="34" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">&nbsp;</label><Input value={form.plate_no_2} onChange={e => u('plate_no_2', e.target.value)} placeholder="ABC 1234" /></div>
          </div>
        )}

        {plateType === 'turkish' && !isKasko && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.serialNo')}</label><Input value={form.serial_1} onChange={e => u('serial_1', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">&nbsp;</label><Input value={form.serial_2} onChange={e => u('serial_2', e.target.value)} /></div>
          </div>
        )}

        {showNoPlateFields && (
          <>
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.motorNo')}</label><Input value={form.motor_no} onChange={e => u('motor_no', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.chassisNo')}</label><Input value={form.chassis_no} onChange={e => u('chassis_no', e.target.value)} /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sigorta.carBrand')}</label>
              <Select value={form.car_brand} onValueChange={v => u('car_brand', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                <SelectContent>{carBrandKeys.map(k => <SelectItem key={k} value={k}>{t(`carBrands.${k}`)}</SelectItem>)}</SelectContent></Select>
            </div>
          </>
        )}

        {showForeignExtra && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">{t('form.name')}</label><Input value={form.name} onChange={e => u('name', e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t('form.surname')}</label><Input value={form.surname} onChange={e => u('surname', e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sigorta.policyDuration')}</label>
              <Select value={form.policy_duration} onValueChange={v => u('policy_duration', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                <SelectContent>{['m1','m2','m3','m6','m12'].map(k => <SelectItem key={k} value={k}>{t(`policyMonths.${k}`)}</SelectItem>)}</SelectContent></Select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('sigorta.modelYear')}</label>
          <Select value={form.model_year} onValueChange={v => u('model_year', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
            <SelectContent>{modelYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
        </div>

        {!isKasko && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('sigorta.vehicleType')}</label>
            <TabSelector tabs={['v1','v2','v3','v4','v5'].map(k => ({ key: k, label: t(`sigorta.vehicleTypes.${k}`) }))} value={vehicleType} onChange={setVehicleType} />
          </div>
        )}

        {(idType === 'tc' || (plateType === 'foreign' && !isKasko)) && (
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.birthDate')}</label><Input type="date" value={form.birth_date} onChange={e => u('birth_date', e.target.value)} /></div>
        )}

        {isKasko && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sigorta.disabledVehicle')}</label>
              <Select value={form.disabled_vehicle} onValueChange={v => u('disabled_vehicle', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">{t('common.no')}</SelectItem><SelectItem value="yes">{t('common.yes')}</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sigorta.hasLpg')}</label>
              <Select value={form.has_lpg} onValueChange={v => u('has_lpg', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">{t('common.no')}</SelectItem><SelectItem value="yes">{t('common.yes')}</SelectItem></SelectContent></Select>
            </div>
          </>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
