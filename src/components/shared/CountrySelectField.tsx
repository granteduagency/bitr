import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getCountryNameFromCode,
  getCountryOptions,
  type CountryCode,
} from "@/lib/countries";

type CountrySelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: CountryCode) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
};

export function CountrySelectField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  className,
  buttonClassName,
}: CountrySelectFieldProps) {
  const { t, i18n } = useTranslation();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const options = React.useMemo(
    () => getCountryOptions(i18n.language),
    [i18n.language],
  );

  const selectedLabel = React.useMemo(
    () => getCountryNameFromCode(value, i18n.language),
    [i18n.language, value],
  );

  const SelectedFlag = value ? flags[value] : null;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </label>
      <Popover
        open={isOpen}
        modal
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            setSearchValue("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 w-full justify-between rounded-xl border border-slate-300 bg-white px-4 text-left font-normal text-slate-900 shadow-none hover:bg-white focus-visible:ring-0 focus-visible:ring-offset-0",
              !selectedLabel && "text-slate-500",
              buttonClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-black/10 [&_svg:not([class*='size-'])]:size-full">
                {SelectedFlag ? <SelectedFlag title={selectedLabel || value} /> : null}
              </span>
              <span className="truncate">
                {selectedLabel || placeholder || t("common.select")}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] rounded-2xl border border-slate-200 bg-white p-0 shadow-xl">
          <Command className="rounded-2xl bg-white">
            <CommandInput
              value={searchValue}
              onValueChange={(nextValue) => {
                setSearchValue(nextValue);
                window.setTimeout(() => {
                  const viewportElement = scrollAreaRef.current?.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );

                  if (viewportElement instanceof HTMLElement) {
                    viewportElement.scrollTop = 0;
                  }
                }, 0);
              }}
              placeholder={t("common.searchCountry")}
              className="h-12"
            />
            <CommandList>
              <ScrollArea ref={scrollAreaRef} className="h-72">
                <CommandEmpty>{t("common.countryNotFound")}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.code}
                      className="gap-2 rounded-xl px-3 py-2.5"
                      onSelect={() => {
                        onChange(option.code);
                        setIsOpen(false);
                      }}
                    >
                      <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-black/10 [&_svg:not([class*='size-'])]:size-full">
                        {(() => {
                          const Flag = flags[option.code];
                          return Flag ? <Flag title={option.label} /> : null;
                        })()}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">
                        {option.label}
                      </span>
                      <CheckIcon
                        className={cn(
                          "ml-auto size-4",
                          option.code === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
