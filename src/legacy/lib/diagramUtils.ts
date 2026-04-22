import type {
	Diagram,
	Entity,
	Relationship,
	Attribute,
	Connection,
	LineShape,
	ArrowShape,
	Position,
} from "../types";

const generateId = () =>
	`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get bounding box of a diagram (min/max x,y over all positioned elements).
 */
export function getDiagramBounds(diagram: Diagram): {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} {
	let minX = 0;
	let minY = 0;
	let maxX = 0;
	let maxY = 0;
	let hasAny = false;

	function extend(x: number, y: number) {
		if (!hasAny) {
			minX = maxX = x;
			minY = maxY = y;
			hasAny = true;
		} else {
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}

	for (const e of diagram.entities) {
		extend(e.position.x, e.position.y);
		extend(e.position.x + (e.size?.width ?? 150), e.position.y + (e.size?.height ?? 80));
	}
	for (const r of diagram.relationships) {
		extend(r.position.x, r.position.y);
		extend(r.position.x + (r.size?.width ?? 120), r.position.y + (r.size?.height ?? 80));
	}
	for (const g of diagram.generalizations ?? []) {
		extend(g.position.x, g.position.y);
		extend(g.position.x + (g.size?.width ?? 60), g.position.y + (g.size?.height ?? 40));
	}
	for (const a of diagram.attributes) {
		extend(a.position.x, a.position.y);
	}
	for (const c of diagram.connections) {
		for (let i = 0; i < c.points.length; i += 2) {
			extend(c.points[i], c.points[i + 1]);
		}
		for (const wp of c.waypoints ?? []) {
			extend(wp.x, wp.y);
		}
		if (c.labelPosition) extend(c.labelPosition.x, c.labelPosition.y);
	}
	for (const l of diagram.lines) {
		for (let i = 0; i < l.points.length; i += 2) {
			extend(l.points[i], l.points[i + 1]);
		}
	}
	for (const ar of diagram.arrows) {
		for (let i = 0; i < ar.points.length; i += 2) {
			extend(ar.points[i], ar.points[i + 1]);
		}
	}

	if (!hasAny) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	return { minX, minY, maxX, maxY };
}

/**
 * Remap all IDs in a diagram to new unique IDs and update references
 * (entityIds in relationships, entityId/relationshipId in attributes, fromId/toId in connections).
 */
export function remapDiagramIds(diagram: Diagram): Diagram {
	const entityIdMap = new Map<string, string>();
	const relationshipIdMap = new Map<string, string>();
	const attributeIdMap = new Map<string, string>();
	const connectionIdMap = new Map<string, string>();
	const generalizationIdMap = new Map<string, string>();
	const lineIdMap = new Map<string, string>();
	const arrowIdMap = new Map<string, string>();

	const newId = () => generateId();

	const entities: Entity[] = diagram.entities.map((e) => {
		const id = newId();
		entityIdMap.set(e.id, id);
		return {
			...e,
			id,
			attributes: e.attributes.map((attr) => {
				const attrId = newId();
				attributeIdMap.set(attr.id, attrId);
				return { ...attr, id: attrId };
			}),
		};
	});

	const relationships: Relationship[] = diagram.relationships.map((r) => {
		const id = newId();
		relationshipIdMap.set(r.id, id);
		return {
			...r,
			id,
			entityIds: r.entityIds.map((eid) => entityIdMap.get(eid) ?? eid),
			attributes: r.attributes.map((attr) => {
				const attrId = newId();
				attributeIdMap.set(attr.id, attrId);
				return { ...attr, id: attrId };
			}),
			cardinalities: Object.fromEntries(
				Object.entries(r.cardinalities).map(([eid, v]) => [
					entityIdMap.get(eid) ?? eid,
					v,
				])
			),
			participations: Object.fromEntries(
				Object.entries(r.participations).map(([eid, v]) => [
					entityIdMap.get(eid) ?? eid,
					v,
				])
			),
		};
	});

	const attributes: Attribute[] = diagram.attributes.map((a) => {
		const id = newId();
		attributeIdMap.set(a.id, id);
		return {
			...a,
			id,
			entityId: a.entityId ? entityIdMap.get(a.entityId) ?? a.entityId : undefined,
			relationshipId: a.relationshipId
				? relationshipIdMap.get(a.relationshipId) ?? a.relationshipId
				: undefined,
		};
	});

	const connections: Connection[] = diagram.connections.map((c) => {
		const id = newId();
		connectionIdMap.set(c.id, id);
		return {
			...c,
			id,
			fromId: entityIdMap.get(c.fromId) ?? relationshipIdMap.get(c.fromId) ?? c.fromId,
			toId: entityIdMap.get(c.toId) ?? relationshipIdMap.get(c.toId) ?? c.toId,
		};
	});

	const generalizations = (diagram.generalizations ?? []).map((g) => {
		const id = newId();
		generalizationIdMap.set(g.id, id);
		return {
			...g,
			id,
			parentId: entityIdMap.get(g.parentId) ?? g.parentId,
			childIds: g.childIds.map((cid) => entityIdMap.get(cid) ?? cid),
		};
	});

	const lines: LineShape[] = diagram.lines.map((l) => {
		const id = newId();
		lineIdMap.set(l.id, id);
		return { ...l, id };
	});

	const arrows: ArrowShape[] = diagram.arrows.map((a) => {
		const id = newId();
		arrowIdMap.set(a.id, id);
		return { ...a, id };
	});

	return {
		entities,
		relationships,
		connections,
		generalizations,
		lines,
		arrows,
		attributes,
	};
}

/**
 * Apply offset (dx, dy) to all positions and points in a diagram.
 */
export function applyOffsetToDiagram(
	diagram: Diagram,
	dx: number,
	dy: number
): Diagram {
	const offsetPos = (p: Position): Position => ({ x: p.x + dx, y: p.y + dy });

	return {
		entities: diagram.entities.map((e) => ({
			...e,
			position: offsetPos(e.position),
		})),
		relationships: diagram.relationships.map((r) => ({
			...r,
			position: offsetPos(r.position),
		})),
		attributes: diagram.attributes.map((a) => ({
			...a,
			position: offsetPos(a.position),
		})),
		connections: diagram.connections.map((c) => ({
			...c,
			points: c.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
			waypoints: (c.waypoints ?? []).map((wp) => offsetPos(wp)),
			position: offsetPos(c.position),
			labelPosition: c.labelPosition
				? offsetPos(c.labelPosition)
				: undefined,
		})),
		generalizations: (diagram.generalizations ?? []).map((g) => ({
			...g,
			position: offsetPos(g.position),
		})),
		lines: diagram.lines.map((l) => ({
			...l,
			points: l.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
			position: offsetPos(l.position),
		})),
		arrows: diagram.arrows.map((a) => ({
			...a,
			points: a.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
			position: offsetPos(a.position),
		})),
	};
}
