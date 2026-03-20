export interface DeportResult {
  violationDays: number;
  penaltyAmount: number;
  deportDuration: "" | "ban1Month" | "ban3Months" | "ban1Year" | "ban5Years";
  hasViolation: boolean;
}

export function calculateDeport(entryDate: Date, checkDate: Date): DeportResult {
  // Turkey allows 90 days stay in 180-day period for visa-free visitors
  const diffMs = checkDate.getTime() - entryDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const allowedDays = 90;
  const overstayDays = Math.max(0, totalDays - allowedDays);

  if (overstayDays === 0) {
    return {
      violationDays: 0,
      penaltyAmount: 0,
      deportDuration: '',
      hasViolation: false,
    };
  }

  let penaltyAmount = 0;
  let deportDuration: DeportResult["deportDuration"] = "";

  if (overstayDays <= 10) {
    penaltyAmount = 3000;
    deportDuration = "";
  } else if (overstayDays <= 30) {
    penaltyAmount = 5000;
    deportDuration = "ban1Month";
  } else if (overstayDays <= 90) {
    penaltyAmount = 8000;
    deportDuration = "ban3Months";
  } else if (overstayDays <= 180) {
    penaltyAmount = 15000;
    deportDuration = "ban1Year";
  } else {
    penaltyAmount = 20000;
    deportDuration = "ban5Years";
  }

  return {
    violationDays: overstayDays,
    penaltyAmount,
    deportDuration,
    hasViolation: true,
  };
}
