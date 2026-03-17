import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/shared/FileUpload';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function CalismaForm() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clientName = localStorage.getItem('client_name') || '';
      const clientPhone = localStorage.getItem('client_phone') || '';
      const clientId = await getOrCreateClient(clientName, clientPhone);

      const { error } = await supabase.from('calisma_applications').insert({
        client_id: clientId,
        type: type === 'yurt-ici' ? 'yurt_ici' : 'yurt_disi',
        documents_url: docs,
        notes,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: t('common.success') });
    } catch (err) {
      console.error(err);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">
        {type === 'yurt-ici' ? t('calisma.yurtIci') : t('calisma.yurtDisi')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload
          label={t('common.upload') + ' 1'}
          onUpload={(url) => setDocs((prev) => [...prev.filter(Boolean), url])}
          accept="image/*,.pdf"
        />
        <FileUpload
          label={t('common.upload') + ' 2'}
          onUpload={(url) => setDocs((prev) => [...prev.filter(Boolean), url])}
          accept="image/*,.pdf"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('admin.notes')} <span className="text-xs text-muted-foreground">({t('common.optional')})</span></label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('common.loading') : t('common.submit')}
        </Button>
      </form>
    </div>
  );
}
