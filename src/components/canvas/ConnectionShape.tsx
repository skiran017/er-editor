import React, { useRef, useEffect, useState } from "react";
import { Group, Line, Text, Circle } from "react-konva";
import type { Connection } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import Konva from "konva";

interface ConnectionShapeProps {
	connection: Connection;
}

export const ConnectionShape: React.FC<ConnectionShapeProps> = ({
	connection,
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateConnection = useEditorStore((state) => state.updateConnection);
	const updateConnectionWaypoint = useEditorStore(
		(state) => state.updateConnectionWaypoint
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
		labelPosition,
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

	// Recalculate connection points based on current element positions
	const getConnectionPointPosition = (
		element: typeof fromElement,
		point: typeof fromPoint
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

	const fromPos = getConnectionPointPosition(fromElement, fromPoint);
	const toPos = getConnectionPointPosition(toElement, toPoint);

	// Build points array: from -> waypoints -> to
	const points: number[] = [fromPos.x, fromPos.y];
	waypoints.forEach((wp) => {
		points.push(wp.x, wp.y);
	});
	points.push(toPos.x, toPos.y);

	// Calculate label position (default to midpoint if not set)
	const defaultLabelPos = {
		x: (points[0] + points[points.length - 2]) / 2,
		y: (points[1] + points[points.length - 1]) / 2,
	};
	const labelPos = labelPosition || defaultLabelPos;

	// Format label text
	const labelText = `${cardinality} (${participation})`;

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
	const strokeWidth = selected ? 2.5 : 2;
	const isTotalParticipation = participation === "total";

	// Calculate offset points for double line (perpendicular to each segment)
	const getOffsetPoints = (
		originalPoints: number[],
		offset: number
	): number[] => {
		if (originalPoints.length < 4) return originalPoints;

		const offsetPoints: number[] = [];

		// Process each segment
		for (let i = 0; i < originalPoints.length - 2; i += 2) {
			const x1 = originalPoints[i];
			const y1 = originalPoints[i + 1];
			const x2 = originalPoints[i + 2];
			const y2 = originalPoints[i + 3];

			// Calculate direction vector
			const dx = x2 - x1;
			const dy = y2 - y1;
			const length = Math.sqrt(dx * dx + dy * dy);

			if (length > 0.1) {
				// Perpendicular vector (normalized, pointing to the right side)
				const perpX = -dy / length;
				const perpY = dx / length;

				// Apply offset to start point (only for first segment)
				if (i === 0) {
					offsetPoints.push(x1 + perpX * offset, y1 + perpY * offset);
				}
				// Apply offset to end point
				offsetPoints.push(x2 + perpX * offset, y2 + perpY * offset);
			} else {
				// Degenerate segment, just copy points
				if (i === 0) {
					offsetPoints.push(x1, y1);
				}
				offsetPoints.push(x2, y2);
			}
		}

		return offsetPoints;
	};

	const offsetDistance = 3; // Distance between double lines in pixels

	return (
		<Group ref={groupRef} listening={true}>
			{/* Main connection line */}
			<Line
				points={points}
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				lineCap="round"
				lineJoin="round"
				onClick={handleClick}
				shadowEnabled={selected}
				shadowBlur={5}
				shadowOpacity={0.3}
			/>

			{/* Second line for total participation (double line) */}
			{isTotalParticipation && (
				<Line
					points={getOffsetPoints(points, offsetDistance)}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					lineCap="round"
					lineJoin="round"
					onClick={handleClick}
					shadowEnabled={selected}
					shadowBlur={5}
					shadowOpacity={0.3}
				/>
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

			{/* Connection label (cardinality and participation) */}
			<Group
				x={labelPos.x}
				y={labelPos.y}
				draggable={selected && mode === "select"}
				onDragEnd={(e) => {
					updateConnection(id, {
						labelPosition: {
							x: e.target.x(),
							y: e.target.y(),
						},
					});
				}}
				onClick={(e) => {
					e.cancelBubble = true;
				}}
			>
				{/* Label background - use fill color for background */}
				<Text
					text={labelText}
					fontSize={12}
					fontStyle="bold"
					fill={colors.fill}
					padding={4}
					align="center"
					offsetX={-20}
					offsetY={-8}
				/>
				<Text
					text={labelText}
					fontSize={12}
					fontStyle="bold"
					fill={selected ? "#3b82f6" : colors.text}
					padding={4}
					align="center"
					offsetX={-20}
					offsetY={-8}
				/>
			</Group>
		</Group>
	);
};
