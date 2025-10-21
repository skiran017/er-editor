import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate line points between two elements
export function calculateConnectionPoints(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number }
): number[] {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;

  return [fromCenterX, fromCenterY, toCenterX, toCenterY];
}

// Check if point is inside rectangle
export function isPointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Find elements within selection box
export function findElementsInBox(
  box: { x: number; y: number; width: number; height: number },
  elements: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>
): string[] {
  return elements
    .filter((element) => {
      const elemCenter = {
        x: element.position.x + element.size.width / 2,
        y: element.position.y + element.size.height / 2,
      };
      return isPointInRect(elemCenter, box);
    })
    .map((element) => element.id);
}