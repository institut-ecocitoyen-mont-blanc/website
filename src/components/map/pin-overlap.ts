export interface PinPoint { id: string; x: number; y: number }

// Only near-identical screen positions group. Require every pair to be close,
// so a chain of nearby sites cannot swallow a whole neighbourhood.
export function overlappingPins(points: PinPoint[]): PinPoint[][] {
  const groups: PinPoint[][] = [];
  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const group = groups.find(members => members.every(member => Math.hypot(member.x - point.x, member.y - point.y) <= 1));
    if (group) group.push(point);
    else groups.push([point]);
  }
  return groups.filter(group => group.length > 1);
}

export function fanPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let radius = 70; positions.length < count; radius += 65) {
    const capacity = Math.floor(2 * Math.PI * radius / 65);
    const size = Math.min(capacity, count - positions.length);
    for (let i = 0; i < size; i++) {
      const angle = 2 * Math.PI * i / size - Math.PI / 2;
      positions.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
  }
  return positions;
}
