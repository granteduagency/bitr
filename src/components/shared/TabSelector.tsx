import { ToggleButton, ToggleButtonGroup } from '@heroui/react';

interface TabSelectorProps {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function TabSelector({ tabs, value, onChange }: TabSelectorProps) {
  return (
    <ToggleButtonGroup
      selectionMode="single"
      selectedKeys={new Set([value])}
      onSelectionChange={(keys) => {
        const selected = [...keys][0];
        if (selected) onChange(String(selected));
      }}
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => (
        <ToggleButton
          key={tab.key}
          id={tab.key}
          className={`h-9 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
            value === tab.key
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
