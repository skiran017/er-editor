import React, { useRef } from "react";
import { Group, Line, Text } from "react-konva";
import type { Relationship } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import Konva from "konva";

interface RelationshipShapeProps {
	relationship: Relationship;
}

export const RelationshipShape: React.FC<RelationshipShapeProps> = ({
	relationship,
}) => {
	const groupRef = useRef<Konva.Group>(null);
	const updateRelationship = useEditorStore(
		(state) => state.updateRelationship
	);
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);

	const { id, name, position, selected } = relationship;

	// Diamond dimensions
	const width = 120;
	const height = 80;

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		updateRelationship(id, {
			position: {
				x: e.target.x(),
				y: e.target.y(),
			},
		});
	};

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
	};

	const handleDblClick = () => {
		const newName = prompt("Enter relationship name:", name);
		if (newName) {
			updateRelationship(id, { name: newName });
		}
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
			x={position.x}
			y={position.y}
			draggable={mode === "select"}
			onDragEnd={handleDragEnd}
			onClick={handleClick}
			onDblClick={handleDblClick}
		>
			{/* Diamond shape */}
			<Line
				points={points}
				closed
				fill="white"
				stroke={selected ? "#3b82f6" : "black"}
				strokeWidth={selected ? 3 : 2}
				shadowEnabled={selected}
				shadowBlur={10}
				shadowOpacity={0.3}
			/>

			{/* Relationship name */}
			<Text
				text={name}
				width={width}
				height={height}
				align="center"
				verticalAlign="middle"
				fontSize={14}
				fontStyle="bold"
				fill="black"
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
