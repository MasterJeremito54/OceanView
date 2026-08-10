const NDBC_BASE_URL = "https://www.ndbc.noaa.gov/data/realtime2";

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly stationId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/**
 * Descarga el archivo stdmet (.txt) de una boya desde NDBC.
 * Reintenta con backoff simple ante fallos de red (no ante 404, que
 * probablemente significa que la boya no existe o no reporta stdmet).
 */
export async function fetchStationText(
  stationId: string,
  retries = 3
): Promise<string> {
  const url = `${NDBC_BASE_URL}/${stationId}.txt`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 404) {
        // No vale la pena reintentar: la boya no existe o no tiene stdmet.
        throw new FetchError(
          `Boya ${stationId} no encontrada en NDBC (404) — revisa que el ID sea correcto y que reporte datos stdmet`,
          stationId
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (err) {
      if (err instanceof FetchError) throw err; // no reintentar 404
      lastError = err;

      if (attempt < retries) {
        const backoffMs = attempt * 5000; // 5s, 10s, 15s...
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new FetchError(
    `No se pudo descargar datos de la boya ${stationId} tras ${retries} intentos`,
    stationId,
    lastError
  );
}
