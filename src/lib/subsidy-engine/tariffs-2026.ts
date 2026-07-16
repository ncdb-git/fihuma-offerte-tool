import type { MeasureType } from "@/lib/types";

export type IsdeTariffRule = {
  singleRate: number;
  doubleRate: number;
  minM2: number;
  maxM2: number;
};

export const ISDE_TARIFFS_2026: Record<MeasureType, IsdeTariffRule> = {
  spouwmuur: { singleRate: 5.25, doubleRate: 10.5, minM2: 10, maxM2: 170 },
  vloer: { singleRate: 5.5, doubleRate: 11, minM2: 20, maxM2: 130 },
  bodem: { singleRate: 3, doubleRate: 6, minM2: 20, maxM2: 130 },
  dak: { singleRate: 16.25, doubleRate: 32.5, minM2: 20, maxM2: 200 }
};
