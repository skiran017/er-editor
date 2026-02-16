import React, { useRef, useEffect, useState } from "react";
import { Group, Line, Circle } from "react-konva";
import type { Connection } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { convertToOrthogonalPath } from "../../lib/utils";
import Konva from "konva";

interface ConnectionShapeProps {
	connection: Connection;
	dragPreviewPositions?: Record<string, { x: number; y: number }>;
}

export const ConnectionShape: React.FC<ConnectionShapeProps> = ({
	connection,
	dragPreviewPositions = {},
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateConnectionWaypoint = useEditorStore(
		(state) => state.updateConnectionWaypoint,
	);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);

	// Get theme-aware colors (must be before early returns)
	const [colors, setColors] = useState(getThemeColorsSync());
	useEffect(() => {
		const updateColors = () => setColors(getThemeColorsSync());
		updateColors();
		const observer = new MutationObserver(updateColors);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	const {
		id,
		selected,
		waypoints,
		cardinality,
		participation,
		fromPoint,
		toPoint,
	} = connection;

	// Find from and to elements
	const fromElement =
		entities.find((e) => e.id === connection.fromId) ||
		relationships.find((r) => r.id === connection.fromId);
	const toElement =
		entities.find((e) => e.id === connection.toId) ||
		relationships.find((r) => r.id === connection.toId);

	if (!fromElement || !toElement) {
		return null;
	}

	// Use preview positions during group drag for real-time line updates
	const effectiveFromElement =
		fromElement.id in dragPreviewPositions
			? { ...fromElement, position: dragPreviewPositions[fromElement.id] }
			: fromElement;
	const effectiveToElement =
		toElement.id in dragPreviewPositions
			? { ...toElement, position: dragPreviewPositions[toElement.id] }
			: toElement;

	// Recalculate connection points based on current element positions
	const getConnectionPointPosition = (
		element: typeof fromElement,
		point: typeof fromPoint,
	) => {
		const centerX = element.position.x + element.size.width / 2;
		const centerY = element.position.y + element.size.height / 2;

		// For relationships (diamonds), use diamond vertices
		if (element.type === "relationship") {
			switch (point) {
				case "top":
					// Top vertex of diamond
					return { x: centerX, y: element.position.y };
				case "right":
					// Right vertex of diamond
					return { x: element.position.x + element.size.width, y: centerY };
				case "bottom":
					// Bottom vertex of diamond
					return { x: centerX, y: element.position.y + element.size.height };
				case "left":
					// Left vertex of diamond
					return { x: element.position.x, y: centerY };
				case "center":
				default:
					return { x: centerX, y: centerY };
			}
		}

		// For entities (rectangles), use rectangle edges
		switch (point) {
			case "top":
				return { x: centerX, y: element.position.y };
			case "right":
				return { x: element.position.x + element.size.width, y: centerY };
			case "bottom":
				return { x: centerX, y: element.position.y + element.size.height };
			case "left":
				return { x: element.position.x, y: centerY };
			case "center":
			default:
				return { x: centerX, y: centerY };
		}
	};

	const fromPos = getConnectionPointPosition(effectiveFromElement, fromPoint);
	const toPos = getConnectionPointPosition(effectiveToElement, toPoint);

	// Build points array: from -> waypoints -> to
	const straightPoints: number[] = [fromPos.x, fromPos.y];
	waypoints.forEach((wp) => {
		straightPoints.push(wp.x, wp.y);
	});
	straightPoints.push(toPos.x, toPos.y);

	// Convert to orthogonal path (horizontal + vertical only) - matches Java app behavior
	// Pass edge information for smart routing (filter out 'center' as it's not a valid edge)
	const points = convertToOrthogonalPath(
		straightPoints,
		fromPoint !== "center" ? fromPoint : undefined,
		toPoint !== "center" ? toPoint : undefined,
	);

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
		e.cancelBubble = true; // Prevent stage click
	};

	const handleWaypointDrag =
		(waypointIndex: number) => (e: Konva.KonvaEventObject<DragEvent>) => {
			const newPos = {
				x: e.target.x(),
				y: e.target.y(),
			};
			updateConnectionWaypoint(id, waypointIndex, newPos);
		};

	// Determine stroke style
	const strokeColor = selected ? "#3b82f6" : colors.stroke;
	const strokeWidth = selected ? 2 : 1.5;
	const isTotalParticipation = participation === "total";

	// Simple approach: just shift all points by a fixed amount
	const getParallelLine = (): number[] => {
		if (points.length < 4) return points;

		const parallelPoints: number[] = [];
		const offset = 5; // Fixed offset in pixels

		// Just shift all points by offset diagonally (right and down)
		for (let i = 0; i < points.length; i += 2) {
			parallelPoints.push(points[i] + offset, points[i + 1] + offset);
		}

		return parallelPoints;
	};

	// Cardinality arrow (Chen notation): solid triangle at ENTITY end, pointing into the entity
	const showCardinalityArrow = cardinality === "1" && points.length >= 4;
	const entityIsToEnd = toElement.type === "entity";
	let arrowTipX: number;
	let arrowTipY: number;
	let arrowAngleDeg: number;
	if (entityIsToEnd) {
		// Entity at "to" end: arrow at end of path, tip pointing toward entity (toPos)
		arrowTipX = points[points.length - 2];
		arrowTipY = points[points.length - 1];
		const prevX = points[points.length - 4];
		const prevY = points[points.length - 3];
		arrowAngleDeg =
			(Math.atan2(arrowTipY - prevY, arrowTipX - prevX) * 180) / Math.PI;
	} else {
		// Entity at "from" end: arrow at start of path, tip pointing toward entity (fromPos)
		arrowTipX = points[0];
		arrowTipY = points[1];
		const nextX = points[2];
		const nextY = points[3];
		// Direction from path (next) toward entity (tip)
		arrowAngleDeg =
			(Math.atan2(arrowTipY - nextY, arrowTipX - nextX) * 180) / Math.PI;
	}
	const arrowLength = 12;
	const arrowWidth = 8;
	// Triangle: tip at (0,0), base at (-arrowLength, ±arrowWidth/2)
	const arrowPoints = [
		0,
		0,
		-arrowLength,
		-arrowWidth / 2,
		-arrowLength,
		arrowWidth / 2,
	];

	return (
		<Group ref={groupRef} listening={true}>
			{/* Main connection line */}
			<Line
				points={points}
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				hitStrokeWidth={10}
				lineCap="round"
				lineJoin="round"
				onClick={handleClick}
				shadowEnabled={selected}
				shadowBlur={5}
				shadowOpacity={0.3}
			/>

			{/* Parallel line for total participation (double line) */}
			{isTotalParticipation && (
				<Line
					points={getParallelLine()}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					lineCap="round"
					lineJoin="round"
					onClick={handleClick}
					hitStrokeWidth={10}
					listening={false}
				/>
			)}

			{/* Cardinality arrow (solid triangle at entity end when cardinality is 1) */}
			{showCardinalityArrow && (
				<Group
					x={arrowTipX}
					y={arrowTipY}
					rotation={arrowAngleDeg}
					listening={false}
				>
					<Line
						points={arrowPoints}
						closed
						fill={strokeColor}
						stroke={strokeColor}
						lineJoin="miter"
					/>
				</Group>
			)}

			{/* Waypoints (draggable intermediate points) */}
			{selected && waypoints.length > 0 && mode === "select" && (
				<>
					{waypoints.map((waypoint, index) => (
						<Circle
							key={`waypoint-${index}`}
							x={waypoint.x}
							y={waypoint.y}
							radius={6}
							fill="#3b82f6"
							stroke={colors.fill}
							strokeWidth={2}
							draggable
							onDragMove={handleWaypointDrag(index)}
							onClick={(e) => {
								e.cancelBubble = true;
							}}
						/>
					))}
				</>
			)}

			{/* Cardinality/participation is conveyed by visual symbols:
			   - Arrow (triangle) at entity end = cardinality "1"
			   - Double line = total participation
			   - Single line = partial participation
			   No text labels needed */}
		</Group>
	);
};
