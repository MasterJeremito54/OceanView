import { PrismaClient } from "@prisma/client";

// Instancia única reutilizada en toda la app (evita agotar conexiones
// en desarrollo, donde ts-node puede recrear el módulo varias veces).
export const prisma = new PrismaClient();
