import React, { useRef, useEffect, useState } from "react";
import { Group, Line, Text } from "react-konva";
import type { Relationship, ConnectionPoint } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getClosestEdge, getBestAvailableEdge } from "../../lib/utils";
import { getThemeColorsSync } from "../../lib/themeColors";
import Konva from "konva";

interface RelationshipShapeProps {
	relationship: Relationship;
}

export const RelationshipShape: React.FC<RelationshipShapeProps> = ({
	relationship,
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const textRef = useRef<Konva.Text>(null);
	const [isEditing, setIsEditing] = useState(false);
	const updateRelationship = useEditorStore(
		(state) => state.updateRelationship
	);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const diagram = useEditorStore((state) => state.diagram);

	const {
		id,
		name,
		position,
		selected,
		size,
		isWeak,
		rotation = 0,
	} = relationship;

	const selectedIds = useEditorStore((state) => state.selectedIds);
	const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(id);

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

	// Diamond dimensions
	const width = size.width;
	const height = size.height;

	// Handle drag move (update position in real-time for smooth dragging)
	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		// If multiple items are selected, let ERCanvas handle it
		if (isMultiSelect) {
			return;
		}
		updateRelationship(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	// Handle drag end
	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		// If multiple items are selected, let ERCanvas handle it
		if (isMultiSelect) {
			return;
		}
		updateRelationship(id, {
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

		updateRelationship(id, {
			size: {
				width: Math.max(60, size.width * scaleX),
				height: Math.max(40, size.height * scaleY),
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

			// Get the click position relative to the relationship's group (accounts for rotation)
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

			// For edge detection, use position relative to the relationship's unrotated bounding box
			// Since the relationship is at (0, 0) relative to the group, we can use groupRelativePos directly
			const relationshipRelativePos = {
				x: groupRelativePos.x,
				y: groupRelativePos.y,
			};

			// Create a temporary element object for getClosestEdge (relative to relationship origin)
			const tempElement = {
				position: { x: 0, y: 0 },
				size: relationship.size,
			};

			if (!drawingConnection.isDrawing) {
				// Start connection - use relationship-relative position to determine edge
				const edge = getClosestEdge(
					relationshipRelativePos,
					tempElement
				) as ConnectionPoint;
				// Calculate the actual connection point position in stage coordinates
				const centerX = relationship.position.x + relationship.size.width / 2;
				const centerY = relationship.position.y + relationship.size.height / 2;
				let connectionPoint: { x: number; y: number };
				switch (edge) {
					case "top":
						connectionPoint = { x: centerX, y: relationship.position.y };
						break;
					case "right":
						connectionPoint = {
							x: relationship.position.x + relationship.size.width,
							y: centerY,
						};
						break;
					case "bottom":
						connectionPoint = {
							x: centerX,
							y: relationship.position.y + relationship.size.height,
						};
						break;
					case "left":
						connectionPoint = { x: relationship.position.x, y: centerY };
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

						// Calculate the center of the current relationship (toRelationship)
						const toCenter = {
							x: relationship.position.x + relationship.size.width / 2,
							y: relationship.position.y + relationship.size.height / 2,
						};

						// For relationships, use edge distribution to avoid overlapping connections
						// Determine which edge of the current relationship (toRelationship) is best available
						const toEdge = getBestAvailableEdge(
							id,
							diagram.connections,
							fromCenter,
							relationship
						) as ConnectionPoint;

						// For entities connecting to relationship, use closest edge
						// For relationships connecting to entities, use closest edge
						const fromEdge = getClosestEdge(
							toCenter,
							fromElement
						) as ConnectionPoint;

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
							relationshipRelativePos,
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
		const input = document.createElement('input');
		input.value = name;
		input.style.position = 'absolute';
		input.style.top = `${stageBox.top + textPosition.y + height / 2 - 15}px`;
		input.style.left = `${stageBox.left + textPosition.x}px`;
		input.style.width = `${width}px`;
		input.style.height = '30px';
		input.style.fontSize = '14px';
		input.style.fontWeight = 'bold';
		input.style.textAlign = 'center';
		input.style.border = '2px solid #3b82f6';
		input.style.borderRadius = '4px';
		input.style.padding = '4px';
		input.style.zIndex = '1000';
		input.style.backgroundColor = 'white';
		
		document.body.appendChild(input);
		input.focus();
		input.select();

		const removeInput = () => {
			document.body.removeChild(input);
			setIsEditing(false);
		};

		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				updateRelationship(id, { name: input.value });
				removeInput();
			} else if (e.key === 'Escape') {
				removeInput();
			}
		});

		input.addEventListener('blur', () => {
			updateRelationship(id, { name: input.value });
			removeInput();
		});
	};

	// Diamond points: top, right, bottom, left
	const points = [
		width / 2,
		0, // Top
		width,
		height / 2, // Right
		width / 2,
		height, // Bottom
		0,
		height / 2, // Left
	];

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
			{/* Outer diamond for weak relationships (double border) */}
			{isWeak && (
				<Line
					points={[
						width / 2,
						-5, // Top (offset outward)
						width + 5,
						height / 2, // Right (offset outward)
						width / 2,
						height + 5, // Bottom (offset outward)
						-5,
						height / 2, // Left (offset outward)
					]}
					closed
					fill="transparent"
					stroke={selected ? "#3b82f6" : colors.stroke}
					strokeWidth={selected ? 3 : 2}
				/>
			)}

			{/* Diamond shape */}
			<Line
				points={points}
				closed
				fill={colors.fill}
				stroke={selected ? "#3b82f6" : colors.stroke}
				strokeWidth={selected ? 3 : 2}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
				onClick={handleClick}
				onTap={handleTap}
			/>

			{/* Relationship name */}
			<Text
				ref={textRef}
				text={name}
				width={width}
				height={height}
				align="center"
				verticalAlign="middle"
				fontSize={14}
				fontStyle="bold"
				fill={colors.text}
				onClick={handleClick}
				onTap={handleTap}
				listening={!isEditing}
			/>

			{/* Selection indicator */}
			{selected && (
				<Line
					points={points}
					closed
					stroke="#3b82f6"
					strokeWidth={1}
					dash={[5, 5]}
				/>
			)}
		</Group>
	);
};
