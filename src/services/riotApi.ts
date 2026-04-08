import type { RegionCode, SearchResponse } from "../types/riot";

export async function fetchRiotProfile(input: {
  region: RegionCode;
  riotId: string;
}): Promise<SearchResponse> {
  const url = `/api/riot/search?region=${encodeURIComponent(
    input.region
  )}&riotId=${encodeURIComponent(input.riotId)}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(rawText || "No se pudo obtener la información.");
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      "La respuesta no fue JSON. Verifica que el backend esté corriendo correctamente."
    );
  }

  return JSON.parse(rawText) as SearchResponse;
}