import React, { useRef, useEffect, useState } from "react";
import { Group, Ellipse, Text, Line } from "react-konva";
import type { Attribute } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import Konva from "konva";

interface AttributeShapeProps {
	attribute: Attribute;
}

export const AttributeShape: React.FC<AttributeShapeProps> = ({
	attribute,
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateAttributePosition = useEditorStore(
		(state) => state.updateAttributePosition
	);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const entities = useEditorStore((state) => state.diagram.entities);

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
		name,
		position,
		selected,
		isKey,
		isPartialKey,
		isMultivalued,
		isDerived,
		entityId,
	} = attribute;

	// Find parent entity or relationship
	const parentEntity = entityId
		? entities.find((e) => e.id === entityId)
		: null;
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const parentRelationship = attribute.relationshipId
		? relationships.find((r) => r.id === attribute.relationshipId)
		: null;

	if (!parentEntity && !parentRelationship) {
		return null;
	}

	const parentElement = parentEntity || parentRelationship;
	if (!parentElement) {
		return null;
	}

	// Calculate ellipse size based on text
	const textWidth = name.length * 8 + 20; // Approximate width
	const ellipseWidth = Math.max(80, textWidth);
	const ellipseHeight = 30;

	// Calculate actual text width for underline (more accurate)
	const actualTextWidth = name.length * 7; // Approximate character width

	// Calculate connection points
	// Parent element right edge to attribute left edge
	const parentRightX = parentElement.position.x + parentElement.size.width;
	const parentRightY = parentElement.position.y + parentElement.size.height / 2;
	const attributeLeftX = position.x;
	const attributeLeftY = position.y + ellipseHeight / 2;

	// Handle drag move
	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateAttributePosition(id, {
			x: e.target.x(),
			y: e.target.y(),
		});
	};

	// Handle drag end
	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateAttributePosition(id, {
			x: e.target.x(),
			y: e.target.y(),
		});
	};

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
	};

	// Determine stroke style based on attribute properties
	let strokeColor = colors.stroke;
	let strokeWidth = 2;
	let strokeDash: number[] | undefined = undefined;

	if (isDerived) {
		strokeDash = [5, 5]; // Dashed for derived
	}

	if (selected) {
		strokeColor = "#3b82f6";
		strokeWidth = 3;
	}

	return (
		<>
			{/* Connection line from parent element to attribute - SOLID line */}
			<Line
				points={[parentRightX, parentRightY, attributeLeftX, attributeLeftY]}
				stroke={selected ? "#3b82f6" : "#6b7280"}
				strokeWidth={selected ? 2 : 1.5}
				lineCap="round"
				listening={false}
			/>

			{/* Attribute ellipse */}
			<Group
				ref={groupRef}
				id={id}
				x={position.x}
				y={position.y}
				draggable={mode === "select"}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
				onClick={handleClick}
			>
				{/* Outer ellipse for multivalued attributes */}
				{isMultivalued && (
					<Ellipse
						radiusX={ellipseWidth / 2 + 3}
						radiusY={ellipseHeight / 2 + 3}
						fill="transparent"
						stroke={strokeColor}
						strokeWidth={strokeWidth}
						dash={strokeDash}
					/>
				)}

				{/* Main ellipse shape */}
				<Ellipse
					radiusX={ellipseWidth / 2}
					radiusY={ellipseHeight / 2}
					fill={colors.fill}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					dash={strokeDash}
					shadowEnabled={selected}
					shadowBlur={10}
					shadowOpacity={0.3}
				/>

				{/* Attribute name - centered inside ellipse */}
				<Text
					text={name}
					x={-ellipseWidth / 2}
					y={-ellipseHeight / 2}
					width={ellipseWidth}
					height={ellipseHeight}
					align="center"
					verticalAlign="middle"
					fontSize={14}
					fill={isKey ? "#f59e0b" : colors.text}
					fontStyle={isKey ? "bold" : "normal"}
				/>

				{/* Key indicator - solid underline for key attributes */}
				{isKey && !isPartialKey && (
					<Line
						points={[
							-actualTextWidth / 2,
							ellipseHeight / 2 - 5,
							actualTextWidth / 2,
							ellipseHeight / 2 - 5,
						]}
						stroke="#f59e0b"
						strokeWidth={2}
					/>
				)}

				{/* Partial key indicator - dashed underline for weak/partial keys */}
				{isPartialKey && (
					<Line
						points={[
							-actualTextWidth / 2,
							ellipseHeight / 2 - 5,
							actualTextWidth / 2,
							ellipseHeight / 2 - 5,
						]}
						stroke="#f59e0b"
						strokeWidth={2}
						dash={[5, 5]}
					/>
				)}
			</Group>
		</>
	);
};
