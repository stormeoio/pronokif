export const REVIEW_URL_UNREVIEWED = "unreviewed";
export const CIRCUIT_Q_PARAM = "circuitQ";
export const CIRCUIT_REVIEW_PARAM = "circuitReview";
export const CIRCUIT_PRIORITY_PARAM = "circuitPriority";
export const CIRCUIT_OWNER_PARAM = "circuitOwner";
export const CIRCUIT_SOURCE_PARAM = "circuitSource";
export const CIRCUIT_MAP_PARAM = "circuitMap";

const REVIEW_FILTER_VALUES = new Set(["all", "", "draft", "in_review", "needs_source", "approved"]);
const PRIORITY_FILTER_VALUES = new Set(["all", "blocked", "review", "done"]);
const OWNER_FILTER_VALUES = new Set(["all", "mine", "unassigned", "assigned"]);
const SOURCE_FILTER_VALUES = new Set(["all", "seed", "admin"]);

type CircuitMapUrlState = {
  query: string;
  reviewStatus: string;
  priority: string;
  owner: string;
  source: string;
  selectedKey: string | null;
};

export function decodeReviewFilter(value: string | null) {
  if (value === REVIEW_URL_UNREVIEWED) return "";
  return value !== null && REVIEW_FILTER_VALUES.has(value) ? value : "all";
}

export function encodeReviewFilter(value: string) {
  return value === "" ? REVIEW_URL_UNREVIEWED : value;
}

export function decodePriorityFilter(value: string | null) {
  return value !== null && PRIORITY_FILTER_VALUES.has(value) ? value : "all";
}

export function decodeOwnerFilter(value: string | null) {
  return value !== null && OWNER_FILTER_VALUES.has(value) ? value : "all";
}

export function decodeSourceFilter(value: string | null) {
  return value !== null && SOURCE_FILTER_VALUES.has(value) ? value : "all";
}

export function buildCircuitMapSearchParams(
  current: URLSearchParams,
  { query, reviewStatus, priority, owner, source, selectedKey }: CircuitMapUrlState,
) {
  const next = new URLSearchParams(current);
  next.set("tab", "circuitMaps");

  if (query.trim()) next.set(CIRCUIT_Q_PARAM, query.trim());
  else next.delete(CIRCUIT_Q_PARAM);

  if (reviewStatus !== "all") {
    next.set(CIRCUIT_REVIEW_PARAM, encodeReviewFilter(reviewStatus));
  } else {
    next.delete(CIRCUIT_REVIEW_PARAM);
  }

  if (priority !== "all") next.set(CIRCUIT_PRIORITY_PARAM, priority);
  else next.delete(CIRCUIT_PRIORITY_PARAM);

  if (owner !== "all") next.set(CIRCUIT_OWNER_PARAM, owner);
  else next.delete(CIRCUIT_OWNER_PARAM);

  if (source !== "all") next.set(CIRCUIT_SOURCE_PARAM, source);
  else next.delete(CIRCUIT_SOURCE_PARAM);

  if (selectedKey) next.set(CIRCUIT_MAP_PARAM, selectedKey);
  else next.delete(CIRCUIT_MAP_PARAM);

  return next;
}
