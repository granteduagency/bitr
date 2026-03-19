import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TabSelectorProps {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function TabSelector({ tabs, value, onChange }: TabSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          type="button"
          variant={value === tab.key ? 'default' : 'outline'}
          onClick={() => onChange(tab.key)}
          className={cn(
            'h-9 rounded-xl px-4 text-sm font-semibold transition-all duration-200',
            value === tab.key
              ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
