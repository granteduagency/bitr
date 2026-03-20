import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  clientPhoneCountries,
  getClientCountryCallingCode,
  type ClientPhoneCountry,
} from "@/lib/client-entry";

type ClientPhoneFieldProps = {
  value: string;
  country: ClientPhoneCountry;
  onValueChange: (value: string) => void;
  onCountryChange: (country: ClientPhoneCountry) => void;
  onBlur?: () => void;
  placeholder: string;
  invalid?: boolean;
  autoComplete?: string;
  locale?: string;
};

type CountryEntry = {
  label: string;
  value: RPNInput.Country;
};

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
  invalid?: boolean;
  searchPlaceholder: string;
  emptyText: string;
};

const PRIORITY_COUNTRIES: ClientPhoneCountry[] = ["TR", "UZ", "AZ", "DE", "RU", "US"];

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = country ? flags[country] : null;

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-black/10 [&_svg:not([class*='size-'])]:size-full">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  );
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
  invalid = false,
  searchPlaceholder,
  emptyText,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = countryList.find((option) => option.value === selectedCountry);

  return (
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
            "h-14 rounded-e-none rounded-s-[0.85rem] border-2 border-r-0 bg-white px-3 text-slate-900 shadow-none hover:bg-white focus-visible:ring-0 focus-visible:ring-offset-0",
            invalid ? "border-red-500" : "border-black",
          )}
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedOption?.label || selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "ml-1 size-4 text-slate-500",
              disabled && "hidden",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] rounded-2xl border border-slate-200 bg-white p-0 shadow-xl">
        <Command className="rounded-2xl bg-white">
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              window.setTimeout(() => {
                const viewportElement = scrollAreaRef.current?.querySelector(
                  "[data-radix-scroll-area-viewport]",
                );

                if (viewportElement instanceof HTMLElement) {
                  viewportElement.scrollTop = 0;
                }
              }, 0);
            }}
            placeholder={searchPlaceholder}
            className="h-12"
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) => (
                  <CommandItem
                    key={value}
                    className="gap-2 rounded-xl px-3 py-2.5"
                    onSelect={() => {
                      onChange(value);
                      setIsOpen(false);
                    }}
                  >
                    <FlagComponent country={value} countryName={label} />
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <span className="text-sm text-slate-500">{getClientCountryCallingCode(value as ClientPhoneCountry)}</span>
                    <CheckIcon
                      className={cn(
                        "ml-auto size-4",
                        value === selectedCountry ? "opacity-100" : "opacity-0",
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
  );
};

export function ClientPhoneField({
  value,
  country,
  onValueChange,
  onCountryChange,
  onBlur,
  placeholder,
  invalid = false,
  autoComplete = "tel",
  locale = "en",
}: ClientPhoneFieldProps) {
  const displayNames = React.useMemo(
    () =>
      new Intl.DisplayNames([locale === "uz" ? "uz" : "tr"], {
        type: "region",
      }),
    [locale],
  );

  const text = React.useMemo(
    () => ({
      searchPlaceholder: locale === "uz" ? "Davlat qidiring..." : "Ülke ara...",
      emptyText: locale === "uz" ? "Davlat topilmadi." : "Ülke bulunamadı.",
    }),
    [locale],
  );

  const countryOptions = React.useMemo(() => {
    const orderedCountries = [
      ...PRIORITY_COUNTRIES,
      ...clientPhoneCountries.filter((countryCode) => !PRIORITY_COUNTRIES.includes(countryCode)),
    ];

    return orderedCountries.map((countryCode) => ({
      value: countryCode,
      label: displayNames.of(countryCode) || countryCode,
    }));
  }, [displayNames]);

  const InputComponent = React.useMemo(() => {
    const Component = React.forwardRef<
      HTMLInputElement,
      React.ComponentProps<"input">
    >(({ className, ...props }, ref) => (
      <Input
        ref={ref}
        className={cn(
          "h-14 rounded-s-none rounded-e-[0.85rem] border-2 border-l-0 bg-white px-4 text-[15px] font-medium text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0",
          invalid ? "border-red-500" : "border-black",
          className,
        )}
        {...props}
      />
    ));

    Component.displayName = "ClientPhoneFieldInput";
    return Component;
  }, [invalid]);

  return (
    <RPNInput.default
      className="flex w-full"
      country={country}
      international
      withCountryCallingCode
      countryCallingCodeEditable={false}
      flagComponent={FlagComponent}
      countrySelectComponent={(props) => (
        <CountrySelect
          {...props}
          options={countryOptions}
          invalid={invalid}
          searchPlaceholder={text.searchPlaceholder}
          emptyText={text.emptyText}
        />
      )}
      inputComponent={InputComponent}
      smartCaret={false}
      autoComplete={autoComplete}
      value={value || undefined}
      onBlur={onBlur}
      placeholder={placeholder}
      onCountryChange={(nextCountry) => {
        if (nextCountry) {
          onCountryChange(nextCountry as ClientPhoneCountry);
        }
      }}
      onChange={(nextValue) => onValueChange((nextValue || "") as string)}
    />
  );
}
