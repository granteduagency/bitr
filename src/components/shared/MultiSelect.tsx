import { useState, useRef, useEffect } from 'react';
import { Label } from '@heroui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  selectAllLabel?: string;
}

export function MultiSelect({
  label,
  placeholder = 'Tanlang...',
  options,
  value,
  onChange,
  selectAllLabel = 'Hammasini tanlash',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSelected = value.length === options.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map(o => o.value));
  };

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpen(o => !o)}
        >
          <span className={value.length > 0 ? 'text-foreground' : 'text-muted'}>
            {value.length > 0
              ? `${value.length} ta tanlandi`
              : placeholder
            }
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Select All */}
            <Button
              type="button"
              onClick={toggleAll}
              variant="ghost"
              className="flex h-auto w-full items-center gap-2 rounded-none border-b border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 justify-start"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                {allSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              {selectAllLabel}
            </Button>

            {/* Options */}
            <div className="max-h-[200px] overflow-y-auto py-1">
              {options.map(option => {
                const selected = value.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    variant="ghost"
                    className="flex h-auto w-full items-center gap-2 justify-start rounded-none px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
