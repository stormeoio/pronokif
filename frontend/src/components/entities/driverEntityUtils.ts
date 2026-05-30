import type { Driver } from "@/types/api";

export type DriverLookup = Map<string, Driver>;

function normalizeLookupKey(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function addDriverLookupKey(
  lookup: DriverLookup,
  key: string | number | null | undefined,
  driver: Driver,
) {
  const normalized = normalizeLookupKey(key);
  if (normalized) lookup.set(normalized, driver);
}

export function buildDriverLookup(drivers: Driver[]) {
  const lookup: DriverLookup = new Map();
  drivers.forEach((driver) => {
    addDriverLookupKey(lookup, driver.id, driver);
    addDriverLookupKey(lookup, driver.code, driver);
    addDriverLookupKey(lookup, driver.name, driver);
    addDriverLookupKey(lookup, `${driver.code} - ${driver.name}`, driver);
  });
  return lookup;
}

export function driverCodeFromReference(value: string | number) {
  const [code] = String(value).split(" - ");
  return code?.trim() || String(value).trim();
}

export function resolveDriverReference(
  value: string | number | null | undefined,
  lookup: DriverLookup,
) {
  if (!value) return null;
  const byFullReference = lookup.get(normalizeLookupKey(value));
  if (byFullReference) return byFullReference;
  const byCode = lookup.get(normalizeLookupKey(driverCodeFromReference(value)));
  return byCode ?? null;
}
