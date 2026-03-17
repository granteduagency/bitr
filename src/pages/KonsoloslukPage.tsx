import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

const countries = ['uzbekistan','kazakhstan','kyrgyzstan','tajikistan','turkmenistan','azerbaijan','belarus','ukraine','russia','other'] as const;
const flags: Record<string, string> = { uzbekistan:'🇺🇿', kazakhstan:'🇰🇿', kyrgyzstan:'🇰🇬', tajikistan:'🇹🇯', turkmenistan:'🇹🇲', azerbaijan:'🇦🇿', belarus:'🇧🇾', ukraine:'🇺🇦', russia:'🇷🇺', other:'🌍' };

export default function KonsoloslukPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline">← {t('common.back')}</button>
      <h2 className="font-heading text-xl font-bold">{flags[selected]} {t(`konsolosluk.countries.${selected}`)}</h2>
      <p className="text-muted-foreground">{t('konsolosluk.noInfo')}</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-0">
      <h2 className="font-heading text-xl font-bold">{t('konsolosluk.title')}</h2>
      <p className="text-muted-foreground">{t('konsolosluk.selectCountry')}</p>
      <div className="grid grid-cols-2 gap-3">
        {countries.map(c => (
          <Card key={c} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30" onClick={() => setSelected(c)}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-2xl">{flags[c]}</span>
              <span className="font-heading font-semibold text-sm">{t(`konsolosluk.countries.${c}`)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
