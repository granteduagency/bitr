import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

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

  const purposes = ['p1','p2','p3','p4','p5'].map(k => ({ value: k, label: t(`sigorta.seyahatPurposes.${k}`) }));
  const durations = [
    { value: '1w', label: t('sigorta.week1') }, { value: '2w', label: t('sigorta.week2') },
    { value: '1m', label: t('sigorta.month1') }, { value: '2m', label: t('sigorta.month2') },
    { value: '3m', label: t('sigorta.month3') }, { value: '4m', label: t('sigorta.month4') },
    { value: '6m', label: t('sigorta.month6') }, { value: '1y', label: t('sigorta.year1') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('sigorta_applications').insert({ client_id: cId, type: 'seyahat', data: { ...form, idType } });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('sigorta.seyahat')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.nationality')}</label><Input value={form.nationality} onChange={e => u('nationality', e.target.value)} required /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('sigorta.purpose')}</label>
          <Select value={form.purpose} onValueChange={v => u('purpose', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{purposes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.targetCountry')}</label><Input value={form.target_country} onChange={e => u('target_country', e.target.value)} required /></div>
        <TabSelector tabs={[{ key: 'yabanci', label: t('form.foreign') }, { key: 'turk', label: t('form.turkish') }]} value={idType} onChange={setIdType} />
        <div className="space-y-2"><label className="text-sm font-medium">{idType === 'turk' ? t('form.tcNo') : t('form.passport')}</label><Input value={form.passport_tc} onChange={e => u('passport_tc', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.birthDate')}</label><Input type="date" value={form.birth_date} onChange={e => u('birth_date', e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.name')}</label><Input value={form.name} onChange={e => u('name', e.target.value)} required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.surname')}</label><Input value={form.surname} onChange={e => u('surname', e.target.value)} required /></div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('sigorta.duration')}</label>
          <Select value={form.duration} onValueChange={v => u('duration', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{durations.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.startDate')}</label><Input type="date" value={form.start_date} onChange={e => u('start_date', e.target.value)} required /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.gender')}</label>
          <Select value={form.gender} onValueChange={v => u('gender', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent><SelectItem value="male">{t('common.male')}</SelectItem><SelectItem value="female">{t('common.female')}</SelectItem></SelectContent></Select>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
