import React, { useState, useEffect } from "react";
import { Group, Line } from "react-konva";
import type { Generalization } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { convertToOrthogonalPath } from "../../lib/utils";
import Konva from "konva";

interface GeneralizationLinesProps {
	generalization: Generalization;
	dragPreviewPositions?: Record<string, { x: number; y: number }>;
}

/** Draws connection lines from parent/children to the ISA triangle (in stage coordinates) */
export const GeneralizationLines: React.FC<GeneralizationLinesProps> = ({
	generalization,
	dragPreviewPositions = {},
}) => {
	const selectElement = useEditorStore((state) => state.selectElement);
	const mode = useEditorStore((state) => state.mode);
	const entities = useEditorStore((state) => state.diagram.entities);

	const { id, position, size, selected, parentId, childIds, isTotal } =
		generalization;

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

	const parentEntity = entities.find((e) => e.id === parentId);
	const childEntities = childIds
		.map((cid) => entities.find((e) => e.id === cid))
		.filter((e): e is NonNullable<typeof e> => !!e);

	// Use preview positions during group drag for real-time line updates
	const effectiveGenPosition =
		id in dragPreviewPositions ? dragPreviewPositions[id] : position;
	const effectiveParentPosition =
		parentEntity && parentId in dragPreviewPositions
			? dragPreviewPositions[parentId]
			: parentEntity?.position;
	const effectiveChildPositions = childEntities.map((c) =>
		c.id in dragPreviewPositions ? dragPreviewPositions[c.id] : c.position
	);

	const strokeColor = selected ? "#3b82f6" : colors.stroke;
	const strokeWidth = selected ? 3 : 2;

	// Triangle geometry in stage coordinates
	// Java app: parent connects to apex (top), children to base (bottom)
	const apexX = effectiveGenPosition.x + size.width / 2;
	const apexY = effectiveGenPosition.y;
	const baseY = effectiveGenPosition.y + size.height;
	const baseLeft = effectiveGenPosition.x;
	const baseRight = effectiveGenPosition.x + size.width;

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
		e.cancelBubble = true;
	};

	// Parent connection: orthogonal path (parent bottom -> triangle top)
	const parentCenterX =
		effectiveParentPosition && parentEntity
			? effectiveParentPosition.x + parentEntity.size.width / 2
			: 0;
	const parentBottomY =
		effectiveParentPosition && parentEntity
			? effectiveParentPosition.y + parentEntity.size.height
			: 0;
	const parentLinePoints = parentEntity && effectiveParentPosition
		? convertToOrthogonalPath(
				[parentCenterX, parentBottomY, apexX, apexY],
				"bottom",
				"top",
			)
		: [];
	const parentLinePointsOffset =
		parentEntity && effectiveParentPosition
			? convertToOrthogonalPath(
					[parentCenterX + 4, parentBottomY, apexX + 4, apexY],
					"bottom",
					"top",
				)
			: [];

	return (
		<Group listening={true}>
			{/* Line(s) from parent bottom to triangle apex (top) - orthogonal routing */}
			{parentEntity && effectiveParentPosition && (
				<>
					<Line
						points={parentLinePoints}
						stroke={strokeColor}
						strokeWidth={strokeWidth}
						hitStrokeWidth={10}
						lineCap="round"
						lineJoin="round"
						onClick={handleClick}
					/>
					{isTotal && (
						<Line
							points={parentLinePointsOffset}
							stroke={strokeColor}
							strokeWidth={strokeWidth}
							hitStrokeWidth={10}
							lineCap="round"
							lineJoin="round"
							onClick={handleClick}
						/>
					)}
				</>
			)}

			{/* Child connections: single child = direct line, multiple = horizontal bar + verticals */}
			{childEntities.length === 1 && (
				<Line
					points={convertToOrthogonalPath(
						[
							apexX,
							baseY,
							effectiveChildPositions[0].x +
								childEntities[0].size.width / 2,
							effectiveChildPositions[0].y,
						],
						"bottom",
						"top",
					)}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					hitStrokeWidth={10}
					lineCap="round"
					lineJoin="round"
					onClick={handleClick}
				/>
			)}
			{childEntities.length > 1 && (
				<>
					{/* Horizontal bar at base - extends to cover children */}
					{(() => {
						const childCenterXs = childEntities.map(
							(c, i) =>
								effectiveChildPositions[i].x + c.size.width / 2,
						);
						const barLeft = Math.min(baseLeft, ...childCenterXs) - 2;
						const barRight = Math.max(baseRight, ...childCenterXs) + 2;
						return (
							<Line
								points={[barLeft, baseY, barRight, baseY]}
								stroke={strokeColor}
								strokeWidth={strokeWidth}
								hitStrokeWidth={10}
								lineCap="round"
								onClick={handleClick}
							/>
						);
					})()}

					{/* Vertical lines from each child top to base bar */}
					{childEntities.map((child, i) => {
						const childCenterX =
							effectiveChildPositions[i].x + child.size.width / 2;
						const childTopY = effectiveChildPositions[i].y;
						return (
							<Line
								key={child.id}
								points={[childCenterX, childTopY, childCenterX, baseY]}
								stroke={strokeColor}
								strokeWidth={strokeWidth}
								hitStrokeWidth={10}
								lineCap="round"
								lineJoin="round"
								onClick={handleClick}
							/>
						);
					})}
				</>
			)}
		</Group>
	);
};
