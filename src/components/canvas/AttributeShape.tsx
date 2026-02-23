import React, { useRef, useEffect, useState } from "react";
import { Group, Ellipse, Text, Line, Circle } from "react-konva";
import type { Attribute } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { getClosestEdge } from "../../lib/utils";
import Konva from "konva";

interface AttributeShapeProps {
	attribute: Attribute;
	dragPreviewPositions?: Record<string, { x: number; y: number }>;
}

export const AttributeShape: React.FC<AttributeShapeProps> = ({
	attribute,
	dragPreviewPositions = {},
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const textRef = useRef<Konva.Text>(null);
	const [isEditing, setIsEditing] = useState(false);
	const updateAttributePosition = useEditorStore(
		(state) => state.updateAttributePosition,
	);
	const updateAttributeById = useEditorStore(
		(state) => state.updateAttributeById,
	);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const entities = useEditorStore((state) => state.diagram.entities);
	const viewport = useEditorStore((state) => state.viewport);

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
		isDiscriminant,
		isMultivalued,
		isDerived,
		entityId,
		hasWarning,
		warnings,
	} = attribute;
	const [showWarningTooltip, setShowWarningTooltip] = useState(false);
	const warningTooltipRef = useRef<HTMLDivElement | null>(null);

	// Find parent entity or relationship
	const parentEntity = entityId
		? entities.find((e) => e.id === entityId)
		: null;
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const parentRelationship = attribute.relationshipId
		? relationships.find((r) => r.id === attribute.relationshipId)
		: null;
	const parentElement = parentEntity || parentRelationship;

	// Use preview positions during group drag for real-time line updates
	const effectiveParentElement =
		parentElement && parentElement.id in dragPreviewPositions
			? {
					...parentElement,
					position: dragPreviewPositions[parentElement.id],
				}
			: parentElement;
	const effectiveAttributePosition =
		id in dragPreviewPositions ? dragPreviewPositions[id] : position;

	// Calculate ellipse size based on text (needed for tooltip positioning)
	const textWidth = name.length * 8 + 20; // Approximate width
	const ellipseWidth = Math.max(80, textWidth);
	const ellipseHeight = 30;

	// Handle warning tooltip - use requestAnimationFrame to avoid rendering conflicts
	// MUST be called before any early returns (React Hooks rule)
	useEffect(() => {
		if (!hasWarning) {
			if (warningTooltipRef.current) {
				document.body.removeChild(warningTooltipRef.current);
				warningTooltipRef.current = null;
			}
			return;
		}

		if (!showWarningTooltip) {
			if (warningTooltipRef.current) {
				document.body.removeChild(warningTooltipRef.current);
				warningTooltipRef.current = null;
			}
			return;
		}

		// Use requestAnimationFrame to ensure DOM is ready and avoid rendering conflicts
		const rafId = requestAnimationFrame(() => {
			const groupNode = groupRef.current;
			const stage = groupNode?.getStage();
			if (!groupNode || !stage) return;

			// Get absolute screen position of warning badge (accounts for zoom and pan)
			// Badge is at (ellipseWidth / 2 - 10, -ellipseHeight / 2 + 10) relative to the group
			const badgeRelativePos = {
				x: ellipseWidth / 2 - 10,
				y: -ellipseHeight / 2 + 10,
			};
			const badgeAbsolutePos = groupNode.getAbsolutePosition();
			const badgeScreenX = badgeAbsolutePos.x + badgeRelativePos.x;
			const badgeScreenY = badgeAbsolutePos.y + badgeRelativePos.y;

			const stageBox = stage.container().getBoundingClientRect();

			// Create tooltip element
			const tooltip = document.createElement("div");
			tooltip.setAttribute("data-warning-tooltip", "true");
			tooltip.style.position = "absolute";
			tooltip.style.top = `${stageBox.top + badgeScreenY + 20}px`;
			tooltip.style.left = `${stageBox.left + badgeScreenX - 140}px`;
			tooltip.style.backgroundColor = "#fee2e2";
			tooltip.style.border = "1px solid #ef4444";
			tooltip.style.borderRadius = "4px";
			tooltip.style.padding = "8px 12px";
			tooltip.style.zIndex = "1000";
			tooltip.style.maxWidth = "300px";
			tooltip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
			tooltip.style.fontSize = "12px";
			tooltip.style.color = "#991b1b";
			tooltip.style.pointerEvents = "none"; // Don't interfere with canvas
			const currentWarnings = warnings || [];
			tooltip.innerHTML = `<strong>Validation Warnings:</strong><ul style="margin: 4px 0 0 0; padding-left: 20px;">${
				currentWarnings.map((w) => `<li>${w}</li>`).join("") || ""
			}</ul>`;

			document.body.appendChild(tooltip);
			warningTooltipRef.current = tooltip;
		});

		// Update tooltip position if it's already visible and viewport changes
		if (warningTooltipRef.current && showWarningTooltip) {
			const updateRafId = requestAnimationFrame(() => {
				const groupNode = groupRef.current;
				const stage = groupNode?.getStage();
				if (!groupNode || !stage || !warningTooltipRef.current) return;

				const badgeRelativePos = {
					x: ellipseWidth / 2 - 10,
					y: -ellipseHeight / 2 + 10,
				};
				const badgeAbsolutePos = groupNode.getAbsolutePosition();
				const badgeScreenX = badgeAbsolutePos.x + badgeRelativePos.x;
				const badgeScreenY = badgeAbsolutePos.y + badgeRelativePos.y;
				const stageBox = stage.container().getBoundingClientRect();

				warningTooltipRef.current.style.top = `${
					stageBox.top + badgeScreenY + 20
				}px`;
				warningTooltipRef.current.style.left = `${
					stageBox.left + badgeScreenX - 140
				}px`;
			});
			return () => {
				cancelAnimationFrame(rafId);
				cancelAnimationFrame(updateRafId);
				if (warningTooltipRef.current?.parentNode) {
					document.body.removeChild(warningTooltipRef.current);
					warningTooltipRef.current = null;
				}
			};
		}

		return () => {
			cancelAnimationFrame(rafId);
			if (warningTooltipRef.current?.parentNode) {
				document.body.removeChild(warningTooltipRef.current);
				warningTooltipRef.current = null;
			}
		};
	}, [
		hasWarning,
		showWarningTooltip,
		viewport.scale,
		viewport.position.x,
		viewport.position.y,
		ellipseWidth,
		ellipseHeight,
		warnings,
	]);

	// Early returns MUST come after all hooks
	if (!parentEntity && !parentRelationship) {
		return null;
	}

	if (!parentElement) {
		return null;
	}

	// Calculate actual text width for underline (more accurate)
	const actualTextWidth = name.length * 7; // Approximate character width

	// Calculate connection points dynamically based on closest edges
	// Use effective positions (with drag preview) for real-time updates during group drag
	// Note: In Konva, the Group is at (position.x, position.y) and Ellipse is centered at (0,0) within group
	const attributeCenter = {
		x: effectiveAttributePosition.x,
		y: effectiveAttributePosition.y,
	};
	const parentCenter = effectiveParentElement
		? {
				x:
					effectiveParentElement.position.x +
					effectiveParentElement.size.width / 2,
				y:
					effectiveParentElement.position.y +
					effectiveParentElement.size.height / 2,
			}
		: { x: 0, y: 0 };

	// Find closest edge on parent element
	const parentEdge = effectiveParentElement
		? getClosestEdge(attributeCenter, {
				position: effectiveParentElement.position,
				size: effectiveParentElement.size,
			})
		: ("top" as const);

	// Find closest edge on attribute (simplified - attributes are ovals)
	const attributeEdge = getClosestEdge(parentCenter, {
		position: effectiveAttributePosition,
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
		targetPoint?: { x: number; y: number }, // For ellipse: point we're connecting to
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

	const parentPoint = effectiveParentElement
		? getConnectionPoint(effectiveParentElement, parentEdge)
		: { x: 0, y: 0 };
	// For ellipse, calculate intersection point on the actual ellipse edge
	const attributePoint = getConnectionPoint(
		{
			position: effectiveAttributePosition,
			size: { width: ellipseWidth, height: ellipseHeight },
		},
		attributeEdge,
		true,
		parentPoint, // Pass parent point to calculate proper ellipse intersection
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

	const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		// Double-click triggers text editing
		e.cancelBubble = true;
		handleTextDblClick(e);
	};

	const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		e.cancelBubble = true;
		setIsEditing(true);

		// Create HTML input for editing
		const textNode = textRef.current;
		const stage = textNode?.getStage();
		if (!textNode || !stage) return;

		// Get absolute position of text
		const textPosition = textNode.getAbsolutePosition();
		const stageBox = stage.container().getBoundingClientRect();

		// Create input element
		const input = document.createElement("input");
		input.value = name;
		input.style.position = "absolute";
		input.style.top = `${stageBox.top + textPosition.y}px`;
		input.style.left = `${stageBox.left + textPosition.x}px`;
		input.style.width = `${100}px`;
		input.style.height = "24px";
		input.style.fontSize = "12px";
		input.style.textAlign = "center";
		const isDark = document.documentElement.classList.contains("dark");
		input.style.border = isDark ? "2px solid #60a5fa" : "2px solid #3b82f6";
		input.style.borderRadius = "6px";
		input.style.padding = "2px 6px";
		input.style.zIndex = "1000";
		input.style.backgroundColor = isDark ? "#1e293b" : "#ffffff";
		input.style.color = isDark ? "#f1f5f9" : "#1e293b";
		input.style.outline = "none";
		input.style.boxShadow = isDark ? "0 0 0 3px rgba(96,165,250,0.3)" : "0 0 0 3px rgba(59,130,246,0.2)";

		document.body.appendChild(input);
		input.focus();
		input.select();

		const removeInput = () => {
			if (input.parentNode === document.body) {
				document.body.removeChild(input);
			}
			setIsEditing(false);
		};

		let isRemoved = false;

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				updateAttributeById(id, { name: input.value });
				if (!isRemoved) {
					isRemoved = true;
					removeInput();
				}
			} else if (e.key === "Escape") {
				if (!isRemoved) {
					isRemoved = true;
					removeInput();
				}
			}
		});

		input.addEventListener("blur", () => {
			if (!isRemoved) {
				updateAttributeById(id, { name: input.value });
				isRemoved = true;
				removeInput();
			}
		});
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

			{/* Attribute ellipse - use effective position so it stays in sync during group drag */}
			<Group
				ref={groupRef}
				id={id}
				x={effectiveAttributePosition.x}
				y={effectiveAttributePosition.y}
				draggable={mode === "select"}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
				onClick={handleClick}
				onDblClick={handleDblClick}
				hitStrokeWidth={10}
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
					ref={textRef}
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
					listening={!isEditing}
				/>

				{/* Key indicator - solid underline for key attributes */}
				{isKey && !isDiscriminant && (
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

				{/* Discriminant indicator - dashed underline for weak entity discriminants */}
				{isDiscriminant && (
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

				{/* Warning indicator */}
				{hasWarning && (
					<Group
						x={ellipseWidth / 2 - 10}
						y={-ellipseHeight / 2 + 10}
						onMouseEnter={(e) => {
							e.cancelBubble = true;
							setShowWarningTooltip(true);
						}}
						onMouseLeave={(e) => {
							e.cancelBubble = true;
							setShowWarningTooltip(false);
						}}
					>
						<Circle
							radius={8}
							fill="#ef4444"
							stroke="#991b1b"
							strokeWidth={1}
						/>
						<Text
							text="!"
							x={-4}
							y={-6}
							fontSize={12}
							fontStyle="bold"
							fill="white"
							align="center"
							verticalAlign="middle"
						/>
					</Group>
				)}
			</Group>
		</>
	);
};
