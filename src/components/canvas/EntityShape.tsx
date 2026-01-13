import React, { useRef, useEffect, useState } from "react";
import { Group, Rect, Text, Circle } from "react-konva";
import type { Entity, ConnectionPoint } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getClosestEdge, getBestAvailableEdge } from "../../lib/utils";
import { getThemeColorsSync } from "../../lib/themeColors";
import Konva from "konva";

interface EntityShapeProps {
	entity: Entity;
}

export const EntityShape: React.FC<EntityShapeProps> = ({ entity }) => {
	const groupRef = useRef<Konva.Group>(null);
	const textRef = useRef<Konva.Text>(null);
	const [isEditing, setIsEditing] = useState(false);
	const updateEntity = useEditorStore((state) => state.updateEntity);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const diagram = useEditorStore((state) => state.diagram);
	const viewport = useEditorStore((state) => state.viewport);

	const {
		id,
		name,
		position,
		size,
		selected,
		isWeak,
		rotation = 0,
		hasWarning,
		warnings,
	} = entity;
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(id);
	const [showWarningTooltip, setShowWarningTooltip] = useState(false);
	const warningTooltipRef = useRef<HTMLDivElement | null>(null);

	// Get theme-aware colors
	const [colors, setColors] = useState(getThemeColorsSync());
	useEffect(() => {
		const updateColors = () => setColors(getThemeColorsSync());
		updateColors();
		// Listen for theme changes
		const observer = new MutationObserver(updateColors);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	// Handle warning tooltip - use requestAnimationFrame to avoid rendering conflicts
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
			// Badge is at (size.width - 10, 10) relative to the group
			const badgeRelativePos = { x: size.width - 10, y: 10 };
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

				const badgeRelativePos = { x: size.width - 10, y: 10 };
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
			return () => cancelAnimationFrame(updateRafId);
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
		size.width,
		size.height,
		warnings,
	]);

	// Handle drag move (update position in real-time for smooth dragging)
	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		// If multiple items are selected, let transformer handle it
		if (isMultiSelect) {
			return;
		}
		updateEntity(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	// Handle drag end
	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		// If multiple items are selected, let transformer handle it
		if (isMultiSelect) {
			return;
		}
		updateEntity(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	// Handle transform (resize and rotation)
	const handleTransformEnd = () => {
		const node = groupRef.current;
		if (!node) return;

		const scaleX = node.scaleX();
		const scaleY = node.scaleY();
		const newRotation = node.rotation();

		// Reset scale to 1 and update size instead
		node.scaleX(1);
		node.scaleY(1);

		updateEntity(id, {
			size: {
				width: Math.max(50, size.width * scaleX),
				height: Math.max(30, size.height * scaleY),
			},
			rotation: newRotation,
		});
	};

	const drawingConnection = useEditorStore((state) => state.drawingConnection);
	const setDrawingConnection = useEditorStore(
		(state) => state.setDrawingConnection
	);
	const addConnection = useEditorStore((state) => state.addConnection);

	// Handle touch tap events
	const handleTap = (e: Konva.KonvaEventObject<PointerEvent | TouchEvent>) => {
		const mouseEvent = {
			...e,
			evt: {
				...e.evt,
				shiftKey: false,
			},
		} as Konva.KonvaEventObject<MouseEvent>;
		handleClick(mouseEvent);
	};

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "connect") {
			e.cancelBubble = true;
			const stage = e.target.getStage();
			if (!stage) return;

			// Get the click position relative to the entity's group (accounts for rotation)
			const group = groupRef.current;
			if (!group) return;

			// Get pointer position in stage coordinates
			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			// Get group's transform and invert it to get position relative to group
			// This accounts for rotation, scale, and position
			const groupTransform = group.getAbsoluteTransform().copy();
			groupTransform.invert();
			const groupRelativePos = groupTransform.point(pointer);

			// For edge detection, use position relative to the entity's unrotated bounding box
			// Since the entity is at (0, 0) relative to the group, we can use groupRelativePos directly
			const entityRelativePos = {
				x: groupRelativePos.x,
				y: groupRelativePos.y,
			};

			// Create a temporary element object for getClosestEdge (relative to entity origin)
			const tempElement = {
				position: { x: 0, y: 0 },
				size: entity.size,
			};

			if (!drawingConnection.isDrawing) {
				// Start connection - use entity-relative position to determine edge
				const edge = getClosestEdge(
					entityRelativePos,
					tempElement
				) as ConnectionPoint;
				// Calculate the actual connection point position in stage coordinates
				const centerX = entity.position.x + entity.size.width / 2;
				const centerY = entity.position.y + entity.size.height / 2;
				let connectionPoint: { x: number; y: number };
				switch (edge) {
					case "top":
						connectionPoint = { x: centerX, y: entity.position.y };
						break;
					case "right":
						connectionPoint = {
							x: entity.position.x + entity.size.width,
							y: centerY,
						};
						break;
					case "bottom":
						connectionPoint = {
							x: centerX,
							y: entity.position.y + entity.size.height,
						};
						break;
					case "left":
						connectionPoint = { x: entity.position.x, y: centerY };
						break;
					default:
						connectionPoint = { x: centerX, y: centerY };
				}
				setDrawingConnection(true, id, edge, connectionPoint, []);
			} else {
				// Complete connection
				if (drawingConnection.fromId && drawingConnection.fromId !== id) {
					// Find the fromElement (entity or relationship we're connecting from)
					const fromElement =
						diagram.entities.find((e) => e.id === drawingConnection.fromId) ||
						diagram.relationships.find(
							(r) => r.id === drawingConnection.fromId
						);

					if (fromElement) {
						// Calculate the center of the fromElement
						const fromCenter = {
							x: fromElement.position.x + fromElement.size.width / 2,
							y: fromElement.position.y + fromElement.size.height / 2,
						};

						// Calculate the center of the current entity (toEntity)
						const toCenter = {
							x: entity.position.x + entity.size.width / 2,
							y: entity.position.y + entity.size.height / 2,
						};

						// Determine which edge of the current entity (toEntity) is closest to fromElement's center
						const toEdge = getClosestEdge(
							fromCenter,
							entity
						) as ConnectionPoint;

						// For relationships, use edge distribution to avoid overlapping connections
						// For entities, just use closest edge
						let fromEdge: ConnectionPoint;
						if (fromElement.type === "relationship") {
							fromEdge = getBestAvailableEdge(
								drawingConnection.fromId!,
								diagram.connections,
								toCenter,
								fromElement
							) as ConnectionPoint;
						} else {
							fromEdge = getClosestEdge(
								toCenter,
								fromElement
							) as ConnectionPoint;
						}

						addConnection(
							drawingConnection.fromId,
							id,
							fromEdge,
							toEdge,
							drawingConnection.waypoints,
							"orthogonal"
						);
					} else {
						// Fallback to old behavior if fromElement not found
						const toEdge = getClosestEdge(
							entityRelativePos,
							tempElement
						) as ConnectionPoint;
						addConnection(
							drawingConnection.fromId,
							id,
							drawingConnection.fromPoint || "right",
							toEdge,
							drawingConnection.waypoints,
							"orthogonal"
						);
					}
					setDrawingConnection(false, null, null, null, []);
				} else {
					// Cancel
					setDrawingConnection(false, null, null, null, []);
				}
			}
			return;
		}
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
		e.cancelBubble = true;
	};

	const handleDblClick = () => {
		// Double-click now just ensures selection (property panel will show)
		selectElement(id, false);
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
		input.style.width = `${size.width}px`;
		input.style.height = "30px";
		input.style.fontSize = "16px";
		input.style.fontWeight = "bold";
		input.style.textAlign = "center";
		input.style.border = "2px solid #3b82f6";
		input.style.borderRadius = "4px";
		input.style.padding = "4px";
		input.style.zIndex = "1000";
		input.style.backgroundColor = "white";

		document.body.appendChild(input);
		input.focus();
		input.select();

		const removeInput = () => {
			document.body.removeChild(input);
			setIsEditing(false);
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				updateEntity(id, { name: input.value });
				removeInput();
			} else if (e.key === "Escape") {
				removeInput();
			}
		});

		input.addEventListener("blur", () => {
			updateEntity(id, { name: input.value });
			removeInput();
		});
	};

	return (
		<Group
			ref={groupRef}
			id={id}
			x={position.x}
			y={position.y}
			rotation={rotation}
			draggable={mode === "select"}
			onDragMove={handleDragMove}
			onDragEnd={handleDragEnd}
			onTransformEnd={handleTransformEnd}
			onClick={handleClick}
			onTap={handleTap}
			onDblClick={handleDblClick}
		>
			{/* Outer rectangle for weak entities (double border) */}
			{isWeak && (
				<Rect
					x={-5}
					y={-5}
					width={size.width + 10}
					height={size.height + 10}
					stroke={colors.stroke}
					strokeWidth={1}
				/>
			)}

			{/* Main entity rectangle */}
			<Rect
				width={size.width}
				height={size.height}
				fill={colors.fill}
				stroke={selected ? "#3b82f6" : colors.stroke}
				strokeWidth={selected ? 3 : 2}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>

			{/* Entity name */}
			<Text
				ref={textRef}
				text={name}
				width={size.width}
				align="center"
				verticalAlign="middle"
				y={size.height / 2 - 10}
				fontSize={16}
				fontStyle="bold"
				fill={colors.text}
				onDblClick={handleTextDblClick}
				listening={!isEditing}
			/>

			{/* Warning indicator */}
			{hasWarning && (
				<Group
					x={size.width - 10}
					y={10}
					onMouseEnter={(e) => {
						e.cancelBubble = true;
						setShowWarningTooltip(true);
					}}
					onMouseLeave={(e) => {
						e.cancelBubble = true;
						setShowWarningTooltip(false);
					}}
				>
					<Circle radius={8} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
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
	);
};
