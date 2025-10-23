import React, { useRef } from "react";
import { Arrow } from "react-konva";
import type { ArrowShape as ArrowShapeType } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import Konva from "konva";

interface ArrowShapeProps {
	arrow: ArrowShapeType;
}

export const ArrowShapeComponent: React.FC<ArrowShapeProps> = ({ arrow }) => {
	const arrowRef = useRef<Konva.Arrow>(null);
	const updateArrow = useEditorStore((state) => state.updateArrow);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const {
		id,
		type,
		points,
		selected,
		strokeWidth,
		pointerLength,
		pointerWidth,
	} = arrow;

	// Determine if arrow points left or right
	const isLeftArrow = type === "arrow-left";

	// For left arrow, we need to reverse the points so the arrow head is at the start
	const displayPoints = isLeftArrow ? [...points].reverse() : points;

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
	};

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		const node = e.target;
		updateArrow(id, {
			position: {
				x: node.x(),
				y: node.y(),
			},
		});
	};

	const handleTransformEnd = () => {
		const node = arrowRef.current;
		if (!node) return;

		const scaleX = node.scaleX();
		const scaleY = node.scaleY();

		// Scale the points
		const newPoints = points.map((point, index) => {
			return index % 2 === 0 ? point * scaleX : point * scaleY;
		});

		// Reset scale
		node.scaleX(1);
		node.scaleY(1);

		updateArrow(id, {
			points: newPoints,
		});
	};

	return (
		<Arrow
			ref={arrowRef}
			id={id}
			points={displayPoints}
			stroke={selected ? "#3b82f6" : "black"}
			fill={selected ? "#3b82f6" : "black"}
			strokeWidth={strokeWidth}
			pointerLength={pointerLength}
			pointerWidth={pointerWidth}
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
