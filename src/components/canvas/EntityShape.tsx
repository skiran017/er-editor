import React, { useRef } from "react";
import { Group, Rect, Text, Circle } from "react-konva";
import type { Entity } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import Konva from "konva";

interface EntityShapeProps {
	entity: Entity;
}

export const EntityShape: React.FC<EntityShapeProps> = ({ entity }) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateEntity = useEditorStore((state) => state.updateEntity);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const {
		id,
		name,
		position,
		size,
		selected,
		attributes,
		isWeak,
		rotation = 0,
	} = entity;

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

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
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
