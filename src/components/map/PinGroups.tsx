"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { point, type LatLngTuple, type Marker as LeafletMarker } from "leaflet";
import { Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { fanPositions, overlappingPins } from "./pin-overlap";
import styles from "./PinGroups.module.css";
import { createPinIcon } from "./pin-icon";

interface Pin { id: string; position: LatLngTuple }
interface Display { hidden: boolean; position?: LatLngTuple }
const Registry = createContext<((pin: Pin) => () => void) | null>(null);
const Displays = createContext<ReadonlyMap<string, Display>>(new Map());

function GroupMarker({ id, count, position, open, toggle }: { id: string; count: number; position: LatLngTuple; open: boolean; toggle: () => void }) {
  const marker = useRef<LeafletMarker>(null);
  const label = `${count} sites superposés · ${open ? "Replier" : "Déployer"}`;
  const icon = useMemo(() => createPinIcon({
    className: styles.group, fill: "currentColor",
    content: `<text x="12" y="10" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-weight="700" font-size="${count > 99 ? 5 : 7}">${count}</text>`,
  }), [count]);
  useEffect(() => {
    const element = marker.current?.getElement();
    element?.setAttribute("aria-label", label);
    element?.setAttribute("aria-expanded", String(open));
    element?.setAttribute("data-pin-group", id);
  }, [label, open, id, icon]);
  return <Marker ref={marker} position={position} icon={icon} zIndexOffset={2000} bubblingMouseEvents={false}
    eventHandlers={{ click: toggle, keydown: event => {
      if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        toggle();
      }
    } }}><Tooltip>{label}</Tooltip></Marker>;
}

export function useGroupedPin(id: string, lat: number, lng: number) {
  const register = useContext(Registry);
  const display = useContext(Displays).get(id);
  useEffect(() => register?.({ id, position: [lat, lng] }), [register, id, lat, lng]);
  return display;
}

export default function PinGroups({ children }: { children: ReactNode }) {
  const map = useMap();
  const [pins, setPins] = useState<Map<string, Pin>>(new Map());
  const [zoom, setZoom] = useState(map.getZoom());
  const [expanded, setExpanded] = useState<string | null>(null);
  const register = useCallback((pin: Pin) => {
    setPins(prev => new Map(prev).set(pin.id, pin));
    setExpanded(null);
    return () => {
      setPins(prev => { const next = new Map(prev); next.delete(pin.id); return next; });
      setExpanded(null);
    };
  }, []);
  useMapEvents({
    zoomstart: () => setExpanded(null),
    zoomend: () => setZoom(map.getZoom()),
    click: () => setExpanded(null),
    resize: () => setExpanded(null),
  });
  const groups = useMemo(() => overlappingPins([...pins.values()].map(pin => {
    const projected = map.project(pin.position, zoom);
    return { id: pin.id, x: projected.x, y: projected.y };
  })).map(members => {
    const center = point(members.reduce((sum, pin) => sum + pin.x, 0) / members.length, members.reduce((sum, pin) => sum + pin.y, 0) / members.length);
    const location = map.unproject(center, zoom);
    const offsets = fanPositions(members.length);
    return {
      id: members.map(pin => pin.id).join("|"),
      position: [location.lat, location.lng] as LatLngTuple,
      members: members.map((pin, index) => {
        const fanned = map.unproject(center.add(point(offsets[index].x, offsets[index].y)), zoom);
        return { id: pin.id, original: pins.get(pin.id)!.position, position: [fanned.lat, fanned.lng] as LatLngTuple };
      }),
    };
  }), [pins, map, zoom]);
  const displays = useMemo(() => new Map(groups.flatMap(group => group.members.map(pin => [pin.id, {
    hidden: expanded !== group.id,
    position: expanded === group.id ? pin.position : undefined,
  }] as const))), [groups, expanded]);
  useEffect(() => {
    const container = map.getContainer();
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !expanded) return;
      setExpanded(null);
      container.querySelector<HTMLElement>(`[data-pin-group="${CSS.escape(expanded)}"]`)?.focus();
    };
    container.addEventListener("keydown", close);
    return () => container.removeEventListener("keydown", close);
  }, [map, expanded]);
  return <Registry.Provider value={register}><Displays.Provider value={displays}>
    {children}
    {groups.map(group => <GroupMarker key={group.id} id={group.id} count={group.members.length} position={group.position}
      open={expanded === group.id} toggle={() => setExpanded(expanded === group.id ? null : group.id)} />)}
    {groups.filter(group => group.id === expanded).flatMap(group => group.members.map(pin => <Polyline key={pin.id}
      positions={[pin.original, pin.position]} interactive={false} className="atlas-pin-connector"
      pathOptions={{ color: "#1d6ab2", weight: 1.5, opacity: 0.7, dashArray: "4 4" }} />))}
  </Displays.Provider></Registry.Provider>;
}
