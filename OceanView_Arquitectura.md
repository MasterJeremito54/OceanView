# OceanView — Documento Técnico de Arquitectura

**Versión:** 1.0
**Fecha:** Agosto 2026
**Alcance:** Diseño de arquitectura previo a implementación (sin código)

---

## 1. Resumen Ejecutivo

OceanView es una plataforma de monitoreo oceanográfico en tiempo real que transforma datos de boyas de NOAA NDBC (National Data Buoy Center) en visualizaciones adaptadas a múltiples dispositivos: televisores, tablets, celulares y computadores.

**Principios de diseño:**
- **Multi-dispositivo desde el diseño, no como parche.** TV, tablet, móvil y desktop tienen patrones de consumo distintos (distancia de lectura, interacción táctil vs. remoto, tiempo de atención), así que la arquitectura los trata como "perfiles de presentación" separados desde el inicio.
- **Datos externos poco confiables.** NDBC puede fallar, tener latencia o entregar datos corruptos/faltantes. El sistema debe degradar con gracia (mostrar "última lectura válida" en vez de romperse).
- **Separación estricta entre ingesta y presentación.** La capa que habla con NOAA nunca debe bloquear ni acoplarse a la capa que sirve a los usuarios.
- **Serie temporal como ciudadano de primera clase.** Los datos oceanográficos son inherentemente time-series; la base de datos y las APIs se diseñan pensando en eso desde el día uno, no como algo añadido después.

---

## 2. Arquitectura General (Vista de Alto Nivel)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FUENTES EXTERNAS                             │
│                    NOAA NDBC (realtime2, archivos                    │
│                    .txt por boya: stdmet, spec, etc.)                │
└──────────────────────────────┬────────────────────────────────────┘
                                │ polling programado (cada 10-30 min)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CAPA DE INGESTA (Backend)                        │
