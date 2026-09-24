"use client";

import { Marker, type MarkerProps } from "react-leaflet";
import { useEffect, useId, useRef } from "react";
import { latLng } from "leaflet";
import type { LeafletKeyboardEvent, Marker as LeafletMarker } from "leaflet";
import { useGroupedPin } from "./PinGroups";

export default function MapMarker({ onSelect, title, ...props }: Omit<MarkerProps, "eventHandlers"> & { onSelect?: () => void }) {
  const marker = useRef<LeafletMarker>(null);
  const id = useId();
  const original = latLng(props.position);
  const display = useGroupedPin(id, original.lat, original.lng);
  useEffect(() => {
    // Keep the accessible name without a native title competing with Tooltip.
    const element = marker.current?.getElement();
    if (title) element?.setAttribute("aria-label", title);
    else element?.removeAttribute("aria-label");
    if (element) element.style.display = display?.hidden ? "none" : "";
    if (display?.hidden) marker.current?.closeTooltip();
  }, [title, props.icon, display?.hidden]);
  // Leaflet's built-in Enter handler belongs to Popup. Keep keyboard activation
  // when details are opened outside Leaflet instead.
  return <Marker {...props} position={display?.position ?? props.position} zIndexOffset={display?.position ? 3000 : props.zIndexOffset ?? 0} bubblingMouseEvents={false} ref={marker} eventHandlers={{
    click: onSelect,
    keydown: onSelect ? (event: LeafletKeyboardEvent) => {
      if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        onSelect();
      }
    } : undefined,
  }} />;
}
