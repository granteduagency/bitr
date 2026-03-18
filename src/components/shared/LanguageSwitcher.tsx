import { useTranslation } from 'react-i18next';
import { LanguagesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center justify-center rounded-full bg-white overflow-hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full w-10 h-10 shrink-0 border-slate-200 hover:bg-slate-50 transition-colors">
            <LanguagesIcon className="w-5 h-5 text-slate-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="rounded-2xl bg-white p-2 border-slate-100 shadow-xl min-w-[140px]">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors bg-white ${
                i18n.language === lang.code 
                  ? 'bg-black text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-bold leading-none">{lang.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
