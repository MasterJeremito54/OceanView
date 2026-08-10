import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { stationsRouter } from "./routes/stations";
import { startScheduler } from "./scheduler/cron";
import { logger } from "./lib/logger";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS: en desarrollo se permite cualquier origen. En producción (Fase 8)
// hay que restringirlo con FRONTEND_URL a la URL real del frontend en Vercel.
app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));

// Rate limit básico: no es por escala, es porque una API pública sin
// ningún límite es una mala práctica barata de evitar.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
    },
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/stations", stationsRouter);

app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `API escuchando en http://localhost:${PORT}`);
  // El scheduler arranca junto con la API: un solo proceso deployado hace
  // las dos cosas, tal como se definió en la arquitectura MVP (monolito).
  startScheduler();
});
