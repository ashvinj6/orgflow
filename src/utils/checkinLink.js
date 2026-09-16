export function buildCheckinLink(code, location = window.location) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("checkin", code);
  return url.toString();
}
