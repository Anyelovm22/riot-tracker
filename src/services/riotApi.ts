import type { RegionCode, SearchResponse } from "../types/riot";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function fetchRiotProfile(input: {
  region: RegionCode;
  riotId: string;
}): Promise<SearchResponse> {
  const url = `${API_BASE_URL}/api/riot/search?region=${encodeURIComponent(
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