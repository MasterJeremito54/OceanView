"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStationReadings } from "@/lib/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useStationReadings(id: string, range: string) {
  return useQuery({
    queryKey: ["stationReadings", id, range],
    queryFn: () => fetchStationReadings(id, range),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
