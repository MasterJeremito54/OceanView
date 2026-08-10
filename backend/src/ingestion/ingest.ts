import { prisma } from "../db/client";
import { logger } from "../lib/logger";
import { fetchStationText, FetchError } from "./fetcher";
import { parseStationText } from "./parser";
import { validateReading } from "./validator";
import stations from "../config/stations.json";

interface IngestOptions {
  /** Cuántas filas recientes guardar por boya en este ciclo. */
  rowsPerStation?: number;
}

interface StationResult {
  stationId: string;
  success: boolean;
  rowsUpserted: number;
  error?: string;
}

// Después de N ciclos fallidos consecutivos, la boya se marca `active: false`.
// No se toca `lastSeenAt` ni las lecturas ya guardadas — así el frontend
// siempre puede mostrar "última lectura válida hace X" en vez de vaciar
// la pantalla cuando NOAA tiene un problema temporal.
const INACTIVE_AFTER_FAILURES = 3;

/**
 * Ingesta una sola boya: fetch → parse → validate → upsert.
 * Nunca lanza — los errores se capturan y se devuelven en el resultado,
 * para que una boya caída no tumbe el ciclo completo de las demás.
 */
export async function ingestStation(
  stationId: string,
  rowsPerStation: number
): Promise<StationResult> {
  try {
    const text = await fetchStationText(stationId);
    const readings = parseStationText(stationId, text).slice(
      0,
      rowsPerStation
    );

    let rowsUpserted = 0;
    for (const reading of readings) {
      const { flag } = validateReading(reading);

      await prisma.reading.upsert({
        where: {
          stationId_timestamp: {
            stationId: reading.stationId,
            timestamp: reading.timestamp,
          },
        },
        update: { ...reading, qualityFlag: flag },
        create: { ...reading, qualityFlag: flag },
      });
      rowsUpserted++;
    }

    // Éxito: resetea el contador de fallos y marca la boya como activa,
    // sin importar en qué estado estaba antes.
    await prisma.station.update({
      where: { id: stationId },
      data: { active: true, lastSeenAt: new Date(), consecutiveFailures: 0 },
    });

    return { stationId, success: true, rowsUpserted };
  } catch (err) {
    const message = err instanceof FetchError ? err.message : String(err);
    logger.error({ stationId, error: message }, "Falló la ingesta de la boya");

    // Fallo: incrementa el contador. Solo se marca inactiva si el fallo
    // persiste por varios ciclos seguidos — un solo timeout de NOAA no
    // debe apagar la boya en el frontend. `lastSeenAt` NO se toca aquí:
    // debe seguir apuntando a la última lectura real que sí se guardó.
    try {
      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { consecutiveFailures: true },
      });
      const newFailureCount = (station?.consecutiveFailures ?? 0) + 1;

      await prisma.station.update({
        where: { id: stationId },
        data: {
          consecutiveFailures: newFailureCount,
          active: newFailureCount < INACTIVE_AFTER_FAILURES,
        },
      });
    } catch (dbErr) {
      // Si ni siquiera se puede actualizar el contador de fallos (ej. la
      // boya no existe en la tabla porque falta el seed), no rompas el
      // ciclo por eso — ya se registró el error de fetch arriba.
      logger.error(
        { stationId, error: String(dbErr) },
        "No se pudo actualizar el contador de fallos de la boya"
      );
    }

    return { stationId, success: false, rowsUpserted: 0, error: message };
  }
}

/**
 * Ingesta todas las boyas de config/stations.json en paralelo.
 * rowsPerStation por defecto es 1 (uso normal en producción, cada ciclo
 * de cron trae solo la lectura más nueva). Para el backfill inicial de la
 * Fase 2, se llama manualmente con un número mayor (ver bloque main() abajo).
 */
export async function runIngestion(options: IngestOptions = {}): Promise<void> {
  const rowsPerStation = options.rowsPerStation ?? 1;
  const startedAt = Date.now();

  logger.info(
    { stationCount: stations.length, rowsPerStation },
    "Iniciando ciclo de ingesta"
  );

  const results = await Promise.all(
    stations.map((s) => ingestStation(s.id, rowsPerStation))
  );

  const successCount = results.filter((r) => r.success).length;
  const failedStations = results
    .filter((r) => !r.success)
    .map((r) => r.stationId);
  const totalRowsUpserted = results.reduce((sum, r) => sum + r.rowsUpserted, 0);

  logger.info(
    {
      successCount,
      failedCount: results.length - successCount,
      failedStations,
      totalRowsUpserted,
      durationMs: Date.now() - startedAt,
    },
    "Ciclo de ingesta terminado"
  );
}

// Permite ejecutar directamente: npx ts-node src/ingestion/ingest.ts [rowsPerStation]
// Sin argumento, hace un backfill de 20 filas (~3h de historial) para que
// la base de datos no arranque vacía.
if (require.main === module) {
  const rowsArg = process.argv[2];
  const rowsPerStation = rowsArg ? parseInt(rowsArg, 10) : 20;

  runIngestion({ rowsPerStation })
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      logger.error(err, "Error fatal en la ingesta");
      await prisma.$disconnect();
      process.exit(1);
    });
}
