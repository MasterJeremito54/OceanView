-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "windDirDeg" DOUBLE PRECISION,
    "windSpeedMs" DOUBLE PRECISION,
    "gustMs" DOUBLE PRECISION,
    "waveHeightM" DOUBLE PRECISION,
    "dominantWavePeriodS" DOUBLE PRECISION,
    "avgWavePeriodS" DOUBLE PRECISION,
    "waveDirDeg" DOUBLE PRECISION,
    "pressureHpa" DOUBLE PRECISION,
    "airTempC" DOUBLE PRECISION,
    "waterTempC" DOUBLE PRECISION,
    "dewPointC" DOUBLE PRECISION,
    "visibilityNmi" DOUBLE PRECISION,
    "pressureTendencyHpa" DOUBLE PRECISION,
    "tideFt" DOUBLE PRECISION,
    "qualityFlag" TEXT NOT NULL DEFAULT 'valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "readings_stationId_timestamp_idx" ON "readings"("stationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "readings_stationId_timestamp_key" ON "readings"("stationId", "timestamp");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
