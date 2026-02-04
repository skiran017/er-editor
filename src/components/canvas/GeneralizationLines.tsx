import React, { useState, useEffect } from "react";
import { Group, Line } from "react-konva";
import type { Generalization } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getThemeColorsSync } from "../../lib/themeColors";
import { convertToOrthogonalPath } from "../../lib/utils";
import Konva from "konva";

interface GeneralizationLinesProps {
	generalization: Generalization;
}

/** Draws connection lines from parent/children to the ISA triangle (in stage coordinates) */
export const GeneralizationLines: React.FC<GeneralizationLinesProps> = ({
	generalization,
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

	const strokeColor = selected ? "#3b82f6" : colors.stroke;
	const strokeWidth = selected ? 3 : 2;

	// Triangle geometry in stage coordinates
	// Java app: parent connects to apex (top), children to base (bottom)
	const apexX = position.x + size.width / 2;
	const apexY = position.y; // apex at top - parent connects here
	const baseY = position.y + size.height; // base at bottom - children connect here
	const baseLeft = position.x;
	const baseRight = position.x + size.width;

	const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		if (mode === "select") {
			selectElement(id, e.evt.shiftKey);
		}
		e.cancelBubble = true;
	};

	// Parent connection: orthogonal path (parent bottom -> triangle top)
	const parentCenterX = parentEntity
		? parentEntity.position.x + parentEntity.size.width / 2
		: 0;
	const parentBottomY = parentEntity
		? parentEntity.position.y + parentEntity.size.height
		: 0;
	const parentLinePoints = parentEntity
		? convertToOrthogonalPath(
				[parentCenterX, parentBottomY, apexX, apexY],
				"bottom",
				"top",
			)
		: [];
	const parentLinePointsOffset = parentEntity
		? convertToOrthogonalPath(
				[parentCenterX + 4, parentBottomY, apexX + 4, apexY],
				"bottom",
				"top",
			)
		: [];

	return (
		<Group listening={true}>
			{/* Line(s) from parent bottom to triangle apex (top) - orthogonal routing */}
			{parentEntity && (
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
							childEntities[0].position.x + childEntities[0].size.width / 2,
							childEntities[0].position.y,
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
							(c) => c.position.x + c.size.width / 2,
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
					{childEntities.map((child) => {
						const childCenterX = child.position.x + child.size.width / 2;
						const childTopY = child.position.y;
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
