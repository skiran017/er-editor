import React, { useRef, useEffect, useState } from "react";
import { Group, Ellipse, Text, Line } from "react-konva";
import type { Attribute } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { getClosestEdge } from "../../lib/utils";
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

	// Calculate connection points dynamically based on closest edges
	// This ensures the line adjusts when either the parent or attribute moves
	// Note: In Konva, the Group is at (position.x, position.y) and Ellipse is centered at (0,0) within group
	// So the actual ellipse center in absolute coordinates is (position.x, position.y)
	const attributeCenter = {
		x: position.x,
		y: position.y,
	};
	const parentCenter = {
		x: parentElement.position.x + parentElement.size.width / 2,
		y: parentElement.position.y + parentElement.size.height / 2,
	};

	// Find closest edge on parent element
	const parentEdge = getClosestEdge(attributeCenter, {
		position: parentElement.position,
		size: parentElement.size,
	});

	// Find closest edge on attribute (simplified - attributes are ovals, so we use center-relative calculation)
	// For attributes, we'll connect from the side closest to the parent
	const attributeEdge = getClosestEdge(parentCenter, {
		position: { x: position.x, y: position.y },
		size: { width: ellipseWidth, height: ellipseHeight },
	});

	// Calculate actual connection point positions
	const getConnectionPoint = (
		elem: {
			position: { x: number; y: number };
			size: { width: number; height: number };
		},
		edge: "top" | "right" | "bottom" | "left",
		isAttribute: boolean = false,
		targetPoint?: { x: number; y: number } // For ellipse: point we're connecting to
	) => {
		// For attributes (ellipses), the center is at (position.x, position.y) because
		// the Group is at (position.x, position.y) and Ellipse is centered at (0,0) within the group
		// For entities/relationships (rectangles), the center is at position + size/2
		const centerX = isAttribute
			? elem.position.x
			: elem.position.x + elem.size.width / 2;
		const centerY = isAttribute
			? elem.position.y
			: elem.position.y + elem.size.height / 2;

		if (isAttribute && targetPoint) {
			// For attributes (ovals), calculate intersection with ellipse edge
			// In Konva, ellipse center is at (0,0) within the Group, so centerX/centerY = elem.position
			const radiusX = elem.size.width / 2;
			const radiusY = elem.size.height / 2;

			// Calculate direction vector from ellipse center to target point
			const dx = targetPoint.x - centerX;
			const dy = targetPoint.y - centerY;

			// Normalize direction
			const length = Math.sqrt(dx * dx + dy * dy);
			if (length < 0.001) {
				// Fallback to edge-based calculation if points are too close
				switch (edge) {
					case "top":
						return { x: centerX, y: centerY - radiusY };
					case "right":
						return { x: centerX + radiusX, y: centerY };
					case "bottom":
						return { x: centerX, y: centerY + radiusY };
					case "left":
						return { x: centerX - radiusX, y: centerY };
					default:
						return { x: centerX, y: centerY };
				}
			}

			// Find intersection point on ellipse using parametric equation
			// Ellipse centered at (centerX, centerY): ((x-centerX)/radiusX)^2 + ((y-centerY)/radiusY)^2 = 1
			// Line from center to target: x = centerX + t*dx, y = centerY + t*dy
			// Substituting: (t*dx/radiusX)^2 + (t*dy/radiusY)^2 = 1
			// Solving: t^2 * (dx^2/radiusX^2 + dy^2/radiusY^2) = 1
			// Therefore: t = sqrt(1 / (dx^2/radiusX^2 + dy^2/radiusY^2))
			const dxNorm = dx / radiusX;
			const dyNorm = dy / radiusY;
			const t = Math.sqrt(1 / (dxNorm * dxNorm + dyNorm * dyNorm));

			// Return intersection point on ellipse edge
			return {
				x: centerX + t * dx,
				y: centerY + t * dy,
			};
		} else if (isAttribute) {
			// Fallback: use ellipse edge if no target point
			const radiusX = elem.size.width / 2;
			const radiusY = elem.size.height / 2;
			switch (edge) {
				case "top":
					return { x: centerX, y: centerY - radiusY };
				case "right":
					return { x: centerX + radiusX, y: centerY };
				case "bottom":
					return { x: centerX, y: centerY + radiusY };
				case "left":
					return { x: centerX - radiusX, y: centerY };
				default:
					return { x: centerX, y: centerY };
			}
		} else {
			// For entities/relationships (rectangles/diamonds)
			switch (edge) {
				case "top":
					return { x: centerX, y: elem.position.y };
				case "right":
					return { x: elem.position.x + elem.size.width, y: centerY };
				case "bottom":
					return { x: centerX, y: elem.position.y + elem.size.height };
				case "left":
					return { x: elem.position.x, y: centerY };
				default:
					return { x: centerX, y: centerY };
			}
		}
	};

	const parentPoint = getConnectionPoint(parentElement, parentEdge);
	// For ellipse, calculate intersection point on the actual ellipse edge
	const attributePoint = getConnectionPoint(
		{ position, size: { width: ellipseWidth, height: ellipseHeight } },
		attributeEdge,
		true,
		parentPoint // Pass parent point to calculate proper ellipse intersection
	);

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
			{/* Connection line from parent element to attribute - dynamically calculated */}
			<Line
				points={[
					parentPoint.x,
					parentPoint.y,
					attributePoint.x,
					attributePoint.y,
				]}
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
