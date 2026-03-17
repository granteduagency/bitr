import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabSelectorProps {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function TabSelector({ tabs, value, onChange }: TabSelectorProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className="w-full">
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
