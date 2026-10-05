"use client";

import { useEffect, useRef, useState } from "react";

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
  const [mapReady, setMapReady] = useState(false);

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
      setMapReady(true);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
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
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep center in sync
  useEffect(() => {
    if (mapReady) mapRef.current?.setView(center, mapRef.current.getZoom());
  }, [center, mapReady]);

  // Redraw markers whenever points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      // remove previous marker layer group
      (map as any)._markerLayer?.remove();
      const group = L.layerGroup().addTo(map);
      (map as any)._markerLayer = group;
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: p.color || "#d97706",
          fillOpacity: 0.9,
        })
          .addTo(group)
          .bindPopup(p.label || "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [points, mapReady]);

  return <div ref={ref} style={{ height, width: "100%" }} />;
}
