"use client";

import { Marker, type MarkerProps } from "react-leaflet";
import { useEffect, useRef } from "react";
import type { LeafletKeyboardEvent, Marker as LeafletMarker } from "leaflet";

export default function AtlasMarker({ onSelect, title, ...props }: Omit<MarkerProps, "eventHandlers"> & { onSelect: () => void }) {
  const marker = useRef<LeafletMarker>(null);
  useEffect(() => {
    // Keep the accessible name without a native title competing with Tooltip.
    const element = marker.current?.getElement();
    if (title) element?.setAttribute("aria-label", title);
    else element?.removeAttribute("aria-label");
  }, [title, props.icon]);
  // Leaflet's built-in Enter handler belongs to Popup. Keep keyboard activation
  // when details are opened outside Leaflet instead.
  return <Marker {...props} ref={marker} eventHandlers={{
    click: onSelect,
    keydown: (event: LeafletKeyboardEvent) => {
      if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        onSelect();
      }
    },
  }} />;
}
