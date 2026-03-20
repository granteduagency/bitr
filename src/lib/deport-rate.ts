import { invokePublicFunction } from "@/lib/public-functions";

export type DeportExchangeRate = {
  usdTryRate: number;
  sourceDate: string;
  fetchedAt: string;
  source: string;
};

export const getDeportExchangeRate = () =>
  invokePublicFunction<DeportExchangeRate>("deport-rate", {
    action: "usd",
  });
