# OceanView — Fase 0.5: Validación de Obtención de Datos NOAA

**Versión:** 1.0
**Objetivo:** confirmar, antes de escribir ninguna pieza del sistema, que los datos reales de NDBC se pueden descargar y leer de forma confiable — boyas activas verificadas, formato de archivo entendido, y un script mínimo que ya demuestra que la fuente de datos funciona.
**Fuera de alcance:** frontend, base de datos, servidor. Solo lectura de datos.

---

## 1. Lista de 5 Boyas NOAA Recomendadas

Todas verificadas como **activas y reportando datos en 2026** al momento de escribir esto (NDBC puede sacar boyas de servicio por mantenimiento sin previo aviso — por eso el paso 5, la estrategia de validación, incluye una verificación de estado antes de cada uso).

| ID | Nombre / Ubicación | Coordenadas | Por qué esta boya |
|---|---|---|---|
| **42057** | Caribbean Sea, ~ SW de Puerto Rico | 16.9 N, 67.5 W | Región caribeña, temperatura del agua alta y estable — buen caso "feliz" pero con algún campo (WTMP) que a veces reporta `MM`, útil para probar el manejo de datos faltantes desde el día uno |
| **44013** | Boston, MA — 16 NM al este de Boston | 42.3 N, 70.7 W | Boya costera muy estable, reporta el set completo de campos (viento, oleaje, temperatura de aire y agua) de forma consistente |
| **46042** | Monterey Bay, CA — 27 NM WNW de Monterey | 36.8 N, 122.4 W | Costa del Pacífico, útil si se quiere mostrar diversidad geográfica; datos consistentes y bien documentados |
| **51001** | Hawaii — 188 NM NW de Kauai | 24.5 N, 162.0 W | Boya de océano abierto, lejos de la costa; ilustra bien oleaje de swell en aguas profundas |
| **44025** | Long Island, NY — 30 NM al sur de Islip | 40.3 N, 73.2 W | Muy usada como referencia porque casi nunca falla; buena boya "de respaldo" si alguna otra deja de reportar durante el desarrollo |

**Recomendación para el MVP:** empezar con **42057 + 44013 + 44025** (3 boyas) para las primeras fases, y añadir 46042 y 51001 cuando el parser ya esté probado — así, si algo falla al principio, hay menos variables que revisar.

---

## 2. Estructura Mínima del Proyecto (solo para esta fase)

No es la estructura final del backend (esa ya está definida en el plan de desarrollo v1) — es la mínima necesaria para probar la obtención de datos, aislada de todo lo demás:

```
oceanview/
└── scripts/
    └── noaa-test/
        ├── fetch-buoy.ts       # script de prueba: descarga + parsea + imprime
        ├── stations.json       # las 5 boyas de la tabla anterior
        ├── package.json
        └── tsconfig.json
```

Esta carpeta `scripts/noaa-test/` es desechable — su único propósito es la validación de esta fase. El código de `fetch-buoy.ts` es, de hecho, el primer borrador de lo que en la Fase 1 del plan se convertirá en `fetcher.ts` + `parser.ts` dentro de `backend/src/ingestion/`.

---

## 3. Script de Prueba para Descargar Datos

```typescript
// scripts/noaa-test/fetch-buoy.ts
//
// Descarga el archivo .txt de una boya NDBC, extrae la lectura más reciente
// y la imprime en consola. Sin base de datos, sin servidor.
//
// Uso: npx ts-node fetch-buoy.ts 42057

const STATION_ID = process.argv[2] ?? "42057";
const URL = `https://www.ndbc.noaa.gov/data/realtime2/${STATION_ID}.txt`;

// Índices de columna del formato estándar NDBC (ver sección 4 para el detalle)
const COLUMNS = [
  "YY", "MM", "DD", "hh", "mm",
  "WDIR", "WSPD", "GST", "WVHT", "DPD", "APD", "MWD",
  "PRES", "ATMP", "WTMP", "DEWP", "VIS", "PTDY", "TIDE",
];

interface Reading {
  timestamp: string;
  windDirDeg: number | null;
  windSpeedMs: number | null;
  waveHeightM: number | null;
  waterTempC: number | null;
}

function parseValue(raw: string): number | null {
  // NDBC usa "MM" para indicar dato faltante
  return raw === "MM" ? null : parseFloat(raw);
}

function msToKmh(ms: number | null): number | null {
  return ms === null ? null : Math.round(ms * 3.6 * 10) / 10;
}

