export const OPEN_DEEP_SEARCH_EVENT = "pronokif:open-deep-search";

export function openDeepSearch() {
  window.dispatchEvent(new Event(OPEN_DEEP_SEARCH_EVENT));
}
