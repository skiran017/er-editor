import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Transformer, Line } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../store/editorStore";
import { EntityShape } from "./EntityShape";
import { RelationshipShape } from "./RelationshipShape";
import { LineShapeComponent } from "./LineShape";
import { ArrowShapeComponent } from "./ArrowShape";
import { AttributeShape } from "./AttributeShape";
import { ConnectionShape } from "./ConnectionShape";

export const ERCanvas: React.FC = () => {
	const stageRef = useRef<Konva.Stage>(null);
	const layerRef = useRef<Konva.Layer>(null);
	const transformerRef = useRef<Konva.Transformer>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [stageSize, setStageSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight - 56, // 56px = h-14 toolbar height
	});

	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const lines = useEditorStore((state) => state.diagram.lines);
	const arrows = useEditorStore((state) => state.diagram.arrows);
	const attributes = useEditorStore((state) => state.diagram.attributes);
	const connections = useEditorStore((state) => state.diagram.connections);
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const viewport = useEditorStore((state) => state.viewport);
	const mode = useEditorStore((state) => state.mode);
	const addEntity = useEditorStore((state) => state.addEntity);
	const addRelationship = useEditorStore((state) => state.addRelationship);
	const setZoom = useEditorStore((state) => state.setZoom);
	const setViewportPosition = useEditorStore(
		(state) => state.setViewportPosition
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);
	const addLine = useEditorStore((state) => state.addLine);
	const addArrow = useEditorStore((state) => state.addArrow);
	const addAttribute = useEditorStore((state) => state.addAttribute);
	const updateAttributePosition = useEditorStore(
		(state) => state.updateAttributePosition
	);

	const drawingLine = useEditorStore((state) => state.drawingLine);
	const setDrawingLine = useEditorStore((state) => state.setDrawingLine);
	const drawingConnection = useEditorStore((state) => state.drawingConnection);
	const setDrawingConnection = useEditorStore(
		(state) => state.setDrawingConnection
	);
	// const setMode = useEditorStore((state) => state.setMode);

	// Update transformer when selection changes
	useEffect(() => {
		if (!transformerRef.current || !layerRef.current) return;

		const transformer = transformerRef.current;
		const layer = layerRef.current;

		// Find selected nodes - filter out null/undefined properly
		const selectedNodes = selectedIds
			.map((id) => {
				try {
					return layer.findOne(`#${id}`);
				} catch (err) {
					console.warn(`Could not find node with id: ${id}`);
					console.error(err);
					return null;
				}
			})
			.filter(
				(node): node is Konva.Node => node !== null && node !== undefined
			);

		// Only update if we have valid nodes
		if (selectedNodes.length > 0) {
			try {
				transformer.nodes(selectedNodes);
				transformer.getLayer()?.batchDraw();
			} catch (e) {
				console.error("Error setting transformer nodes:", e);
			}
		} else {
			transformer.nodes([]);
		}
	}, [selectedIds, entities, relationships]);

	// Handle window resize and update stage size based on container
	useEffect(() => {
		const updateStageSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setStageSize({
					width: rect.width,
					height: rect.height,
				});
			}
		};

		// Initial size
		updateStageSize();

		// Resize observer for container size changes
		const resizeObserver = new ResizeObserver(updateStageSize);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Window resize fallback
		window.addEventListener("resize", updateStageSize);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateStageSize);
		};
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
		// Sync viewport position to store
		setViewportPosition(newPos);
		stage.batchDraw();
	};

	// Handle canvas click
	const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		const stage = stageRef.current;
		if (!stage) return;

		const pointer = stage.getPointerPosition();
		if (!pointer) return;

		const transform = stage.getAbsoluteTransform().copy();
		transform.invert();
		const pos = transform.point(pointer);

		// Handle connection drawing mode - only for empty space clicks
		// Entity/Relationship clicks are handled in their respective components
		if (mode === "connect") {
			// Only handle empty space clicks (for waypoints)
			if (e.target === e.target.getStage() && drawingConnection.isDrawing) {
				// Clicked on empty space - add waypoint if in connect mode
				setDrawingConnection(
					true,
					drawingConnection.fromId,
					drawingConnection.fromPoint,
					pos,
					[...drawingConnection.waypoints, pos]
				);
			}
			return;
		}

		// Check if clicking on an entity (for attribute mode)
		if (mode === "attribute") {
			// Find the entity that was clicked on or nearest entity
			let targetEntity = null;
			const clickedNode = e.target;

			// Check if clicking directly on an entity
			if (clickedNode && clickedNode.getType() === "Group") {
				const groupId = clickedNode.id();
				targetEntity = entities.find((e) => e.id === groupId);
			}

			// If not clicking on entity, find nearest entity within reasonable distance
			if (!targetEntity) {
				let minDistance = Infinity;
				const maxDistance = 200; // Maximum distance to consider

				for (const entity of entities) {
					const entityCenterX = entity.position.x + entity.size.width / 2;
					const entityCenterY = entity.position.y + entity.size.height / 2;
					const distance = Math.sqrt(
						Math.pow(pos.x - entityCenterX, 2) +
							Math.pow(pos.y - entityCenterY, 2)
					);

					if (distance < minDistance && distance < maxDistance) {
						minDistance = distance;
						targetEntity = entity;
					}
				}
			}

			if (targetEntity) {
				// Add attribute to the entity
				addAttribute(targetEntity.id, {
					name: "New Attribute",
					isKey: false,
					isMultivalued: false,
					isDerived: false,
				});
				// Update position to clicked position after creation
				// Use a small delay to ensure attribute is created first
				requestAnimationFrame(() => {
					const state = useEditorStore.getState();
					// Find the most recently created attribute for this entity
					const entityAttributes = state.diagram.attributes.filter(
						(a) => a.entityId === targetEntity.id
					);
					if (entityAttributes.length > 0) {
						// Get the last one (most recently added)
						const newAttribute = entityAttributes[entityAttributes.length - 1];
						if (newAttribute && newAttribute.name === "New Attribute") {
							updateAttributePosition(newAttribute.id, pos);
						}
					}
				});
			}
			return;
		}

		if (e.target === e.target.getStage()) {
			if (mode === "entity") {
				addEntity(pos);
			} else if (mode === "relationship") {
				addRelationship(pos);
			} else if (
				mode === "line" ||
				mode === "arrow-left" ||
				mode === "arrow-right"
			) {
				if (!drawingLine.isDrawing) {
					// Start drawing
					setDrawingLine(true, pos, pos);
				} else {
					// Finish drawing
					if (drawingLine.startPoint) {
						if (mode === "line") {
							addLine([
								drawingLine.startPoint.x,
								drawingLine.startPoint.y,
								pos.x,
								pos.y,
							]);
						} else {
							addArrow(mode, [
								drawingLine.startPoint.x,
								drawingLine.startPoint.y,
								pos.x,
								pos.y,
							]);
						}
					}
					setDrawingLine(false, null, null);
				}
			} else {
				clearSelection();
			}
		}
	};

	// Add mouse move handler for preview
	const handleMouseMove = () => {
		const stage = stageRef.current;
		if (!stage) return;

		const pointer = stage.getPointerPosition();
		if (!pointer) return;

		const transform = stage.getAbsoluteTransform().copy();
		transform.invert();
		const pos = transform.point(pointer);

		if (drawingLine.isDrawing && drawingLine.startPoint) {
			// Update current point for line preview
			setDrawingLine(true, drawingLine.startPoint, pos);
		}

		if (drawingConnection.isDrawing && drawingConnection.fromId) {
			// Update current point for connection preview
			setDrawingConnection(
				true,
				drawingConnection.fromId,
				drawingConnection.fromPoint,
				pos,
				drawingConnection.waypoints
			);
		}
	};

	// Initialize stage position from store on mount
	useEffect(() => {
		if (stageRef.current) {
			const currentPos = stageRef.current.position();
			// Only initialize if stage is at default position (0,0)
			if (currentPos.x === 0 && currentPos.y === 0) {
				stageRef.current.position(viewport.position);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div ref={containerRef} className="relative w-full h-full bg-gray-50">
			{/* Grid background */}
			<div className="absolute inset-0 bg-grid-pattern opacity-20" />

			<Stage
				ref={stageRef}
				width={stageSize.width}
				height={stageSize.height}
				scaleX={viewport.scale}
				scaleY={viewport.scale}
				x={viewport.position.x}
				y={viewport.position.y}
				draggable={mode === "pan"}
				onWheel={handleWheel}
				onClick={handleStageClick}
				onMouseMove={handleMouseMove}
				onDragEnd={(e) => {
					if (mode === "pan") {
						const stage = e.target as Konva.Stage;
						setViewportPosition({
							x: stage.x(),
							y: stage.y(),
						});
					}
				}}
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

					{/* Render attributes with connection lines */}
					{attributes.map((attribute) => (
						<AttributeShape key={attribute.id} attribute={attribute} />
					))}

					{/* Render lines */}
					{lines.map((line) => (
						<LineShapeComponent key={line.id} line={line} />
					))}
					{/* Render arrows */}
					{arrows.map((arrow) => (
						<ArrowShapeComponent key={arrow.id} arrow={arrow} />
					))}

					{/* Render connections between entities and relationships - render after other shapes but before preview */}
					{connections.map((connection) => (
						<ConnectionShape key={connection.id} connection={connection} />
					))}

					{/* Preview line while drawing */}
					{drawingLine.isDrawing &&
						drawingLine.startPoint &&
						drawingLine.currentPoint && (
							<Line
								points={[
									drawingLine.startPoint.x,
									drawingLine.startPoint.y,
									drawingLine.currentPoint.x,
									drawingLine.currentPoint.y,
								]}
								stroke="#3b82f6"
								strokeWidth={2}
								dash={[5, 5]}
								lineCap="round"
								listening={false}
							/>
						)}

					{/* Preview connection while drawing - only show if no connection exists yet */}
					{drawingConnection.isDrawing &&
						drawingConnection.fromId &&
						drawingConnection.currentPoint && (
							<>
								{(() => {
									// Get connection point from source element
									const fromElement =
										entities.find((e) => e.id === drawingConnection.fromId) ||
										relationships.find(
											(r) => r.id === drawingConnection.fromId
										);
									if (!fromElement) return null;

									// Calculate connection point position (same logic as store)
									const centerX =
										fromElement.position.x + fromElement.size.width / 2;
									const centerY =
										fromElement.position.y + fromElement.size.height / 2;
									let fromPoint: { x: number; y: number };

									// For relationships (diamonds), connection points are at diamond vertices
									// For entities (rectangles), connection points are at rectangle edges
									// Both use the same calculation since diamonds are rendered within their bounding box
									switch (drawingConnection.fromPoint) {
										case "top":
											fromPoint = { x: centerX, y: fromElement.position.y };
											break;
										case "right":
											fromPoint = {
												x: fromElement.position.x + fromElement.size.width,
												y: centerY,
											};
											break;
										case "bottom":
											fromPoint = {
												x: centerX,
												y: fromElement.position.y + fromElement.size.height,
											};
											break;
										case "left":
											fromPoint = { x: fromElement.position.x, y: centerY };
											break;
										default:
											fromPoint = { x: centerX, y: centerY };
									}

									// Build preview points: from -> waypoints -> current
									const previewPoints: number[] = [fromPoint.x, fromPoint.y];
									drawingConnection.waypoints.forEach((wp) => {
										previewPoints.push(wp.x, wp.y);
									});
									previewPoints.push(
										drawingConnection.currentPoint.x,
										drawingConnection.currentPoint.y
									);

									return (
										<Line
											points={previewPoints}
											stroke="#3b82f6"
											strokeWidth={2}
											dash={[5, 5]}
											lineCap="round"
											lineJoin="round"
											listening={false}
										/>
									);
								})()}
							</>
						)}

					{/* Transformer for resizing and rotating - works for both entities and relationships */}
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
						rotateEnabled={true}
						rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
						keepRatio={false}
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
