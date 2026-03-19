import { useMemo } from "react";
import PhoneInput from "react-phone-number-input/input";
import { cn } from "@/lib/utils";
import {
  clientPhoneCountries,
  getClientCountryCallingCode,
  type ClientPhoneCountry,
} from "@/lib/client-entry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const PRIORITY_COUNTRIES: ClientPhoneCountry[] = ["TR", "UZ", "AZ", "DE", "RU", "US"];

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
  const displayNames = useMemo(
    () =>
      new Intl.DisplayNames([locale === "tr" ? "tr" : "en"], {
        type: "region",
      }),
    [locale],
  );

  const countryOptions = useMemo(() => {
    const formatLabel = (countryCode: ClientPhoneCountry) =>
      `${displayNames.of(countryCode) || countryCode} (${getClientCountryCallingCode(countryCode)})`;

    const preferred = PRIORITY_COUNTRIES.map((countryCode) => ({
      code: countryCode,
      label: formatLabel(countryCode),
    }));

    const rest = clientPhoneCountries
      .filter((countryCode) => !PRIORITY_COUNTRIES.includes(countryCode))
      .map((countryCode) => ({
        code: countryCode,
        label: formatLabel(countryCode),
      }));

    return [...preferred, ...rest];
  }, [displayNames]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <Select value={country} onValueChange={(next) => onCountryChange(next as ClientPhoneCountry)}>
        <SelectTrigger className="h-14 rounded-[0.85rem] border-2 border-black bg-white text-left text-sm font-semibold text-slate-900 focus:ring-0">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {countryOptions.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        className={cn(
          "flex h-14 items-center rounded-[0.85rem] border-2 bg-white px-4 transition-colors",
          invalid ? "border-red-500" : "border-black",
        )}
      >
        <span className="mr-3 shrink-0 text-sm font-semibold text-slate-500">
          {getClientCountryCallingCode(country)}
        </span>
        <PhoneInput
          country={country}
          international={false}
          autoComplete={autoComplete}
          value={value || undefined}
          onChange={(nextValue) => onValueChange(nextValue || "")}
          onBlur={onBlur}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}
