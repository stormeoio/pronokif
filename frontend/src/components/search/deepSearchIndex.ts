import type { UserIdentityRecord } from "@/components/users/UserIdentity";

export type DeepSearchItem = {
  id: string;
  title: string;
  href: string;
  group: string;
  type: string;
  subtitle?: string;
  badge?: string;
  userIdentity?: UserIdentityRecord;
  keywords?: Array<string | number | null | undefined>;
  priority?: number;
};

export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchableText(item: DeepSearchItem) {
  return normalizeSearchText(
    [item.title, item.subtitle, item.badge, item.group, item.type, ...(item.keywords || [])].join(
      " ",
    ),
  );
}

export function scoreDeepSearchItem(item: DeepSearchItem, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return item.priority ?? 0;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = searchableText(item);
  if (!terms.every((term) => haystack.includes(term))) return -1;

  const title = normalizeSearchText(item.title);
  const badge = normalizeSearchText(item.badge);
  let score = item.priority ?? 0;

  for (const term of terms) {
    if (title === term || badge === term) score += 90;
    else if (title.startsWith(term) || badge.startsWith(term)) score += 60;
    else if (title.includes(term) || badge.includes(term)) score += 36;
    else score += 12;
  }

  return score;
}

export function filterDeepSearchItems(items: DeepSearchItem[], query: string, limit = 24) {
  return items
    .map((item) => ({ item, score: scoreDeepSearchItem(item, query) }))
    .filter(({ score }) => score >= 0)
    .sort(
      (left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}

export function groupDeepSearchItems(items: DeepSearchItem[]) {
  return items.reduce<Record<string, DeepSearchItem[]>>((groups, item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item);
    return groups;
  }, {});
}

export function isEditableSearchTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.closest("[contenteditable='true']") !== null
  );
}
