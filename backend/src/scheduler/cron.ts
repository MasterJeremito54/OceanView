import cron, { type ScheduledTask } from "node-cron";
import { runIngestion } from "../ingestion/ingest";
import { logger } from "../lib/logger";

// Cada 15 min por defecto (alineado con la frecuencia real de NDBC, que
// reporta cada 10-60 min según la boya). Configurable vía env var para
// pruebas rápidas sin tener que esperar 15 minutos entre ciclos.
const CRON_EXPRESSION = process.env.INGESTION_CRON ?? "*/15 * * * *";

let task: ScheduledTask | null = null;

/**
 * Inicia el scheduler de ingesta. Cada ciclo trae solo la lectura más
 * reciente por boya (rowsPerStation: 1) — el backfill grande es cosa de
 * la ejecución manual (npm run ingest), no del cron continuo.
 */
export function startScheduler(): ScheduledTask {
  if (task) {
    logger.warn("El scheduler ya estaba corriendo, no se inicia dos veces");
    return task;
  }

  logger.info(
    { cronExpression: CRON_EXPRESSION },
    "Scheduler de ingesta iniciado"
  );

  task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await runIngestion({ rowsPerStation: 1 });
    } catch (err) {
      // runIngestion ya captura errores por boya individualmente; esto
      // solo cubre un fallo catastrófico e inesperado del ciclo completo
      // (ej. la base de datos se cayó por completo).
      logger.error(err, "Error inesperado en el ciclo de ingesta programado");
    }
  });

  return task;
}

export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    logger.info("Scheduler de ingesta detenido");
  }
}
