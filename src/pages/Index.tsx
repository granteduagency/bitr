import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Stamp } from 'lucide-react';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('client_name', name.trim());
    localStorage.setItem('client_phone', phone.trim());
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md animate-fade-in border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Stamp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{t('landing.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('landing.subtitle')}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('landing.nameLabel')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('landing.namePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('landing.phoneLabel')}</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('landing.phonePlaceholder')}
                type="tel"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              {t('landing.continue')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
