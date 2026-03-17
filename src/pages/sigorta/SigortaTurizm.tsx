import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabSelector } from '@/components/shared/TabSelector';
import { FileUpload } from '@/components/shared/FileUpload';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function SigortaTurizm() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sponsorType, setSponsorType] = useState('person');
  const [form, setForm] = useState({
    passport_url: '', birth_date: '', name: '', surname: '', father_name: '',
    nationality: '', plan: '', policy_duration: '', policy_start: '', gender: '',
    sponsor_nationality: '', sponsor_passport_tc: '', sponsor_gender: '',
    sponsor_name: '', sponsor_birth_date: '', sponsor_surname: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const plans = ['p1','p2','p3','p4','p5','p6','p7','p8','p9'].map(k => ({ value: k, label: t(`sigorta.turizmPlans.${k}`) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('sigorta_applications').insert({ client_id: cId, type: 'turizm', data: { ...form, sponsorType } });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('sigorta.turizm')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload label={t('form.passport')} onUpload={url => u('passport_url', url)} />
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.birthDate')}</label><Input type="date" value={form.birth_date} onChange={e => u('birth_date', e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.name')}</label><Input value={form.name} onChange={e => u('name', e.target.value)} required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.surname')}</label><Input value={form.surname} onChange={e => u('surname', e.target.value)} required /></div>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.fatherNameShort')}</label><Input value={form.father_name} onChange={e => u('father_name', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.nationality')}</label><Input value={form.nationality} onChange={e => u('nationality', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.plan')}</label>
          <Select value={form.plan} onValueChange={v => u('plan', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{plans.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.policyDuration')}</label>
          <Select value={form.policy_duration} onValueChange={v => u('policy_duration', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>
            <SelectItem value="3m">{t('sigorta.month3')}</SelectItem><SelectItem value="6m">{t('sigorta.month6')}</SelectItem><SelectItem value="12m">{t('sigorta.year1')}</SelectItem>
          </SelectContent></Select>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.policyStart')}</label><Input type="date" value={form.policy_start} onChange={e => u('policy_start', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.gender')}</label>
          <Select value={form.gender} onValueChange={v => u('gender', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent><SelectItem value="male">{t('common.male')}</SelectItem><SelectItem value="female">{t('common.female')}</SelectItem></SelectContent></Select>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h3 className="font-heading font-semibold">{t('sigorta.sponsorInfo')}</h3>
          <TabSelector tabs={[{ key: 'person', label: t('common.person') }, { key: 'corporate', label: t('common.corporate') }]} value={sponsorType} onChange={setSponsorType} />
          <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.sponsorNationality')}</label><Input value={form.sponsor_nationality} onChange={e => u('sponsor_nationality', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.sponsorPassportTc')}</label><Input value={form.sponsor_passport_tc} onChange={e => u('sponsor_passport_tc', e.target.value)} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('form.gender')}</label>
            <Select value={form.sponsor_gender} onValueChange={v => u('sponsor_gender', v)}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent><SelectItem value="male">{t('common.male')}</SelectItem><SelectItem value="female">{t('common.female')}</SelectItem></SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.sponsorName')}</label><Input value={form.sponsor_name} onChange={e => u('sponsor_name', e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.sponsorSurname')}</label><Input value={form.sponsor_surname} onChange={e => u('sponsor_surname', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('sigorta.sponsorBirthDate')}</label><Input type="date" value={form.sponsor_birth_date} onChange={e => u('sponsor_birth_date', e.target.value)} /></div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
