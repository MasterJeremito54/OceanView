// Siembra la tabla `stations` a partir de src/config/stations.json.
// Uso: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import stations from "../src/config/stations.json";

const prisma = new PrismaClient();

async function main() {
  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        latitude: station.lat,
        longitude: station.lon,
      },
      create: {
        id: station.id,
        name: station.name,
        latitude: station.lat,
        longitude: station.lon,
      },
    });
  }
  console.log(`Sembradas ${stations.length} boyas en la tabla stations.`);
}

main()
  .catch((err) => {
    console.error("Error sembrando boyas:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