│  ┌────────────────┐   ┌───────────────────┐   ┌──────────────────┐ │
│  │ Data Fetcher    │──▶│ Parser/Normalizer │──▶│ Validator         │ │
│  │ (scheduler/cron)│   │ (texto NDBC→JSON) │   │ (rangos, nulos,   │ │
│  └────────────────┘   └───────────────────┘   │  outliers)         │ │
│                                                 └────────┬──────────┘ │
└──────────────────────────────────────────────────────────┼──────────┘
                                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (PostgreSQL +                       │
│                    extensión TimescaleDB)                            │
│         Boyas · Estaciones · Lecturas (series temporales)            │
└──────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API BACKEND (REST/GraphQL)                     │
│    Capa de servicio · Caché (Redis) · WebSockets/SSE para tiempo     │
│    real · Autenticación (si aplica) · Agregaciones                   │
└──────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Web App)                          │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│   │  TV Mode  │  │Tablet Mode│  │Mobile Mode │  │  Desktop Mode   │  │
│   │(kiosko,   │  │(dashboard │  │(resumen,   │  │ (panel completo,│  │
│   │ auto-scroll│  │ táctil)   │  │ gestos)    │  │  multi-boya)    │  │
│   └───────────┘  └───────────┘  └───────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Arquitectura Backend

### 3.1 Responsabilidades

El backend se divide en **tres subsistemas independientes** que pueden escalar y fallar por separado:

1. **Servicio de Ingesta (Ingestion Service)**
   - Ejecuta tareas programadas (cron / job scheduler) que consultan los endpoints de NDBC (`https://www.ndbc.noaa.gov/data/realtime2/{ID}.txt` y variantes: `.spec`, `.ocean`, etc.)
   - Descarga, parsea formato de texto fijo de NDBC a estructuras normalizadas
   - Valida rangos físicos plausibles (ej. temperatura del agua entre -2°C y 40°C) y descarta/marca outliers
   - Escribe en la base de datos, con manejo de reintentos y backoff exponencial ante fallos de red
   - **No expone endpoints públicos** — es un worker interno, aislado del tráfico de usuarios

2. **Servicio de API (API Service)**
   - Expone datos a los clientes frontend vía REST (y opcionalmente GraphQL si se necesitan queries flexibles por dispositivo)
   - Capa de caché (Redis) para reducir carga en la base de datos ante picos de tráfico (ej. muchos televisores consultando la misma boya)
   - Canal de tiempo real: WebSockets o Server-Sent Events (SSE) para push de nuevas lecturas sin polling constante del cliente
   - Endpoints de agregación (promedios diarios, máximos/mínimos históricos, tendencias)

3. **Servicio de Alertas/Notificaciones (opcional, fase 2)**
   - Detecta condiciones extremas (oleaje alto, viento fuerte) y puede disparar notificaciones o banners de alerta en el frontend

### 3.2 Justificación técnica

- **Separar ingesta de API** evita que un fallo o lentitud de NOAA afecte la experiencia de los usuarios que ya están viendo datos cacheados.
- **Node.js (TypeScript) con Fastify o NestJS**, o alternativamente **Python con FastAPI**, son opciones razonables. Python es más natural si se anticipa procesamiento científico/estadístico de los datos (interpolaciones, promedios móviles); Node/TypeScript es más natural si el equipo ya trabaja en TS para el frontend y se busca compartir tipos entre frontend/backend.
- **Redis** como caché y como broker de pub/sub para distribuir actualizaciones en tiempo real a múltiples instancias del servicio de API.

### 3.3 Manejo de fallos de NOAA

- Reintentos con backoff exponencial (ej. 3 intentos: 30s, 2min, 10min)
- Si una boya no reporta, se conserva la última lectura válida marcada con `stale: true` y timestamp de antigüedad, para que el frontend pueda mostrar "última actualización hace X horas"
- Circuit breaker: si NDBC está caído globalmente, el sistema deja de intentar agresivamente y reduce frecuencia de sondeo hasta que vuelva a responder

---

## 4. Arquitectura Frontend

### 4.1 Enfoque: una sola base de código, múltiples "perfiles de presentación"

En lugar de construir apps separadas por dispositivo, se recomienda una **Web App responsive** (Next.js o similar framework React con SSR/SSG) con un **sistema de "modos de visualización"** que se activa según el dispositivo detectado o configurado manualmente.

**Framework sugerido:** Next.js (React) — permite SSR para carga inicial rápida (importante en TV/kiosko), generación estática para contenido que cambia poco (info de boyas), y client-side rendering para datos en tiempo real.

### 4.2 Modos de visualización

| Modo | Dispositivo objetivo | Características |
|---|---|---|
| **TV Mode** | Smart TV / pantallas públicas | Layout de alto contraste, texto grande, auto-rotación entre boyas cada N segundos, sin interacción táctil requerida, optimizado para visualización a distancia |
| **Tablet Mode** | Tablets en exhibiciones/oficinas | Dashboard interactivo, navegación táctil, mapas explorables, comparación entre boyas |
| **Mobile Mode** | Celulares | Vista resumida, una boya a la vez con swipe, datos priorizados (los 3-4 más relevantes), diseño vertical |
| **Desktop Mode** | Computadores | Panel completo, múltiples boyas simultáneas, gráficos históricos detallados, exportación de datos |

### 4.3 Estructura de componentes (conceptual)

- **Componentes de datos** (agnósticos de dispositivo): `BuoyCard`, `WindCompass`, `WaveHeightChart`, `TemperatureGauge`, `MapView`
- **Componentes de layout** (específicos por modo): `TVLayout`, `TabletLayout`, `MobileLayout`, `DesktopLayout` — cada uno decide cómo organizar los componentes de datos
- **Hooks compartidos**: `useBuoyData()`, `useRealtimeUpdates()`, `useDeviceProfile()`

Esta separación permite que el mismo componente `WaveHeightChart` se reutilice en los cuatro modos, cambiando solo su tamaño/densidad de información según el layout contenedor.

### 4.4 Detección de dispositivo/modo

- Detección automática por user-agent + tamaño de pantalla como primer filtro
- Pero **siempre con override manual** vía URL (`/tv`, `/tablet`, `/mobile`) o configuración, porque un Smart TV a veces reporta user-agents genéricos y los kioscos necesitan control explícito

### 4.5 Manejo de estado y datos en tiempo real

- Cliente de datos con **React Query / TanStack Query** para caché, revalidación y manejo de estados de carga/error de forma consistente
- Suscripción a WebSocket/SSE para actualizaciones push, con fallback a polling si la conexión en tiempo real falla (importante para redes de TV públicas que pueden tener firewalls restrictivos)

---

## 5. Base de Datos

### 5.1 Motor: PostgreSQL + TimescaleDB

Se recomienda PostgreSQL con la extensión **TimescaleDB**, que convierte tablas en "hypertables" optimizadas para series temporales, manteniendo la familiaridad y robustez de SQL/PostgreSQL (transacciones, joins, integridad referencial) que una base NoSQL pura no ofrece igual de bien para este caso de uso.

### 5.2 Modelo de datos (conceptual, sin DDL todavía)

**Tabla: `stations` (boyas)**
- `station_id` (identificador NDBC, ej. "41010")
- `name`, `latitude`, `longitude`
- `owner`, `type` (boya fija, boya a la deriva, plataforma costera)
- `active` (booleano)
- `metadata` (JSON: sensores disponibles, profundidad, etc.)

**Tabla: `readings` (hypertable — lecturas, particionada por tiempo)**
- `station_id` (FK a stations)
- `timestamp`
- `wind_direction`, `wind_speed`, `wind_gust`
- `wave_height`, `dominant_wave_period`, `average_wave_period`, `mean_wave_direction`
- `air_pressure`, `air_temperature`, `water_temperature`
- `dew_point`, `visibility`
- `quality_flag` (válido / sospechoso / interpolado)
- `raw_source` (referencia al registro crudo original, para auditoría)

**Tabla: `ingestion_logs`**
- Registro de cada intento de sondeo a NOAA: éxito/fallo, latencia, errores
- Útil para diagnóstico y para el circuit breaker

**Tabla: `alerts` (fase 2)**
- Condiciones que disparan una alerta, boya asociada, umbral, estado

### 5.3 Estrategia de retención y agregación

- Datos crudos (resolución nativa de NDBC, ~cada 10-60 min según boya) retenidos por un período definido (ej. 90 días)
- **Agregados continuos (continuous aggregates de TimescaleDB)** para promedios horarios/diarios, retenidos indefinidamente — esto permite mostrar tendencias históricas sin cargar millones de filas crudas
- Política de compresión automática de TimescaleDB para datos antiguos, reduciendo costo de almacenamiento

---

## 6. Flujo de Datos (End-to-End)

1. **Scheduler** dispara el job de ingesta cada 10–30 minutos (frecuencia ajustable por boya, ya que NDBC actualiza a distintos ritmos)
2. **Fetcher** descarga el archivo de texto plano por boya desde NDBC
3. **Parser** convierte el formato de columnas fijas de NDBC en objetos estructurados
4. **Validator** aplica reglas de sanidad (rangos físicos, detección de valores "MM" que NDBC usa para "missing")
5. **Writer** inserta en la hypertable `readings`, actualiza `stations.active` y dispara evento de "nueva lectura"
6. **Pub/Sub (Redis)** distribuye el evento a las instancias del API Service
7. **API Service** empuja la actualización a clientes conectados vía WebSocket/SSE, e invalida entradas de caché relevantes
8. **Frontend** recibe el push (o revalida vía polling de respaldo) y actualiza la UI sin recargar la página
9. Si el usuario solicita datos históricos, el **API Service** consulta los agregados continuos en vez de las lecturas crudas, para respuesta rápida

---

## 7. Estructura de Carpetas (Monorepo)

Se recomienda un **monorepo** para compartir tipos/interfaces entre frontend y backend y simplificar el versionado conjunto.

```
oceanview/
├── apps/
│   ├── web/                      # Frontend Next.js
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── data/         # BuoyCard, WindCompass, etc. (agnósticos)
│   │   │   │   └── layouts/      # TVLayout, TabletLayout, MobileLayout, DesktopLayout
│   │   │   ├── hooks/            # useBuoyData, useRealtimeUpdates, useDeviceProfile
│   │   │   ├── pages/ (o app/)   # rutas: /, /tv, /tablet, /mobile, /station/[id]
│   │   │   ├── styles/
│   │   │   └── lib/              # cliente API, utilidades de formato
│   │   └── public/
│   │
│   ├── api/                      # Backend API Service
│   │   ├── src/
│   │   │   ├── routes/           # endpoints REST
│   │   │   ├── services/         # lógica de negocio
│   │   │   ├── cache/            # integración Redis
│   │   │   ├── realtime/         # WebSocket/SSE handlers
│   │   │   └── db/               # acceso a datos, queries
│   │   └── ...
│   │
│   └── ingestion/                # Servicio de ingesta (worker independiente)
│       ├── src/
│       │   ├── fetchers/         # cliente NDBC
│       │   ├── parsers/          # parseo de formatos NDBC (stdmet, spec, ocean)
│       │   ├── validators/       # reglas de sanidad
│       │   └── scheduler/
│       └── ...
│
├── packages/
│   ├── shared-types/             # tipos TypeScript compartidos (Station, Reading, etc.)
│   ├── ui/                       # componentes de diseño compartidos (si aplica)
│   └── config/                   # configuración compartida (ESLint, TS config)
│
├── infra/
│   ├── docker/                   # Dockerfiles por servicio
│   ├── migrations/                # migraciones de base de datos (TimescaleDB)
│   └── terraform/ (o similar)    # infraestructura como código, si aplica
│
├── docs/
│   └── architecture.md           # este documento, versionado junto al código
│
└── README.md
```

---

## 8. Estrategia de Despliegue

### 8.1 Contenedores

Cada servicio (`web`, `api`, `ingestion`) se empaqueta como imagen Docker independiente, permitiendo escalarlos por separado. Por ejemplo, `ingestion` no necesita múltiples réplicas (es un job programado), mientras que `api` sí puede necesitar varias instancias detrás de un balanceador para atender picos (muchos TVs consultando simultáneamente).

### 8.2 Topología sugerida

- **Frontend (`web`)**: desplegado en una plataforma con CDN/edge (Vercel, o un contenedor detrás de un CDN como Cloudflare) — crítico para que las pantallas TV en distintas ubicaciones carguen rápido
- **API Service**: contenedor(es) en un orquestador simple (ej. un servicio administrado tipo Railway/Render/Fly.io para empezar, o Kubernetes si la escala lo justifica más adelante) con auto-scaling horizontal
- **Ingestion Service**: job programado (cron gestionado por el propio orquestador, o un scheduler externo tipo GitHub Actions cron / AWS EventBridge) — no necesita estar siempre corriendo, solo despertar en cada ciclo
- **Base de datos**: instancia administrada de PostgreSQL con TimescaleDB (ej. Timescale Cloud, o RDS/Aurora con la extensión si el proveedor lo permite) — evitar auto-gestionar la base de datos en fases tempranas
- **Redis**: instancia administrada (ej. Upstash, Redis Cloud) — bajo costo y suficiente para caché + pub/sub en esta escala

### 8.3 CI/CD

- Pipeline por servicio: lint → tests → build → deploy, disparado en cada push a `main` (o por rama de servicio si el monorepo usa detección de cambios)
- Entornos: `development` → `staging` → `production`, con la base de datos de staging usando un subconjunto de boyas para no duplicar carga sobre NOAA innecesariamente
- Migraciones de base de datos versionadas y aplicadas automáticamente como paso del pipeline, con posibilidad de rollback

### 8.4 Observabilidad

- Logs centralizados (ej. Grafana Loki, o el logging nativo del proveedor)
- Métricas de ingesta: tasa de éxito por boya, latencia de NOAA, lecturas faltantes — esencial para saber si el sistema está "sano" sin depender solo de quejas de usuarios
- Alertas operativas (distintas de las alertas oceanográficas del producto): si el servicio de ingesta falla repetidamente, notificar al equipo

---

## 9. Diseño Responsive

### 9.1 Filosofía: "responsive por contexto de uso", no solo por ancho de pantalla

El responsive tradicional basado únicamente en breakpoints de ancho es insuficiente aquí porque un TV y un monitor de escritorio pueden tener anchos de pantalla similares en píxeles CSS, pero contextos de uso totalmente distintos (distancia de lectura, ausencia de mouse/teclado). Por eso se combina:

1. **Breakpoints de ancho** (responsive clásico, para tablet/mobile/desktop)
2. **Perfil de dispositivo explícito** (para TV, ya que no se controla por ancho sino por el modo `/tv` activado)

### 9.2 Breakpoints sugeridos

| Rango | Perfil por defecto |
|---|---|
| < 480px | Mobile |
| 480px – 1024px | Tablet |
| 1024px – 1920px | Desktop |
| ≥ 1920px o modo `/tv` forzado | TV |

### 9.3 Consideraciones específicas por modo

- **TV**: tipografía mínima ~28-32px equivalente, alto contraste, evitar texto denso, "safe area" del 5-10% en los bordes (los TVs recortan bordes), animaciones lentas y suaves (rotación automática de contenido cada 15-20s)
- **Tablet**: objetivos táctiles de al menos 44x44px, navegación por gestos (swipe entre boyas), orientación tanto vertical como horizontal soportada
- **Mobile**: priorización agresiva de información (mostrar 3-4 métricas clave, resto detrás de "ver más"), diseño vertical primero, carga rápida en redes móviles (imágenes optimizadas, lazy loading de gráficos históricos)
- **Desktop**: aprovechar espacio horizontal para comparar múltiples boyas lado a lado, gráficos más densos, posibilidad de exportar/imprimir

### 9.4 Accesibilidad transversal

- Contraste de color AA mínimo (AAA para modo TV, dado el contexto de visualización a distancia)
- No depender solo de color para comunicar estados (ej. alerta de oleaje alto: color + ícono + texto)
- Soporte de navegación por teclado en modos tablet/desktop

---

## 10. Próximos Pasos Sugeridos

1. Validar con los endpoints reales de NDBC qué boyas/estaciones se usarán en el MVP y revisar sus formatos exactos (algunas boyas no reportan todos los campos)
2. Definir el MVP de "modos de visualización" — probablemente empezar por Desktop + Mobile, y dejar TV/Tablet para una segunda iteración una vez validado el flujo de datos
3. Diseñar el esquema exacto de base de datos (DDL) basado en los campos reales disponibles por boya
4. Prototipar el parser de NDBC contra datos reales, ya que el formato de texto tiene particularidades (columnas de ancho fijo, valores "MM" para missing, headers con unidades)

---

*Este documento cubre la arquitectura de nivel de sistema. El siguiente paso, cuando lo indiques, sería detallar el esquema de base de datos (DDL) o comenzar con el prototipo del parser de NDBC contra datos reales.*