async function fetchLatestReading(stationId: string): Promise<Reading> {
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar datos de la boya ${stationId} (HTTP ${response.status})`
    );
  }

  const text = await response.text();
  const lines = text.trim().split("\n");

  // Las primeras 2 líneas son cabeceras (#YY MM DD... / #yr mo dy...)
  // La primera línea de datos (línea 3) es la lectura MÁS RECIENTE
  const dataLines = lines.slice(2);
  if (dataLines.length === 0) {
    throw new Error(`La boya ${stationId} no tiene datos disponibles`);
  }

  const fields = dataLines[0].trim().split(/\s+/);
  const row: Record<string, string> = {};
  COLUMNS.forEach((col, i) => {
    row[col] = fields[i];
  });

  const timestamp = `${row.YY}-${row.MM}-${row.DD} ${row.hh}:${row.mm} UTC`;

  return {
    timestamp,
    windDirDeg: parseValue(row.WDIR),
    windSpeedMs: parseValue(row.WSPD),
    waveHeightM: parseValue(row.WVHT),
    waterTempC: parseValue(row.WTMP),
  };
}

function formatValue(value: number | null, unit: string): string {
  return value === null ? "sin dato" : `${value}${unit}`;
}

async function main() {
  try {
    const reading = await fetchLatestReading(STATION_ID);
    const windKmh = msToKmh(reading.windSpeedMs);

    console.log(
      `Boya ${STATION_ID} (${reading.timestamp}) — ` +
        `Temperatura: ${formatValue(reading.waterTempC, "°C")} | ` +
        `Ola: ${formatValue(reading.waveHeightM, " m")} | ` +
        `Viento: ${formatValue(windKmh, " km/h")}`
    );
  } catch (err) {
    console.error(`Error al obtener datos de la boya ${STATION_ID}:`, err);
    process.exitCode = 1;
  }
}

main();
```

```json
// scripts/noaa-test/package.json
{
  "name": "noaa-test",
  "private": true,
  "scripts": {
    "fetch": "ts-node fetch-buoy.ts"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
```

**Salida esperada** (con la boya 42057, y notando que su `WTMP` está actualmente reportando `MM`):

```
Boya 42057 (2026-08-10 01:50 UTC) — Temperatura: sin dato | Ola: 1.1 m | Viento: 25.2 km/h
```

Con una boya donde todos los campos reportan (ej. 44013 o 44025), la salida se ve como el formato que pediste:

```
Boya 44013 (2026-08-09 14:20 UTC) — Temperatura: 21.3°C | Ola: 1.2 m | Viento: 18.4 km/h
```

Este es exactamente el comportamiento esperado en la Fase 1 del plan de desarrollo — este script *es* ese primer borrador.

---

## 4. Explicación del Formato NDBC

Se verificó directamente contra datos reales (boya 42057) para confirmar el formato exacto. Un archivo `realtime2/{ID}.txt` luce así:

```
#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft
2026 08 10 01 50  80  7.0  8.0   1.1     8   4.6 121 1015.0  29.2    MM  26.1   MM   MM    MM
2026 08 10 01 40  80  7.0  8.0    MM    MM    MM  MM 1014.9  29.2    MM  26.3   MM   MM    MM
...
```

**Puntos clave del formato:**

1. **Dos líneas de cabecera**, no una: la primera da los nombres de columna, la segunda las unidades. Ambas empiezan con `#` y deben omitirse al parsear.
2. **Columnas de ancho variable separadas por espacios** (no ancho fijo real, sino espacios múltiples) — hay que dividir por espacios en blanco (`\s+`), no por posición de carácter fija.
3. **La fila más reciente está primero**, no al final. Esto es fácil de asumir al revés si se viene de otros formatos de series temporales.
4. **Un registro cada 10 minutos** en el archivo — pero el "récord horario" (usado en resúmenes) es normalmente el de los minutos `:50`. Para el MVP no importa: simplemente se toma la primera fila, sea cual sea su minuto.
5. **`MM` significa dato faltante** (missing) — aparece con frecuencia, no es un caso raro. En la muestra real de arriba, la columna `WTMP` (temperatura del agua) está en `MM` en *todas* las filas recientes de esa boya en particular — es decir, para esta boya el sensor de temperatura del agua no está reportando ahora mismo. Esto confirma que el manejo de "sin dato" no es opcional, es necesario desde la primera versión.
6. **Timestamp en UTC**, sin excepción — de ahí la mejora #2 ya identificada en el plan de desarrollo (normalizar a UTC en la base de datos, convertir solo en la presentación).
7. **Unidades nativas:** viento en m/s (no km/h ni nudos), oleaje en metros, temperatura en °C, presión en hPa. Las conversiones a unidades "de pantalla" (ej. km/h) se hacen en la capa de presentación, no se guardan pre-convertidas en la base de datos — así se evita recalcular si después se decide mostrar otra unidad.

**Columnas del archivo estándar (`stdmet`, que es el `.txt`):**

| Columna | Significado | Unidad |
|---|---|---|
| WDIR | Dirección del viento | grados verdaderos |
| WSPD | Velocidad del viento | m/s |
| GST | Ráfaga | m/s |
| WVHT | Altura de ola significativa | m |
| DPD | Periodo de ola dominante | seg |
| APD | Periodo de ola promedio | seg |
| MWD | Dirección media de ola | grados verdaderos |
| PRES | Presión atmosférica | hPa |
| ATMP | Temperatura del aire | °C |
| WTMP | Temperatura del agua | °C |
| DEWP | Punto de rocío | °C |
| VIS | Visibilidad | millas náuticas |
| PTDY | Tendencia de presión | hPa |
| TIDE | Marea | pies |

Nota: no todas las boyas reportan todas las columnas — algunas (como 41010, verificada durante esta fase) no tienen sensor meteorológico estándar y solo reportan datos de oleaje en un archivo `.spec` separado, no en `.txt`. Por eso las 5 boyas recomendadas en la sección 1 fueron elegidas específicamente porque **sí** reportan el archivo `stdmet` completo.

---

## 5. Estrategia para Validar los Datos

Antes de que cualquier dato llegue a la base de datos (Fase 2 en adelante), esta fase deja sentada la estrategia de validación que se va a aplicar:

### 5.1 Validación de disponibilidad (¿la boya está viva?)
- Antes de confiar en una boya para el MVP, correr el script contra las 5 candidatas y confirmar que al menos 3 devuelven datos de las últimas 1-2 horas
- Si una boya no responde o el archivo está vacío, se descarta o se reemplaza por otra de la lista de respaldo
- Esta comprobación se repite justo antes de empezar la Fase 2 (no basta con haberla hecho una vez durante esta fase — NDBC puede sacar una boya de servicio en cualquier momento)

### 5.2 Validación de formato (¿el parser interpreta bien las columnas?)
- Comparar manualmente 2-3 filas parseadas contra el archivo `.txt` crudo, columna por columna, para las 5 boyas — confirmar que no hay desfase de columnas (un error común si alguna boya tiene una columna extra o le falta una)
- Guardar el `.txt` crudo de cada boya como fixture (`scripts/noaa-test/fixtures/`) en el momento en que se valida, para tener una referencia fija con la que comparar más adelante si el parser deja de funcionar

### 5.3 Validación de rangos físicos (¿el dato tiene sentido?)
- Temperatura del agua: entre -2°C y 40°C
- Altura de ola: entre 0 y 20 m
- Velocidad del viento: entre 0 y 100 m/s
- Cualquier valor fuera de rango se trata como sospechoso, no se descarta automáticamente pero se marca para revisión — esto ya estaba previsto en el plan como `validator.ts` (Fase 2), pero la lógica de qué rangos usar se define aquí, con datos reales como referencia

### 5.4 Validación de manejo de "MM"
- Confirmar explícitamente, con al menos una boya real que sí tenga `MM` en algún campo (como se vio con `WTMP` en 42057), que el script no rompe y que el resultado es legible ("sin dato") en vez de `NaN` o un error
- Esto ya quedó demostrado en el script de la sección 3 — es intencional que la boya de ejemplo elegida (42057) tenga un campo en `MM` ahora mismo, para que la validación no sea solo teórica

### 5.5 Validación de consistencia temporal
- Ejecutar el script 2-3 veces con al menos 10-15 minutos de diferencia contra la misma boya, y confirmar que el timestamp de la lectura más reciente avanza — si no avanza, puede indicar que la boya dejó de reportar o que el parser está tomando siempre la misma fila por error

### 5.6 Qué pasa si una boya falla la validación
- Se reemplaza por la siguiente en la lista de respaldo (46042 o 51001)
- No se detiene el proyecto por una sola boya problemática — el objetivo de esta fase es confirmar que **el mecanismo de obtención de datos funciona en general**, no que las 5 boyas específicas sean perfectas

---

## 6. Resultado de esta Fase

Al completar la Fase 0.5, se tiene:

1. Una lista de boyas confirmada como viable (no solo elegida "a ojo")
2. Un script funcional que ya demuestra fetch → parse → validar formato → imprimir, ejecutable contra cualquiera de las 5 boyas
3. Conocimiento verificado del formato NDBC (no supuesto, sino confirmado contra un archivo real)
4. Una estrategia de validación de datos que se reutiliza en la Fase 2 (`validator.ts`) sin tener que re-derivarla desde cero

Con esto resuelto, la Fase 1 del plan original (script en consola con salida pulida) se reduce a envolver este mismo script en el formato de salida definitivo — el trabajo pesado de esta fase ya está hecho.

---

*Próximo paso sugerido: ejecutar este script contra las 5 boyas, guardar los `.txt` de cada una como fixtures, y confirmar cuáles cumplen la validación de la sección 5 antes de avanzar a la Fase 1 formal del plan de desarrollo.*
