import pino from "pino";

// En desarrollo usa pino-pretty (logs legibles en consola).
// En producción escribe JSON estructurado (más fácil de indexar/buscar).
export const logger = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
