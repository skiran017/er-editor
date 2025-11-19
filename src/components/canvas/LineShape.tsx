import React, { useRef } from "react";
import { Circle, Line, Group } from "react-konva";
import type { LineShape as LineShapeType } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import Konva from "konva";

interface LineShapeProps {
	line: LineShapeType;
}

export const LineShapeComponent: React.FC<LineShapeProps> = ({ line }) => {
	const groupRef = useRef<Konva.Group>(null);
	const lineRef = useRef<Konva.Line>(null);
	const updateLine = useEditorStore((state) => state.updateLine);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const { id, points, selected, strokeWidth, position } = line;

	// Convert absolute points to relative points for the group
	const relativePoints = points.map((point, index) => {
		if (index % 2 === 0) {
			// x coordinate - relative to position.x
			return point - position.x;
		} else {
			// y coordinate - relative to position.y
			return point - position.y;
		}
	});

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
	};

	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		const group = e.target as Konva.Group;
		const newX = group.x();
		const newY = group.y();
		const deltaX = newX - position.x;
		const deltaY = newY - position.y;

		// Only update if there's actual movement
		if (deltaX !== 0 || deltaY !== 0) {
			// Update points by adding the drag delta
			const newPoints = points.map((point, index) => {
				if (index % 2 === 0) {
					// x coordinate
					return point + deltaX;
				} else {
					// y coordinate
					return point + deltaY;
				}
			});

			updateLine(id, {
				position: {
					x: newX,
					y: newY,
				},
				points: newPoints,
			});
		}
	};

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		const group = e.target as Konva.Group;
		const deltaX = group.x() - position.x;
		const deltaY = group.y() - position.y;

		// Update points by adding the drag delta
		const newPoints = points.map((point, index) => {
			if (index % 2 === 0) {
				// x coordinate
				return point + deltaX;
			} else {
				// y coordinate
				return point + deltaY;
			}
		});

		updateLine(id, {
			position: {
				x: group.x(),
				y: group.y(),
			},
			points: newPoints,
		});
	};

	const handleTransformEnd = () => {
		const node = lineRef.current;
		if (!node) return;

		// Get the transformed scale
		const scaleX = node.scaleX();
		const scaleY = node.scaleY();

		// Scale the relative points (not absolute points)
		const newRelativePoints = relativePoints.map((point, index) => {
			return index % 2 === 0 ? point * scaleX : point * scaleY;
		});

		// Reset scale
		node.scaleX(1);
		node.scaleY(1);

		// Convert back to absolute points for storage
		const newAbsolutePoints = newRelativePoints.map((point, index) => {
			if (index % 2 === 0) {
				return point + position.x;
			} else {
				return point + position.y;
			}
		});

		updateLine(id, {
			points: newAbsolutePoints,
		});
	};

	return (
		<Group
			ref={groupRef}
			id={id}
			x={position.x}
			y={position.y}
			draggable={mode === "select"}
			onClick={handleClick}
			onDragMove={handleDragMove}
			onDragEnd={handleDragEnd}
		>
			<Line
				ref={lineRef}
				points={relativePoints}
				stroke={selected ? "#3b82f6" : "black"}
				strokeWidth={strokeWidth}
				lineCap="round"
				lineJoin="round"
				onTransformEnd={handleTransformEnd}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>

			{/* Endpoint handles when selected */}
			{selected && mode === "select" && relativePoints.length >= 4 && (
				<>
					{/* Start point handle */}
					<Circle
						x={relativePoints[0]}
						y={relativePoints[1]}
						radius={8}
						fill="white"
						stroke="#3b82f6"
						strokeWidth={2}
						draggable
						onDragMove={(e) => {
							const newRelativePoints = [...relativePoints];
							newRelativePoints[0] = e.target.x();
							newRelativePoints[1] = e.target.y();
							// Convert back to absolute points
							const newAbsolutePoints = newRelativePoints.map(
								(point, index) => {
									if (index % 2 === 0) {
										return point + position.x;
									} else {
										return point + position.y;
									}
								}
							);
							updateLine(id, { points: newAbsolutePoints });
						}}
					/>

					{/* End point handle */}
					<Circle
						x={relativePoints[2]}
						y={relativePoints[3]}
						radius={8}
						fill="white"
						stroke="#3b82f6"
						strokeWidth={2}
						draggable
						onDragMove={(e) => {
							const newRelativePoints = [...relativePoints];
							newRelativePoints[2] = e.target.x();
							newRelativePoints[3] = e.target.y();
							// Convert back to absolute points
							const newAbsolutePoints = newRelativePoints.map(
								(point, index) => {
									if (index % 2 === 0) {
										return point + position.x;
									} else {
										return point + position.y;
									}
								}
							);
							updateLine(id, { points: newAbsolutePoints });
						}}
					/>
				</>
			)}
		</Group>
	);
};
