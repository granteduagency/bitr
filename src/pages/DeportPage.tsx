import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { calculateDeport } from '@/lib/deportCalculation';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function DeportPage() {
  const { t } = useTranslation();
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [result, setResult] = useState<ReturnType<typeof calculateDeport> | null>(null);

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate || !exitDate) return;
    setResult(calculateDeport(new Date(entryDate), new Date(exitDate)));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('deport.title')}</h2>
      <form onSubmit={handleCalc} className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">{t('deport.entryDate')}</label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('deport.exitDate')}</label><Input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} required /></div>
        <Button type="submit" className="w-full" size="lg">{t('deport.calculate')}</Button>
      </form>
      {result && (
        <Card className={result.hasViolation ? 'border-destructive/50' : 'border-success/50'}>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">{result.hasViolation ? <AlertTriangle className="h-8 w-8 text-destructive" /> : <CheckCircle className="h-8 w-8 text-success" />}
              <h3 className="font-heading font-bold text-lg">{t('deport.result')}</h3></div>
            {result.hasViolation ? (<>
              <p><strong>{t('deport.violationDays')}:</strong> {result.violationDays}</p>
              <p><strong>{t('deport.penaltyAmount')}:</strong> {result.penaltyAmount.toLocaleString()} TL</p>
              {result.deportDuration && <p><strong>{t('deport.deportDuration')}:</strong> {result.deportDuration}</p>}
            </>) : <p className="text-success font-medium">{t('deport.noViolation')}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
