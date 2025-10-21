import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../store/editorStore";
import { EntityShape } from "./EntityShape";
import { RelationshipShape } from "./RelationshipShape";

export const ERCanvas: React.FC = () => {
	const stageRef = useRef<Konva.Stage>(null);
	const layerRef = useRef<Konva.Layer>(null);
	const transformerRef = useRef<Konva.Transformer>(null);

	const [stageSize, setStageSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight - 60,
	});

	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const viewport = useEditorStore((state) => state.viewport);
	const mode = useEditorStore((state) => state.mode);
	const addEntity = useEditorStore((state) => state.addEntity);
	const addRelationship = useEditorStore((state) => state.addRelationship);
	const setZoom = useEditorStore((state) => state.setZoom);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	// Update transformer when selection changes
	useEffect(() => {
		if (!transformerRef.current || !layerRef.current) return;

		const transformer = transformerRef.current;
		const layer = layerRef.current;

		// Find selected nodes
		const selectedNodes = selectedIds
			.map((id) => layer.findOne(`#${id}`))
			.filter((node): node is Konva.Node => node !== null);

		if (selectedNodes.length > 0) {
			transformer.nodes(selectedNodes);
			transformer.getLayer()?.batchDraw();
		} else {
			transformer.nodes([]);
		}
	}, [selectedIds]);

	// Handle window resize
	useEffect(() => {
		const handleResize = () => {
			setStageSize({
				width: window.innerWidth,
				height: window.innerHeight - 60,
			});
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Handle zoom with mouse wheel
	const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
		e.evt.preventDefault();

		const stage = stageRef.current;
		if (!stage) return;

		const oldScale = viewport.scale;
		const pointer = stage.getPointerPosition();
		if (!pointer) return;

		const mousePointTo = {
			x: (pointer.x - stage.x()) / oldScale,
			y: (pointer.y - stage.y()) / oldScale,
		};

		const scaleBy = 1.05;
		const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

		setZoom(newScale);

		const newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale,
		};

		stage.position(newPos);
		stage.batchDraw();
	};

	// Handle canvas click
	const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		// Click on empty area
		if (e.target === e.target.getStage()) {
			const stage = stageRef.current;
			if (!stage) return;

			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			// Convert screen coordinates to canvas coordinates
			const transform = stage.getAbsoluteTransform().copy();
			transform.invert();
			const pos = transform.point(pointer);

			if (mode === "entity") {
				addEntity(pos);
			} else if (mode === "relationship") {
				addRelationship(pos);
			} else {
				clearSelection();
			}
		}
	};

	return (
		<div className="relative w-full h-full bg-gray-50">
			{/* Grid background */}
			<div className="absolute inset-0 bg-grid-pattern opacity-20" />

			<Stage
				ref={stageRef}
				width={stageSize.width}
				height={stageSize.height}
				scaleX={viewport.scale}
				scaleY={viewport.scale}
				draggable={mode === "pan"}
				onWheel={handleWheel}
				onClick={handleStageClick}
				className="cursor-crosshair"
			>
				<Layer ref={layerRef}>
					{/* Render entities */}
					{entities.map((entity) => (
						<EntityShape key={entity.id} entity={entity} />
					))}

					{/* Render relationships */}
					{relationships.map((relationship) => (
						<RelationshipShape
							key={relationship.id}
							relationship={relationship}
						/>
					))}

					{/* Transformer for resizing */}
					<Transformer
						ref={transformerRef}
						boundBoxFunc={(oldBox, newBox) => {
							// Limit minimum size
							if (newBox.width < 50 || newBox.height < 30) {
								return oldBox;
							}
							return newBox;
						}}
						enabledAnchors={[
							"top-left",
							"top-right",
							"bottom-left",
							"bottom-right",
						]}
						rotateEnabled={false}
					/>
				</Layer>
			</Stage>

			{/* Zoom indicator */}
			<div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow text-sm">
				{Math.round(viewport.scale * 100)}%
			</div>
		</div>
	);
};
