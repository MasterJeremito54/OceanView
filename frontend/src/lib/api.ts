import type { Station, StationDetail, ReadingsResponse } from "@/types/station";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error ?? `Error ${res.status} al consultar la API`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export function fetchStations(): Promise<Station[]> {
  return apiFetch<Station[]>("/stations");
}

export function fetchStation(id: string): Promise<StationDetail> {
  return apiFetch<StationDetail>(`/stations/${id}`);
}

export function fetchStationReadings(
  id: string,
  range = "24h"
): Promise<ReadingsResponse> {
  return apiFetch<ReadingsResponse>(
    `/stations/${id}/readings?range=${encodeURIComponent(range)}`
  );
}
