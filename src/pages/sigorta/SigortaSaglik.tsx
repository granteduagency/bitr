import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/FileUpload';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function SigortaSaglik() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const citizenType = searchParams.get('type') || 'yabanci';
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    passport_url: '', father_name: '', mother_name: '', country: '',
    start_date: '', duration: '1', birth_date: '', gender: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('sigorta_applications').insert({ client_id: cId, type: 'saglik', data: { ...form, citizenType } });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('sigorta.saglik')} — {citizenType === 'turk' ? t('form.turkish') : t('form.foreign')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload label={t('sigorta.passportTc') + ' (' + t('form.supporterIdFront') + ')'} onUpload={(url) => u('passport_url', url)} />
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.fatherName')}</label><Input value={form.father_name} onChange={e => u('father_name', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.motherName')}</label><Input value={form.mother_name} onChange={e => u('mother_name', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.country')}</label><Input value={form.country} onChange={e => u('country', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.startDate')}</label><Input type="date" value={form.start_date} onChange={e => u('start_date', e.target.value)} required /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('sigorta.duration')}</label>
          <TabSelector tabs={[{ key: '1', label: t('sigorta.year1') }, { key: '2', label: t('sigorta.year2') }, { key: '3', label: t('sigorta.year3') }]} value={form.duration} onChange={v => u('duration', v)} />
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.birthDate')}</label><Input type="date" value={form.birth_date} onChange={e => u('birth_date', e.target.value)} required /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.gender')}</label>
          <Select value={form.gender} onValueChange={v => u('gender', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent><SelectItem value="male">{t('common.male')}</SelectItem><SelectItem value="female">{t('common.female')}</SelectItem></SelectContent></Select>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
