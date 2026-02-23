import React, { useRef, useEffect, useState } from "react";
import { Group, Rect, Text, Circle } from "react-konva";
import type { Entity, ConnectionPoint } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { isValidEntityName } from "../../lib/validation";
import {
	getClosestEdge,
	getBestAvailableEdge,
	connectionExists,
} from "../../lib/utils";
import { getThemeColorsSync } from "../../lib/themeColors";
import { showToast } from "../ui/toast";
import Konva from "konva";

interface EntityShapeProps {
	entity: Entity;
	dragPreviewPositions?: Record<string, { x: number; y: number }>;
}

export const EntityShape: React.FC<EntityShapeProps> = ({
	entity,
	dragPreviewPositions = {},
}) => {
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
	const effectivePosition =
		id in dragPreviewPositions ? dragPreviewPositions[id] : position;
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
		(state) => state.setDrawingConnection,
	);
	const addConnection = useEditorStore((state) => state.addConnection);
	const pendingQuickRelationship = useEditorStore(
		(state) => state.pendingQuickRelationship,
	);
	const setPendingQuickRelationship = useEditorStore(
		(state) => state.setPendingQuickRelationship,
	);
	const addRelationshipBetweenEntities = useEditorStore(
		(state) => state.addRelationshipBetweenEntities,
	);
	const pendingQuickGeneralization = useEditorStore(
		(state) => state.pendingQuickGeneralization,
	);
	const setPendingQuickGeneralization = useEditorStore(
		(state) => state.setPendingQuickGeneralization,
	);
	const addGeneralizationBetweenEntities = useEditorStore(
		(state) => state.addGeneralizationBetweenEntities,
	);
	const pendingGeneralizationConnect = useEditorStore(
		(state) => state.pendingGeneralizationConnect,
	);
	const setPendingGeneralizationConnect = useEditorStore(
		(state) => state.setPendingGeneralizationConnect,
	);
	const addChildToGeneralization = useEditorStore(
		(state) => state.addChildToGeneralization,
	);

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
		// Quick relationship (1:1, 1:N, N:N) – click first entity, then second entity
		const isQuickRelationshipMode =
			mode === "relationship-1-1" ||
			mode === "relationship-1-n" ||
			mode === "relationship-n-n";
		if (isQuickRelationshipMode) {
			e.cancelBubble = true;
			if (!pendingQuickRelationship) {
				setPendingQuickRelationship({ firstEntityId: id, mode });
				showToast("Now click the second entity", "info", 2000);
				return;
			}
			if (pendingQuickRelationship.firstEntityId === id) {
				setPendingQuickRelationship(null);
				return;
			}
			const type =
				mode === "relationship-1-1"
					? "1-1"
					: mode === "relationship-1-n"
						? "1-n"
						: "n-n";
			const toastMessage =
				type === "1-1"
					? "1:1 relationship created"
					: type === "1-n"
						? "1:N relationship created"
						: "N:N relationship created";
			addRelationshipBetweenEntities(
				pendingQuickRelationship.firstEntityId,
				id,
				type,
			);
			setPendingQuickRelationship(null);
			showToast(toastMessage, "success");
			return;
		}

		// Quick generalization (ISA) – click parent first, then child
		const isQuickGeneralizationMode =
			mode === "generalization" || mode === "generalization-total";
		if (isQuickGeneralizationMode) {
			e.cancelBubble = true;
			if (!pendingQuickGeneralization) {
				setPendingQuickGeneralization({ firstEntityId: id, mode });
				showToast("Now click the child entity (subclass)", "info", 2000);
				return;
			}
			if (pendingQuickGeneralization.firstEntityId === id) {
				setPendingQuickGeneralization(null);
				return;
			}
			const isTotal = mode === "generalization-total";
			// firstEntityId = parent, id = child
			addGeneralizationBetweenEntities(
				id,
				pendingQuickGeneralization.firstEntityId,
				isTotal,
			);
			setPendingQuickGeneralization(null);
			showToast(
				isTotal ? "Total generalization created" : "Generalization created",
				"success",
			);
			return;
		}

		if (mode === "connect") {
			e.cancelBubble = true;

			// Connect tool: add entity as child to generalization
			if (pendingGeneralizationConnect) {
				const gen = diagram.generalizations?.find(
					(g) => g.id === pendingGeneralizationConnect,
				);
				if (gen) {
					if (gen.childIds.includes(id)) {
						showToast(
							"Entity is already a child of this generalization",
							"warning",
						);
					} else if (gen.parentId === id) {
						showToast(
							"Cannot add parent as child of its own generalization",
							"warning",
						);
					} else {
						addChildToGeneralization(pendingGeneralizationConnect, id);
						setPendingGeneralizationConnect(null);
						showToast("Entity added as subclass", "success");
					}
				} else {
					setPendingGeneralizationConnect(null);
				}
				return;
			}

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
					tempElement,
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
							(r) => r.id === drawingConnection.fromId,
						);

					if (fromElement) {
						// ER rule: two entities must not be connected directly; they must be linked via a relationship
						if (fromElement.type === "entity") {
							showToast(
								"Connect entities through a relationship. Use Relationship 1:1, 1:N, or N:N to link two entities.",
								"warning",
							);
							setDrawingConnection(false, null, null, null, []);
							return;
						}

						// Don't create duplicate connection between same relationship and entity
						if (connectionExists(diagram, drawingConnection.fromId, id)) {
							showToast(
								"A connection already exists between these elements.",
								"warning",
							);
							setDrawingConnection(false, null, null, null, []);
							return;
						}

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
							entity,
						) as ConnectionPoint;

						// For relationships, use edge distribution to avoid overlapping connections
						// For entities, just use closest edge
						let fromEdge: ConnectionPoint;
						if (fromElement.type === "relationship") {
							fromEdge = getBestAvailableEdge(
								drawingConnection.fromId!,
								diagram.connections,
								toCenter,
								fromElement,
							) as ConnectionPoint;
						} else {
							fromEdge = getClosestEdge(
								toCenter,
								fromElement,
							) as ConnectionPoint;
						}

						addConnection(
							drawingConnection.fromId,
							id,
							fromEdge,
							toEdge,
							drawingConnection.waypoints,
							"orthogonal",
						);
					} else {
						// Fallback to old behavior if fromElement not found
						if (connectionExists(diagram, drawingConnection.fromId, id)) {
							showToast(
								"A connection already exists between these elements.",
								"warning",
							);
							setDrawingConnection(false, null, null, null, []);
							return;
						}
						const toEdge = getClosestEdge(
							entityRelativePos,
							tempElement,
						) as ConnectionPoint;
						addConnection(
							drawingConnection.fromId,
							id,
							drawingConnection.fromPoint || "right",
							toEdge,
							drawingConnection.waypoints,
							"orthogonal",
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
			e.cancelBubble = true;
		}
	};

	const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		// Double-click triggers inline text editing
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
			if (input.parentNode === document.body) {
				document.body.removeChild(input);
			}
			setIsEditing(false);
		};

		let isRemoved = false;

		const saveName = () => {
			const newName = input.value.trim();
			if (isValidEntityName(newName)) {
				updateEntity(id, { name: newName });
			}
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				saveName();
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
				saveName();
				isRemoved = true;
				removeInput();
			}
		});
	};

	return (
		<Group
			ref={groupRef}
			id={id}
			x={effectivePosition.x}
			y={effectivePosition.y}
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
