import { Router } from "express";
import { prisma } from "../db/client";
import { parseRangeToHours } from "../lib/dateRange";

export const stationsRouter = Router();

// GET /stations — lista todas las boyas con su lectura más reciente incluida,
// para que el frontend pueda pintar la vista principal con una sola llamada.
stationsRouter.get("/", async (_req, res) => {
  const stations = await prisma.station.findMany({
    include: {
      readings: { take: 1, orderBy: { timestamp: "desc" } },
    },
    orderBy: { id: "asc" },
  });

  res.json(
    stations.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      active: s.active,
      lastSeenAt: s.lastSeenAt,
      latestReading: s.readings[0] ?? null,
    }))
  );
});

// GET /stations/:id — detalle de una boya + su lectura más reciente.
stationsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  const station = await prisma.station.findUnique({
    where: { id },
    include: {
      readings: { take: 1, orderBy: { timestamp: "desc" } },
    },
  });

  if (!station) {
    res.status(404).json({ error: `Boya ${id} no encontrada` });
    return;
  }

  res.json({
    id: station.id,
    name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    active: station.active,
    lastSeenAt: station.lastSeenAt,
    consecutiveFailures: station.consecutiveFailures,
    latestReading: station.readings[0] ?? null,
  });
});

// GET /stations/:id/readings?range=24h — histórico para el gráfico.
// range es opcional, por defecto "24h". Formato: "<número>h", máximo 720h (30 días).
stationsRouter.get("/:id/readings", async (req, res) => {
  const { id } = req.params;
  const rangeParam =
    typeof req.query.range === "string" ? req.query.range : "24h";
  const hours = parseRangeToHours(rangeParam);

  if (hours === null) {
    res.status(400).json({
      error: `Rango inválido: "${rangeParam}". Usa un formato como "24h" o "48h" (máximo 720h / 30 días).`,
    });
    return;
  }

  const station = await prisma.station.findUnique({ where: { id } });
  if (!station) {
    res.status(404).json({ error: `Boya ${id} no encontrada` });
    return;
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const readings = await prisma.reading.findMany({
    where: { stationId: id, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });

  res.json({
    stationId: id,
    range: rangeParam,
    since: since.toISOString(),
    count: readings.length,
    readings,
  });
});
