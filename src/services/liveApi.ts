import type { LiveSnapshot } from "../types/riot";

export async function fetchLiveSnapshot(
  key = "local-player"
): Promise<LiveSnapshot | null> {
  try {
    const response = await fetch(`/api/live/${encodeURIComponent(key)}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }

    return (await response.json()) as LiveSnapshot;
  } catch (error) {
    console.error("[live] Error fetching live snapshot:", error);
    return null;
  }
}