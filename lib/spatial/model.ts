import { priorities, type GentlemanMemory } from '../gentleman/model.ts';
/** Small, bounded physical response. Invalid geometry always returns a flat plane. */
export function surfacePose(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return { x: 0, y: 0, lightX: 50, lightY: 50 };
  const px = Math.max(0, Math.min(1, x / width)),
    py = Math.max(0, Math.min(1, y / height));
  return {
    x: (0.5 - py) * 4,
    y: (px - 0.5) * 4,
    lightX: px * 100,
    lightY: py * 100,
  };
}
export function commandContext(memory: GentlemanMemory, today: string) {
  return {
    priorities: today ? priorities(memory, today) : [],
    trip: memory.records
      .filter(
        (r) =>
          r.kind === 'trip' &&
          !r.completed &&
          r.date &&
          (r.endDate || r.date) >= today,
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0],
    people: memory.records.filter((r) => r.kind === 'person' && !r.completed)
      .length,
    rituals: memory.records.filter((r) => r.ritual && !r.completed).length,
    ritualsRecorded: today
      ? memory.records.filter(
          (r) =>
            r.ritual && !r.completed && r.ritual.completions.includes(today),
        ).length
      : 0,
    captures: memory.records.filter((r) => r.kind === 'note' && !r.completed)
      .length,
  };
}
