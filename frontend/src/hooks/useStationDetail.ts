"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStation } from "@/lib/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useStationDetail(id: string) {
  return useQuery({
    queryKey: ["station", id],
    queryFn: () => fetchStation(id),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
