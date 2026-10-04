"use client";

import { useEffect, useRef } from "react";

interface Point {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

export default function MapView({
  center,
  points = [],
  pick,
  onPick,
  height = 320,
}: {
  center: [number, number];
  points?: Point[];
  pick?: boolean;
  onPick?: (lat: number, lng: number) => void;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let L: any;
    let map: any;
    let cancelled = false;
    (async () => {
      L = await import("leaflet");
      if (cancelled || !ref.current || mapRef.current) return;
      await import("leaflet/dist/leaflet.css");
      map = L.map(ref.current).setView(center, 13);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: p.color || "#d97706",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(p.label || "");
      }
      if (pick && onPick) {
        map.on("click", (e: any) => {
          L.circleMarker([e.latlng.lat, e.latlng.lng], {
            radius: 8,
            color: "#2563eb",
            fillOpacity: 0.9,
          }).addTo(map);
          onPick(e.latlng.lat, e.latlng.lng);
        });
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} style={{ height, width: "100%" }} />;
}
