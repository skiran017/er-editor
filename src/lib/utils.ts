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

// Determine which edge of an element a point is closest to
// For entities, this ensures connections only use side midpoints (not corners)
// Uses the SAME logic as orthogonal routing to ensure edge selection matches routing direction
// This creates optimal orthogonal paths that route in the most direct direction
export function getClosestEdge(
  point: { x: number; y: number },
  element: { position: { x: number; y: number }; size: { width: number; height: number } }
): 'top' | 'right' | 'bottom' | 'left' {
  const centerX = element.position.x + element.size.width / 2;
  const centerY = element.position.y + element.size.height / 2;

  // Calculate direction from element center to point
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Use the SAME logic as orthogonal routing (absolute distances, not normalized)
  // This ensures edge selection matches the routing direction:
  // - If horizontal distance >= vertical distance: route horizontal-first, use left/right edge
  // - If vertical distance > horizontal distance: route vertical-first, use top/bottom edge
  if (absDx >= absDy) {
    // Horizontal distance is larger or equal - use left or right edge
    // This matches orthogonal routing which will go horizontal-first
    return dx > 0 ? 'right' : 'left';
  } else {
    // Vertical distance is larger - use top or bottom edge
    // This matches orthogonal routing which will go vertical-first
    return dy > 0 ? 'bottom' : 'top';
  }
}

/**
 * Find the best available edge for a relationship connection
 * Distributes connections across different edges to avoid overlapping lines
 * Matches Java app behavior where connections use different edges of relationships
 * 
 * @param relationshipId - ID of the relationship
 * @param connections - All existing connections
 * @param point - Point to connect from (usually the other element's center)
 * @param element - The relationship element
 * @returns The best available edge (prefers unused edges, falls back to closest)
 */
export function getBestAvailableEdge(
  relationshipId: string,
  connections: Array<{ fromId: string; toId: string; fromPoint: string; toPoint: string }>,
  point: { x: number; y: number },
  element: { position: { x: number; y: number }; size: { width: number; height: number } }
): 'top' | 'right' | 'bottom' | 'left' {
  // Find all edges already used by connections to/from this relationship
  const usedEdges = new Set<'top' | 'right' | 'bottom' | 'left'>();

  connections.forEach(conn => {
    // If relationship is the target (toId), check toPoint
    if (conn.toId === relationshipId) {
      const edge = conn.toPoint;
      if (edge && edge !== 'center' && (edge === 'top' || edge === 'right' || edge === 'bottom' || edge === 'left')) {
        usedEdges.add(edge);
      }
    }
    // If relationship is the source (fromId), check fromPoint
    if (conn.fromId === relationshipId) {
      const edge = conn.fromPoint;
      if (edge && edge !== 'center' && (edge === 'top' || edge === 'right' || edge === 'bottom' || edge === 'left')) {
        usedEdges.add(edge);
      }
    }
  });

  // Debug logging (remove in production)
  console.log(`[getBestAvailableEdge] Relationship ${relationshipId}:`, {
    totalConnections: connections.length,
    usedEdges: Array.from(usedEdges),
    connectionsToThis: connections.filter(c => c.toId === relationshipId || c.fromId === relationshipId).length
  });

  // All possible edges
  const allEdges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

  // Find unused edges
  const unusedEdges = allEdges.filter(edge => !usedEdges.has(edge));

  // If there are unused edges, find the best one
  if (unusedEdges.length > 0) {
    const centerX = element.position.x + element.size.width / 2;
    const centerY = element.position.y + element.size.height / 2;

    // Calculate direction from relationship center to connecting point
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Normalize by element dimensions to account for non-square shapes
    const normalizedDx = absDx / element.size.width;
    const normalizedDy = absDy / element.size.height;

    // First, try to find an unused edge that "faces" the connecting point
    // This matches Java app behavior where connections use edges that face the connecting entity
    let preferredEdge: 'top' | 'right' | 'bottom' | 'left' | null = null;

    // Determine which edge faces the connecting point
    if (normalizedDx > normalizedDy) {
      // Point is more horizontally aligned - prefer left or right edge
      preferredEdge = dx > 0 ? 'right' : 'left';
    } else {
      // Point is more vertically aligned - prefer top or bottom edge
      preferredEdge = dy > 0 ? 'bottom' : 'top';
    }

    // If the preferred edge is unused, use it
    if (preferredEdge && unusedEdges.includes(preferredEdge)) {
      console.log(`[getBestAvailableEdge] Using preferred edge: ${preferredEdge} (faces connecting point)`);
      return preferredEdge;
    }

    // Otherwise, find the closest unused edge
    const edgeDistances = unusedEdges.map(edge => {
      let edgeMidpoint: { x: number; y: number };
      switch (edge) {
        case 'top':
          edgeMidpoint = { x: centerX, y: element.position.y };
          break;
        case 'right':
          edgeMidpoint = { x: element.position.x + element.size.width, y: centerY };
          break;
        case 'bottom':
          edgeMidpoint = { x: centerX, y: element.position.y + element.size.height };
          break;
        case 'left':
          edgeMidpoint = { x: element.position.x, y: centerY };
          break;
      }
      const dist = Math.sqrt(
        Math.pow(point.x - edgeMidpoint.x, 2) + Math.pow(point.y - edgeMidpoint.y, 2)
      );
      return { edge, dist };
    });

    // Return the closest unused edge
    const closestUnused = edgeDistances.reduce((closest, current) =>
      current.dist < closest.dist ? current : closest
    ).edge;
    console.log(`[getBestAvailableEdge] Using closest unused edge: ${closestUnused} (preferred ${preferredEdge} was used)`);
    return closestUnused;
  }

  // All edges are used, fall back to closest edge (original behavior)
  return getClosestEdge(point, element);
}

