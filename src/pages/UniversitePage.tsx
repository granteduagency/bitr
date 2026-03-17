import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { GraduationCap } from 'lucide-react';

export default function UniversitePage() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'search' | 'results' | 'apply'>('search');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [search, setSearch] = useState({ degree: '', faculty: '', program: '', language: '' });
  const [form, setForm] = useState({ passport_url: '', diploma_url: '', diploma_supplement_url: '', photo_url: '', phone: localStorage.getItem('client_phone') || '' });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fetchUnis = async () => {
    const { data } = await supabase.from('universities').select('*').eq('is_active', true);
    if (data) {
      let filtered = data;
      if (search.degree) filtered = filtered.filter(u => u.degrees?.includes(search.degree));
      if (search.language) filtered = filtered.filter(u => u.languages?.includes(search.language));
      setUniversities(filtered);
      setStep('results');
    }
  };

  if (submitted) return <SuccessScreen />;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('university_applications').insert({
        client_id: cId, university_id: selectedUni.id, degree: search.degree,
        faculty: search.faculty, program: search.program, language: search.language, ...form,
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  if (step === 'apply' && selectedUni) return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{i18n.language === 'uz' ? selectedUni.name_uz : selectedUni.name_tr}</h2>
      <p className="text-muted-foreground">{t('universite.applyTitle')}</p>
      <form onSubmit={handleApply} className="space-y-4">
        <FileUpload label={t('universite.passportUpload')} onUpload={url => u('passport_url', url)} />
        <FileUpload label={t('universite.diplomaUpload')} onUpload={url => u('diploma_url', url)} />
        <FileUpload label={t('universite.diplomaSupplementUpload')} onUpload={url => u('diploma_supplement_url', url)} />
        <FileUpload label={t('universite.photoUpload')} onUpload={url => u('photo_url', url)} accept="image/*" />
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.phone')}</label><Input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel" required /></div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );

  if (step === 'results') return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-6">
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-xl font-bold">{t('universite.results')}</h2>
        <Button variant="outline" size="sm" onClick={() => setStep('search')}>{t('common.back')}</Button>
      </div>
      {universities.length === 0 ? <p className="text-muted-foreground py-8 text-center">{t('common.noData')}</p> :
        universities.map(uni => (
          <Card key={uni.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelectedUni(uni); setStep('apply'); }}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0"><GraduationCap className="h-6 w-6 text-success" /></div>
              <div><p className="font-heading font-semibold">{i18n.language === 'uz' ? uni.name_uz : uni.name_tr}</p><p className="text-sm text-muted-foreground">{uni.city}</p></div>
            </CardContent>
          </Card>
        ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('universite.title')}</h2>
      <div className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">{t('universite.degree')}</label>
          <Select value={search.degree} onValueChange={v => setSearch(p => ({ ...p, degree: v }))}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>
            <SelectItem value="lisans">{t('universite.degrees.lisans')}</SelectItem><SelectItem value="yuksek_lisans">{t('universite.degrees.yuksek_lisans')}</SelectItem><SelectItem value="doktora">{t('universite.degrees.doktora')}</SelectItem>
          </SelectContent></Select></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('universite.language')}</label>
          <Select value={search.language} onValueChange={v => setSearch(p => ({ ...p, language: v }))}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>
            <SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem>
          </SelectContent></Select></div>
        <Button onClick={fetchUnis} className="w-full" size="lg">{t('universite.searchBtn')}</Button>
      </div>
    </div>
  );
}
