export type Vehicle = "bike" | "car";

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface DeliveryOption {
  vehicle: Vehicle;
  fee: number; // DA
  etaMin: number;
  distanceKm: number;
  badges: string[]; // 'cheapest' | 'quickest' | 'nearest'
}

// City speeds (km/h), base fares (DA) and distance factor (motorbikes
// can take tighter city routes, so effective distance is shorter).
const SPECS = {
  bike: { base: 100, perKm: 40, speed: 25, distFactor: 0.9 },
  car: { base: 150, perKm: 60, speed: 35, distFactor: 1.0 },
} as const;

export function deliveryOptions(distanceKm: number): DeliveryOption[] {
  const opts: DeliveryOption[] = (["bike", "car"] as Vehicle[]).map((v) => {
    const s = SPECS[v];
    const eff = distanceKm * s.distFactor;
    const fee = Math.round(s.base + s.perKm * eff);
    const etaMin = Math.max(8, Math.round((eff / s.speed) * 60) + 5);
    return {
      vehicle: v,
      fee,
      etaMin,
      distanceKm: Math.round(eff * 10) / 10,
      badges: [],
    };
  });
  const min = <T>(arr: T[], f: (x: T) => number) =>
    arr.reduce((a, b) => (f(a) <= f(b) ? a : b));
  min(opts, (o) => o.fee).badges.push("cheapest");
  min(opts, (o) => o.etaMin).badges.push("quickest");
  min(opts, (o) => o.distanceKm).badges.push("nearest");
  return opts;
}
