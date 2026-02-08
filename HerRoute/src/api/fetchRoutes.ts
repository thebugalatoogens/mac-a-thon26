import type { RoutesResponse, Coord } from "../types/route";

export async function fetchRoutes(
  origin: Coord,
  destination: Coord
): Promise<RoutesResponse> {
  const res = await fetch("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}
