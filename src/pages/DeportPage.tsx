import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { calculateDeport } from '@/lib/deportCalculation';
import { AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="space-y-6 pb-24 lg:pb-6">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-header">{t('deport.title')}</motion.h2>
      <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCalc} className="form-section space-y-5">
        <div className="space-y-2"><label className="text-sm font-semibold">{t('deport.entryDate')}</label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="rounded-xl h-11" required /></div>
        <div className="space-y-2"><label className="text-sm font-semibold">{t('deport.exitDate')}</label><Input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} className="rounded-xl h-11" required /></div>
        <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-primary">
          <Calculator className="mr-2 h-4 w-4" /> {t('deport.calculate')}
        </Button>
      </motion.form>
      {result && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={`border-2 ${result.hasViolation ? 'border-destructive/30' : 'border-success/30'} overflow-hidden`}>
            <div className={`h-1.5 ${result.hasViolation ? 'gradient-warm' : 'gradient-success'}`} />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                {result.hasViolation ? <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
                  : <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-success" /></div>}
                <h3 className="font-heading font-extrabold text-lg">{t('deport.result')}</h3>
              </div>
              {result.hasViolation ? (
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-muted-foreground">{t('deport.violationDays')}</span><span className="font-bold font-mono">{result.violationDays}</span></p>
                  <p className="flex justify-between"><span className="text-muted-foreground">{t('deport.penaltyAmount')}</span><span className="font-bold font-mono text-destructive">{result.penaltyAmount.toLocaleString()} TL</span></p>
                  {result.deportDuration && <p className="flex justify-between"><span className="text-muted-foreground">{t('deport.deportDuration')}</span><span className="font-bold">{result.deportDuration}</span></p>}
                </div>
              ) : <p className="text-success font-semibold">{t('deport.noViolation')}</p>}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
