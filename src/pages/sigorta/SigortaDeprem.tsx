import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

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
      await supabase.from('sigorta_applications').insert({ client_id: cId, type: 'deprem', data: { ...form, idType } });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const selectField = (label: string, key: string, options: { value: string; label: string }[]) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={form[key as keyof typeof form]} onValueChange={v => u(key, v)}>
        <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('sigorta.deprem')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TabSelector tabs={[{ key: 'tc', label: t('form.tc') }, { key: 'vergi', label: t('form.vergi') }]} value={idType} onChange={setIdType} />
        <div className="space-y-2"><label className="text-sm font-medium">{idType === 'tc' ? t('form.tcNo') : t('form.vergiNo')}</label><Input value={form.id_number} onChange={e => u('id_number', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.buildingArea')}</label><Input type="number" value={form.building_area} onChange={e => u('building_area', e.target.value)} required /></div>
        {selectField(t('sigorta.buildingType'), 'building_type', [{ value: 't1', label: t('sigorta.buildingTypes.t1') }, { value: 't2', label: t('sigorta.buildingTypes.t2') }])}
        {selectField(t('sigorta.usageType'), 'usage_type', [{ value: 'u1', label: t('sigorta.usageTypes.u1') }, { value: 'u2', label: t('sigorta.usageTypes.u2') }, { value: 'u3', label: t('sigorta.usageTypes.u3') }])}
        {selectField(t('sigorta.floorCount'), 'floor_count', [{ value: 'f1', label: t('sigorta.floorCounts.f1') }, { value: 'f2', label: t('sigorta.floorCounts.f2') }, { value: 'f3', label: t('sigorta.floorCounts.f3') }, { value: 'f4', label: t('sigorta.floorCounts.f4') }])}
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.apartmentNo')}</label><Input value={form.apartment_no} onChange={e => u('apartment_no', e.target.value)} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.mobilePhone')}</label><Input type="tel" value={form.mobile_phone} onChange={e => u('mobile_phone', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.addressCode')}</label><Input value={form.address_code} onChange={e => u('address_code', e.target.value)} /></div>
        {selectField(t('sigorta.buildYear'), 'build_year', ['y1','y2','y3','y4','y5'].map(k => ({ value: k, label: t(`sigorta.buildYears.${k}`) })))}
        {selectField(t('sigorta.insuredType'), 'insured_type', ['i1','i2','i3','i4'].map(k => ({ value: k, label: t(`sigorta.insuredTypes.${k}`) })))}
        {selectField(t('sigorta.damageStatus'), 'damage_status', ['d1','d2','d3'].map(k => ({ value: k, label: t(`sigorta.damageStatuses.${k}`) })))}
        {idType === 'tc' && <div className="space-y-2"><label className="text-sm font-medium">{t('form.birthDate')}</label><Input type="date" value={form.birth_date} onChange={e => u('birth_date', e.target.value)} /></div>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
