"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStations } from "@/lib/api";

// Alineado con la frecuencia real de NDBC (10-60 min según la boya) y con
// el ciclo del scheduler del backend (cada 15 min) — no tiene sentido
// pedir más seguido, solo le pegaría al backend sin traer datos más nuevos.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: fetchStations,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}
