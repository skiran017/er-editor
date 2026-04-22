import React, { useRef, useEffect, useState } from "react";
import { Group, Line, Text } from "react-konva";
import type { Generalization } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { showToast } from "../ui/toast";
import Konva from "konva";

interface GeneralizationShapeProps {
	generalization: Generalization;
	dragPreviewPositions?: Record<string, { x: number; y: number }>;
}

export const GeneralizationShape: React.FC<GeneralizationShapeProps> = ({
	generalization,
	dragPreviewPositions = {},
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const updateGeneralization = useEditorStore(
		(state) => state.updateGeneralization,
	);
	const setPendingGeneralizationConnect = useEditorStore(
		(state) => state.setPendingGeneralizationConnect,
	);

	const { id, position, size, selected } = generalization;
	const effectivePosition =
		id in dragPreviewPositions ? dragPreviewPositions[id] : position;
	const width = size.width;
	const height = size.height;

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

	// Java app: inverted triangle = apex at BOTTOM (point down), base at TOP (flat)
	// Our triangle was upright (apex up) - flip to match Java
	const apexX = width / 2;
	const apexY = height; // apex at bottom - point faces down
	const baseLeft = 0;
	const baseRight = width;
	const baseY = 0; // base at top

	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateGeneralization(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateGeneralization(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "connect") {
			e.cancelBubble = true;
			setPendingGeneralizationConnect(id);
			showToast("Now click an entity to add as subclass", "info", 2000);
			return;
		}
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
		e.cancelBubble = true;
	};

	const handleTap = (e: Konva.KonvaEventObject<PointerEvent | TouchEvent>) => {
		const mouseEvent = {
			...e,
			evt: { ...e.evt, shiftKey: false },
		} as Konva.KonvaEventObject<MouseEvent>;
		handleClick(mouseEvent);
	};

	// Inverted triangle: apex at bottom, base at top (match Java app)
	const trianglePoints = [apexX, apexY, baseRight, baseY, baseLeft, baseY];

	return (
		<Group
			ref={groupRef}
			id={id}
			x={effectivePosition.x}
			y={effectivePosition.y}
			draggable={mode === "select"}
			onDragMove={handleDragMove}
			onDragEnd={handleDragEnd}
			onClick={handleClick}
			onTap={handleTap}
		>
			{/* ISA triangle - inverted: apex at top, base at bottom (match Java app) */}
			<Line
				points={trianglePoints}
				closed
				fill={colors.fill}
				stroke={selected ? "#3b82f6" : colors.stroke}
				strokeWidth={selected ? 3 : 2}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>

			{/* ISA text */}
			<Text
				text="ISA"
				width={width}
				height={height}
				align="center"
				verticalAlign="middle"
				fontSize={12}
				fontStyle="bold"
				fill={colors.text}
			/>
		</Group>
	);
};
