import React, { useRef } from "react";
import { Group, Line, Text, Circle } from "react-konva";
import type { Connection } from "../../types";
import { useEditorStore } from "../../store/editorStore";
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
	const strokeColor = selected ? "#3b82f6" : "#6b7280";
	const strokeWidth = selected ? 2.5 : 2;

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
							stroke="white"
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
				{/* Label background */}
				<Text
					text={labelText}
					fontSize={12}
					fontStyle="bold"
					fill="white"
					padding={4}
					align="center"
					offsetX={-20}
					offsetY={-8}
				/>
				<Text
					text={labelText}
					fontSize={12}
					fontStyle="bold"
					fill={selected ? "#3b82f6" : "#374151"}
					padding={4}
					align="center"
					offsetX={-20}
					offsetY={-8}
				/>
			</Group>
		</Group>
	);
};