/**
 * Convert a straight line path to an orthogonal path (horizontal + vertical only)
 * Supports multi-segment paths (3+ segments) for better routing
 * This matches Java app's ConnectionLine behavior which uses only horizontal and vertical segments
 * 
 * @param points - Array of points in format [x1, y1, x2, y2, x3, y3, ...]
 * @param fromEdge - Optional: which edge the connection starts from (for smart routing)
 * @param toEdge - Optional: which edge the connection ends at (for smart routing)
 * @returns Array of points representing orthogonal path with multiple segments
 */
export function convertToOrthogonalPath(
  points: number[],
  fromEdge?: 'top' | 'right' | 'bottom' | 'left',
  toEdge?: 'top' | 'right' | 'bottom' | 'left'
): number[] {
  if (points.length < 4) {
    // Need at least 2 points (4 numbers: x1, y1, x2, y2)
    return points;
  }

  const orthogonalPoints: number[] = [];

  // Process each segment: (x1, y1) -> (x2, y2) -> (x3, y3) -> ...
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1];
    const x2 = points[i + 2];
    const y2 = points[i + 3];

    // Calculate differences
    const dx = x2 - x1;
    const dy = y2 - y1;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // If points are the same (or very close), just add the point
    if (absDx < 0.1 && absDy < 0.1) {
      if (i === 0) {
        // First point - add it
        orthogonalPoints.push(x1, y1);
      }
      // Skip duplicate point
      continue;
    }

    // Add start point (only for first segment)
    if (i === 0) {
      orthogonalPoints.push(x1, y1);
    }

    // Create optimal orthogonal path based on edge directions
    // If we know which edges are being connected, use smart routing
    // Otherwise, fall back to distance-based routing

    if (i === 0 && fromEdge && toEdge) {
      // First segment: use edge information for smart routing
      const isFromHorizontal = fromEdge === 'left' || fromEdge === 'right';
      const isToHorizontal = toEdge === 'left' || toEdge === 'right';

      if (isFromHorizontal && !isToHorizontal) {
        // From horizontal edge (left/right) to vertical edge (top/bottom)
        // Route: horizontal out -> vertical -> horizontal to align with target
        const midX = x1 + dx / 2;
        orthogonalPoints.push(midX, y1);      // Go out horizontally to midpoint
        orthogonalPoints.push(midX, y2);      // Turn vertically to target height
        orthogonalPoints.push(x2, y2);        // Go horizontally to target
      } else if (!isFromHorizontal && isToHorizontal) {
        // From vertical edge (top/bottom) to horizontal edge (left/right)
        // Route: vertical out -> horizontal -> vertical to align with target
        const midY = y1 + dy / 2;
        orthogonalPoints.push(x1, midY);      // Go out vertically to midpoint
        orthogonalPoints.push(x2, midY);      // Turn horizontally to target x
        orthogonalPoints.push(x2, y2);        // Go vertically to target
      } else if (isFromHorizontal && isToHorizontal) {
        // Both horizontal edges: go out horizontally, then vertical, then horizontal
        const midX = x1 + dx / 2;
        orthogonalPoints.push(midX, y1);      // Go out horizontally
        orthogonalPoints.push(midX, y2);      // Turn vertically
        orthogonalPoints.push(x2, y2);        // Go horizontally to target
      } else {
        // Both vertical edges: go out vertically, then horizontal, then vertical
        const midY = y1 + dy / 2;
        orthogonalPoints.push(x1, midY);      // Go out vertically
        orthogonalPoints.push(x2, midY);      // Turn horizontally
        orthogonalPoints.push(x2, y2);        // Go vertically to target
      }
    } else {
      // No edge information: use distance-based routing
      if (absDx >= absDy) {
        // Horizontal distance is larger - use 3-segment horizontal-first routing
        const midX = x1 + dx / 2;
        orthogonalPoints.push(midX, y1);      // First horizontal segment
        orthogonalPoints.push(midX, y2);      // Vertical segment
        orthogonalPoints.push(x2, y2);        // Second horizontal segment
      } else {
        // Vertical distance is larger - use 3-segment vertical-first routing
        const midY = y1 + dy / 2;
        orthogonalPoints.push(x1, midY);      // First vertical segment
        orthogonalPoints.push(x2, midY);      // Horizontal segment
        orthogonalPoints.push(x2, y2);        // Second vertical segment
      }
    }
  }

  return orthogonalPoints;
}