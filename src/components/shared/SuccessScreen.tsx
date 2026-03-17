import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function SuccessScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-success" />
      </div>
      <h2 className="text-2xl font-heading font-bold mb-2">{t('common.formSubmitted')}</h2>
      <p className="text-muted-foreground mb-8">{t('common.formSubmittedDesc')}</p>
      <Button onClick={() => navigate('/dashboard')}>{t('nav.home')}</Button>
    </div>
  );
}
