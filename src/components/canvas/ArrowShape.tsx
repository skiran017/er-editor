import React, { useRef, useEffect, useState } from "react";
import { Arrow, Group } from "react-konva";
import type { ArrowShape as ArrowShapeType } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import Konva from "konva";

interface ArrowShapeProps {
	arrow: ArrowShapeType;
}

export const ArrowShapeComponent: React.FC<ArrowShapeProps> = ({ arrow }) => {
	const groupRef = useRef<Konva.Group>(null);
	const arrowRef = useRef<Konva.Arrow>(null);
	const updateArrow = useEditorStore((state) => state.updateArrow);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const {
		id,
		points,
		selected,
		strokeWidth,
		pointerLength,
		pointerWidth,
		position,
	} = arrow;

	// Get theme-aware colors
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

	// Convert absolute points to relative points for the group
	// Note: Points are already stored in the correct order (reversed for left arrows in store)
	// So we don't need to reverse here - Konva Arrow always puts arrowhead at the end
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

			updateArrow(id, {
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

		updateArrow(id, {
			position: {
				x: group.x(),
				y: group.y(),
			},
			points: newPoints,
		});
	};

	const handleTransformEnd = () => {
		const node = arrowRef.current;
		if (!node) return;

		// Get the transformed scale
		const scaleX = node.scaleX();
		const scaleY = node.scaleY();

		// For arrows, we need to work with the original relative points (before reversal for display)
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

		updateArrow(id, {
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
			<Arrow
				ref={arrowRef}
				points={relativePoints}
				stroke={selected ? "#3b82f6" : colors.stroke}
				fill={selected ? "#3b82f6" : colors.stroke}
				strokeWidth={strokeWidth}
				pointerLength={pointerLength}
				pointerWidth={pointerWidth}
				lineCap="round"
				lineJoin="round"
				onTransformEnd={handleTransformEnd}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>
		</Group>
	);
};
