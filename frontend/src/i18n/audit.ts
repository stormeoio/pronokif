export type LocaleAuditSummary = {
  locale: string;
  complete: number;
  total: number;
  rate: number;
  missingKeys: string[];
};

type FlatMap = Record<string, string>;

function flattenResource(value: unknown, prefix = "", output: FlatMap = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenResource(item, `${prefix}.${index}`, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      flattenResource(child, prefix ? `${prefix}.${key}` : key, output);
    });
    return output;
  }
  if (prefix) output[prefix] = value == null ? "" : String(value);
  return output;
}

export function auditLocaleResources(resources: Record<string, unknown>) {
  const flattened = Object.fromEntries(
    Object.entries(resources).map(([locale, resource]) => [locale, flattenResource(resource)]),
  ) as Record<string, FlatMap>;
  const allKeys = Array.from(
    new Set(Object.values(flattened).flatMap((resource) => Object.keys(resource))),
  ).sort();

  const summaries = Object.fromEntries(
    Object.entries(flattened).map(([locale, resource]) => {
      const missingKeys = allKeys.filter((key) => !String(resource[key] ?? "").trim());
      const complete = allKeys.length - missingKeys.length;
      const total = allKeys.length;
      return [
        locale,
        {
          locale,
          complete,
          total,
          rate: total ? Math.round((complete / total) * 1000) / 10 : 0,
          missingKeys,
        } satisfies LocaleAuditSummary,
      ];
    }),
  ) as Record<string, LocaleAuditSummary>;

  return { keys: allKeys, flattened, summaries };
}
