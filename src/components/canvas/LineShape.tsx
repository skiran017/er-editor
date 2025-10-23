import React, { useRef } from "react";
import { Line } from "react-konva";
import type { LineShape as LineShapeType } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import Konva from "konva";

interface LineShapeProps {
	line: LineShapeType;
}

export const LineShapeComponent: React.FC<LineShapeProps> = ({ line }) => {
	const lineRef = useRef<Konva.Line>(null);
	const updateLine = useEditorStore((state) => state.updateLine);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const { id, points, selected, strokeWidth } = line;

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
	};

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		const node = e.target;
		updateLine(id, {
			position: {
				x: node.x(),
				y: node.y(),
			},
		});
	};

	const handleTransformEnd = () => {
		const node = lineRef.current;
		if (!node) return;

		// Get the transformed points
		const scaleX = node.scaleX();
		const scaleY = node.scaleY();

		// Scale the points
		const newPoints = points.map((point, index) => {
			return index % 2 === 0 ? point * scaleX : point * scaleY;
		});

		// Reset scale
		node.scaleX(1);
		node.scaleY(1);

		updateLine(id, {
			points: newPoints,
		});
	};

	return (
		<Line
			ref={lineRef}
			id={id}
			points={points}
			stroke={selected ? "#3b82f6" : "black"}
			strokeWidth={strokeWidth}
			lineCap="round"
			lineJoin="round"
			draggable={mode === "select"}
			onClick={handleClick}
			onDragEnd={handleDragEnd}
			onTransformEnd={handleTransformEnd}
			shadowEnabled={selected}
			shadowBlur={10}
			shadowOpacity={0.3}
		/>
	);
};
