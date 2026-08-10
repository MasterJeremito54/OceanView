// Runner standalone para la Fase 3: mantiene el scheduler corriendo sin
// necesitar todavía el servidor Express (eso llega en la Fase 4, donde
// server.ts importará startScheduler() en vez de este archivo).
//
// Uso: npm run start:scheduler
// Detener: Ctrl+C

import { startScheduler } from "./cron";
import { logger } from "../lib/logger";

startScheduler();

logger.info(
  "Proceso de scheduler corriendo en primer plano. Presiona Ctrl+C para detener."
);

// node-cron no mantiene vivo el proceso por sí solo en todos los entornos;
// esto evita que Node termine el proceso apenas se agenda la tarea.
process.stdin.resume();

process.on("SIGINT", () => {
  logger.info("Deteniendo scheduler...");
  process.exit(0);
});
