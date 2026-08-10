"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState en vez de una instancia module-level: evita compartir el
  // QueryClient entre requests distintos en el servidor (no aplica en
  // este proyecto porque todo es client-side, pero es la práctica correcta
  // recomendada por TanStack Query para App Router).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
