import React, { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import type { Entity, ConnectionPoint } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getClosestEdge } from "../../lib/utils";
import Konva from "konva";

interface EntityShapeProps {
	entity: Entity;
}

export const EntityShape: React.FC<EntityShapeProps> = ({ entity }) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateEntity = useEditorStore((state) => state.updateEntity);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const { id, name, position, size, selected, isWeak, rotation = 0 } = entity;

	// Handle drag move (update position in real-time for smooth dragging)
	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateEntity(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	// Handle drag end
	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
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

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "connect") {
			e.cancelBubble = true;
			const stage = e.target.getStage();
			if (!stage) return;

			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			const transform = stage.getAbsoluteTransform().copy();
			transform.invert();
			const pos = transform.point(pointer);

			if (!drawingConnection.isDrawing) {
				// Start connection
				const edge = getClosestEdge(pos, entity) as ConnectionPoint;
				// Calculate the actual connection point position
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
					const toEdge = getClosestEdge(pos, entity) as ConnectionPoint;
					addConnection(
						drawingConnection.fromId,
						id,
						drawingConnection.fromPoint || "right",
						toEdge,
						drawingConnection.waypoints,
						"straight"
					);
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
			onDblClick={handleDblClick}
		>
			{/* Outer rectangle for weak entities (double border) */}
			{isWeak && (
				<Rect
					x={-5}
					y={-5}
					width={size.width + 10}
					height={size.height + 10}
					stroke="black"
					strokeWidth={1}
				/>
			)}

			{/* Main entity rectangle */}
			<Rect
				width={size.width}
				height={size.height}
				fill="white"
				stroke={selected ? "#3b82f6" : "black"}
				strokeWidth={selected ? 3 : 2}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>

			{/* Entity name */}
			<Text
				text={name}
				width={size.width}
				align="center"
				verticalAlign="middle"
				y={size.height / 2 - 10}
				fontSize={16}
				fontStyle="bold"
				fill="black"
			/>
		</Group>
	);
};
