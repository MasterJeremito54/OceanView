"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Station } from "@/types/station";
import { getFreshness, STATUS_COLOR, type Freshness } from "./LastUpdated";

// Ícono propio en vez del pin por defecto de Leaflet: el mismo lenguaje
// visual del punto de pulso de las tarjetas, para que el mapa y la lista
// se lean como una sola interfaz, no dos widgets pegados.
function buoyIcon(freshness: Freshness): L.DivIcon {
  const color = STATUS_COLOR[freshness];
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 4px ${color}33;border:2px solid #0F2438;"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function formatTemp(value: number | null | undefined): string {
  return value === null || value === undefined ? "sin dato" : `${value.toFixed(1)}°C`;
}

export function BuoyMap({ stations }: { stations: Station[] }) {
  return (
    <MapContainer
      center={[20, -80]}
      zoom={2}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "#0F2438" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
      />
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.latitude, station.longitude]}
          icon={buoyIcon(getFreshness(station.lastSeenAt, station.active))}
        >
          <Popup>
            <strong>{station.name}</strong>
            <br />
            {formatTemp(station.latestReading?.waterTempC)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
