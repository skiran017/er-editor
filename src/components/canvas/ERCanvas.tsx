import React, {
	useRef,
	useState,
	useEffect,
	forwardRef,
	useImperativeHandle,
} from "react";
import { Stage, Layer, Transformer, Line, Rect } from "react-konva";
import Konva from "konva";
import { Maximize2 } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { EntityShape } from "./EntityShape";
import { RelationshipShape } from "./RelationshipShape";
import { GeneralizationShape } from "./GeneralizationShape";
import { GeneralizationLines } from "./GeneralizationLines";
import { LineShapeComponent } from "./LineShape";
import { ArrowShapeComponent } from "./ArrowShape";
import { AttributeShape } from "./AttributeShape";
import { ConnectionShape } from "./ConnectionShape";

export interface ERCanvasRef {
	stageRef: React.RefObject<Konva.Stage | null>;
}

export const ERCanvas = forwardRef<ERCanvasRef>((_props, ref) => {
	const stageRef = useRef<Konva.Stage>(null);
	const layerRef = useRef<Konva.Layer>(null);
	const transformerRef = useRef<Konva.Transformer>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const lastPinchDistanceRef = useRef<number | null>(null);
	const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
	const lastTapTimeRef = useRef<number>(0); // Track last tap to prevent double-firing with click
	const isTapDelegatingRef = useRef<boolean>(false); // Flag to bypass tap guard during delegation

	// Long press selection refs for mobile
	const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isLongPressActiveRef = useRef<boolean>(false);
	const longPressEndTimeRef = useRef<number>(0); // Track when long press selection ended
	const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
	const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

	const [selectionBox, setSelectionBox] = useState<{
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null>(null);
	const [isSelecting, setIsSelecting] = useState<boolean>(false);

	const [stageSize, setStageSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight - 56, // 56px = h-14 toolbar height
	});

	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const generalizations = useEditorStore(
		(state) => state.diagram.generalizations,
	);
	const lines = useEditorStore((state) => state.diagram.lines);
	const arrows = useEditorStore((state) => state.diagram.arrows);
	const attributes = useEditorStore((state) => state.diagram.attributes);
	const connections = useEditorStore((state) => state.diagram.connections);
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const viewport = useEditorStore((state) => state.viewport);
	const mode = useEditorStore((state) => state.mode);
	const addEntity = useEditorStore((state) => state.addEntity);
	const updateEntity = useEditorStore((state) => state.updateEntity);
	const addRelationship = useEditorStore((state) => state.addRelationship);
	const updateRelationship = useEditorStore(
		(state) => state.updateRelationship,
	);
	const updateGeneralization = useEditorStore(
		(state) => state.updateGeneralization,
	);
	const setZoom = useEditorStore((state) => state.setZoom);
	const setViewportPosition = useEditorStore(
		(state) => state.setViewportPosition,
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);
	const selectMultiple = useEditorStore((state) => state.selectMultiple);
	const addLine = useEditorStore((state) => state.addLine);
	const addArrow = useEditorStore((state) => state.addArrow);
	const addAttribute = useEditorStore((state) => state.addAttribute);
	const addRelationshipAttribute = useEditorStore(
		(state) => state.addRelationshipAttribute,
	);
	const updateAttributePosition = useEditorStore(
		(state) => state.updateAttributePosition,
	);

	const drawingLine = useEditorStore((state) => state.drawingLine);
	const setDrawingLine = useEditorStore((state) => state.setDrawingLine);
	const drawingConnection = useEditorStore((state) => state.drawingConnection);
	const setDrawingConnection = useEditorStore(
		(state) => state.setDrawingConnection,
	);
	const setPendingQuickRelationship = useEditorStore(
		(state) => state.setPendingQuickRelationship,
	);
	const setPendingGeneralizationConnect = useEditorStore(
		(state) => state.setPendingGeneralizationConnect,
	);
	// const setMode = useEditorStore((state) => state.setMode);

	// Track previous positions for multi-select dragging
	const prevNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(
		new Map(),
	);

	// Preview positions during group drag/transform - use ref + forceUpdate to avoid
	// React batching delay (state updates can be batched, causing lag during transform)
	const dragPreviewPositionsRef = useRef<
		Record<string, { x: number; y: number }>
	>({});
	const [, forceDragPreviewUpdate] = useState({});

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
				(node): node is Konva.Node => node !== null && node !== undefined,
			);

		// Only update if we have valid nodes
		if (selectedNodes.length > 0) {
			try {
				transformer.nodes(selectedNodes);

				// Handle multi-select dragging and resizing
				if (selectedNodes.length > 1) {
					// Store initial positions for all selected nodes
					const initialPositions = new Map<string, { x: number; y: number }>();
					const initialSizes = new Map<
						string,
						{ width: number; height: number }
					>();
					const initialCenter = { x: 0, y: 0 };
					let draggedNode: Konva.Node | null = null;
					let initialDragNodePos: { x: number; y: number } | null = null;
					let initialTransformerBox: {
						x: number;
						y: number;
						width: number;
						height: number;
					} | null = null;

					// Store initial state for transform
					const storeInitialState = () => {
						initialPositions.clear();
						initialSizes.clear();

						// Calculate bounding box of all selected nodes in stage coordinates
						let minX = Infinity;
						let minY = Infinity;
						let maxX = -Infinity;
						let maxY = -Infinity;

						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							const x = node.x();
							const y = node.y();

							// Get size from store
							const entity = entities.find((e) => e.id === nodeId);
							if (entity) {
								const width = entity.size.width;
								const height = entity.size.height;
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x + width);
								maxY = Math.max(maxY, y + height);
								initialSizes.set(nodeId, {
									width: width,
									height: height,
								});
								return;
							}

							const relationship = relationships.find((r) => r.id === nodeId);
							if (relationship) {
								const width = relationship.size.width;
								const height = relationship.size.height;
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x + width);
								maxY = Math.max(maxY, y + height);
								initialSizes.set(nodeId, {
									width: width,
									height: height,
								});
								return;
							}

							const generalization = generalizations?.find(
								(g) => g.id === nodeId,
							);
							if (generalization) {
								const width = generalization.size.width;
								const height = generalization.size.height;
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x + width);
								maxY = Math.max(maxY, y + height);
								initialSizes.set(nodeId, {
									width: width,
									height: height,
								});
								return;
							}

							const attribute = attributes.find((a) => a.id === nodeId);
							if (attribute) {
								// Attributes are points, use a small bounding box
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x);
								maxY = Math.max(maxY, y);
								return;
							}
						});

						// Calculate center from bounding box
						initialCenter.x = (minX + maxX) / 2;
						initialCenter.y = (minY + maxY) / 2;

						// Store initial positions relative to center
						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							initialPositions.set(nodeId, {
								x: node.x() - initialCenter.x,
								y: node.y() - initialCenter.y,
							});
						});

						// Store initial bounding box in stage coordinates
						initialTransformerBox = {
							x: minX,
							y: minY,
							width: maxX - minX,
							height: maxY - minY,
						};
					};

					const handleNodeDragStart = (
						e: Konva.KonvaEventObject<DragEvent>,
					) => {
						draggedNode = e.target as Konva.Node;
						initialDragNodePos = {
							x: draggedNode.x(),
							y: draggedNode.y(),
						};
						dragPreviewPositionsRef.current = {};
						forceDragPreviewUpdate({});

						// Store initial positions of all selected nodes
						initialPositions.clear();
						selectedNodes.forEach((node: Konva.Node) => {
							initialPositions.set(node.id(), {
								x: node.x(),
								y: node.y(),
							});
						});
					};

					const handleNodeDragMove = () => {
						if (!draggedNode || !initialDragNodePos) return;

						const currentX = draggedNode.x();
						const currentY = draggedNode.y();
						const dx = currentX - initialDragNodePos.x;
						const dy = currentY - initialDragNodePos.y;

						// Move all selected nodes by the same delta
						// Include entities, relationships, attributes, generalizations for line updates
						const preview: Record<string, { x: number; y: number }> = {};
						const isEntity = (id: string) => entities.some((e) => e.id === id);
						const isRel = (id: string) =>
							relationships.some((r) => r.id === id);
						const isAttr = (id: string) => attributes.some((a) => a.id === id);
						const isGen = (id: string) =>
							generalizations?.some((g) => g.id === id) ?? false;
						const hasConnections = (id: string) =>
							isEntity(id) || isRel(id) || isAttr(id) || isGen(id);

						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();

							if (node === draggedNode) {
								if (hasConnections(nodeId)) {
									preview[nodeId] = { x: currentX, y: currentY };
								}
								return;
							}
							const initialPos = initialPositions.get(nodeId);
							if (initialPos) {
								const newX = initialPos.x + dx;
								const newY = initialPos.y + dy;
								node.x(newX);
								node.y(newY);
								if (hasConnections(nodeId)) {
									preview[nodeId] = { x: newX, y: newY };
								}
							}
						});
						dragPreviewPositionsRef.current = preview;
						forceDragPreviewUpdate({});
					};

					const handleNodeDragEnd = () => {
						if (!draggedNode) return;

						// Final update to store for all nodes
						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							const finalX = node.x();
							const finalY = node.y();

							// Update entity
							const entity = entities.find((e) => e.id === nodeId);
							if (entity) {
								updateEntity(nodeId, {
									position: { x: finalX, y: finalY },
								});
								return;
							}

							// Update relationship
							const relationship = relationships.find((r) => r.id === nodeId);
							if (relationship) {
								updateRelationship(nodeId, {
									position: { x: finalX, y: finalY },
								});
								return;
							}

							// Update generalization
							const generalization = generalizations?.find(
								(g) => g.id === nodeId,
							);
							if (generalization) {
								updateGeneralization(nodeId, {
									position: { x: finalX, y: finalY },
								});
								return;
							}

							// Update attribute
							const attribute = attributes.find((a) => a.id === nodeId);
							if (attribute) {
								updateAttributePosition(nodeId, {
									x: finalX,
									y: finalY,
								});
								return;
							}
						});

						initialPositions.clear();
						dragPreviewPositionsRef.current = {};
						forceDragPreviewUpdate({});
						draggedNode = null;
						initialDragNodePos = null;
					};

					// Helper to update preview from current node positions (for live line updates during transform)
					const updatePreviewFromNodes = () => {
						const isEntity = (id: string) =>
							entities.some((e) => e.id === id);
						const isRel = (id: string) =>
							relationships.some((r) => r.id === id);
						const isAttr = (id: string) =>
							attributes.some((a) => a.id === id);
						const isGen = (id: string) =>
							generalizations?.some((g) => g.id === id) ?? false;
						const hasConnections = (id: string) =>
							isEntity(id) || isRel(id) || isAttr(id) || isGen(id);

						const preview: Record<string, { x: number; y: number }> = {};
						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							if (hasConnections(nodeId)) {
								preview[nodeId] = { x: node.x(), y: node.y() };
							}
						});
						dragPreviewPositionsRef.current = preview;
						forceDragPreviewUpdate({});
					};

					// Handle transformer transform (resize/rotate)
					const handleTransformStart = () => {
						storeInitialState();
						updatePreviewFromNodes();
					};

					const handleTransform = () => {
						if (!initialTransformerBox) return;

						// Check if this is primarily a rotation (scale hasn't changed much)
						// Get scale from the first node to detect if we're resizing
						const firstNode = selectedNodes[0];
						if (!firstNode) return;

						const currentScaleX = firstNode.scaleX();
						const currentScaleY = firstNode.scaleY();

						// If scale is still 1 (or very close), this is likely just rotation
						// Let the transformer handle rotation naturally, only intervene for resize
						const isResizing =
							Math.abs(currentScaleX - 1) > 0.01 ||
							Math.abs(currentScaleY - 1) > 0.01;

						if (!isResizing) {
							// This is rotation only - still update preview for live line updates
							updatePreviewFromNodes();
							return;
						}

						// This is a resize operation - apply our custom resize logic
						// Calculate current bounding box from nodes in stage coordinates
						let minX = Infinity;
						let minY = Infinity;
						let maxX = -Infinity;
						let maxY = -Infinity;

						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							const x = node.x();
							const y = node.y();

							const initialSize = initialSizes.get(nodeId);
							if (initialSize) {
								const currentWidth = initialSize.width * node.scaleX();
								const currentHeight = initialSize.height * node.scaleY();
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x + currentWidth);
								maxY = Math.max(maxY, y + currentHeight);
							} else {
								// Attribute or point
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x);
								maxY = Math.max(maxY, y);
							}
						});

						const currentBox = {
							x: minX,
							y: minY,
							width: maxX - minX,
							height: maxY - minY,
						};

						const scaleX = currentBox.width / initialTransformerBox.width;
						const scaleY = currentBox.height / initialTransformerBox.height;

						// Calculate new center
						const newCenterX = currentBox.x + currentBox.width / 2;
						const newCenterY = currentBox.y + currentBox.height / 2;

						// Apply scale to all selected nodes
						selectedNodes.forEach((node: Konva.Node) => {
							const nodeId = node.id();
							const relativePos = initialPositions.get(nodeId);
							if (relativePos) {
								// Calculate new position
								const newX = newCenterX + relativePos.x * scaleX;
								const newY = newCenterY + relativePos.y * scaleY;
								node.x(newX);
								node.y(newY);
							}

							// Scale size - apply scale to node (will be reset in transformEnd)
							const initialSize = initialSizes.get(nodeId);
							if (initialSize) {
								// Update scale on node (will be reset in transformEnd)
								node.scaleX(scaleX);
								node.scaleY(scaleY);
							}
						});

						// Update preview so connection lines update in real time during resize
						updatePreviewFromNodes();
					};

					const handleTransformEnd = () => {
						if (!initialTransformerBox) return;

						// Check if this was a resize or rotation
						const firstNode = selectedNodes[0];
						if (!firstNode) return;

						const currentScaleX = firstNode.scaleX();
						const currentScaleY = firstNode.scaleY();
						const isResizing =
							Math.abs(currentScaleX - 1) > 0.01 ||
							Math.abs(currentScaleY - 1) > 0.01;

						if (isResizing) {
							// Handle resize - calculate new sizes and positions
							// Calculate current bounding box from nodes in stage coordinates
							let minX = Infinity;
							let minY = Infinity;
							let maxX = -Infinity;
							let maxY = -Infinity;

							selectedNodes.forEach((node: Konva.Node) => {
								const nodeId = node.id();
								const x = node.x();
								const y = node.y();

								const initialSize = initialSizes.get(nodeId);
								if (initialSize) {
									const currentWidth = initialSize.width * node.scaleX();
									const currentHeight = initialSize.height * node.scaleY();
									minX = Math.min(minX, x);
									minY = Math.min(minY, y);
									maxX = Math.max(maxX, x + currentWidth);
									maxY = Math.max(maxY, y + currentHeight);
								} else {
									// Attribute or point
									minX = Math.min(minX, x);
									minY = Math.min(minY, y);
									maxX = Math.max(maxX, x);
									maxY = Math.max(maxY, y);
								}
							});

							const currentBox = {
								x: minX,
								y: minY,
								width: maxX - minX,
								height: maxY - minY,
							};

							const scaleX = currentBox.width / initialTransformerBox.width;
							const scaleY = currentBox.height / initialTransformerBox.height;

							// Calculate new center
							const newCenterX = currentBox.x + currentBox.width / 2;
							const newCenterY = currentBox.y + currentBox.height / 2;

							// Final update to store for all nodes
							selectedNodes.forEach((node: Konva.Node) => {
								const nodeId = node.id();
								const relativePos = initialPositions.get(nodeId);

								if (relativePos) {
									const finalX = newCenterX + relativePos.x * scaleX;
									const finalY = newCenterY + relativePos.y * scaleY;

									// Update entity
									const entity = entities.find((e) => e.id === nodeId);
									if (entity) {
										const initialSize = initialSizes.get(nodeId);
										updateEntity(nodeId, {
											position: { x: finalX, y: finalY },
											size: initialSize
												? {
														width: Math.max(50, initialSize.width * scaleX),
														height: Math.max(30, initialSize.height * scaleY),
													}
												: entity.size,
										});
										// Reset scale
										node.scaleX(1);
										node.scaleY(1);
										return;
									}

									// Update relationship
									const relationship = relationships.find(
										(r) => r.id === nodeId,
									);
									if (relationship) {
										const initialSize = initialSizes.get(nodeId);
										updateRelationship(nodeId, {
											position: { x: finalX, y: finalY },
											size: initialSize
												? {
														width: Math.max(60, initialSize.width * scaleX),
														height: Math.max(40, initialSize.height * scaleY),
													}
												: relationship.size,
										});
										// Reset scale
										node.scaleX(1);
										node.scaleY(1);
										return;
									}

									// Update generalization
									const generalization = generalizations?.find(
										(g) => g.id === nodeId,
									);
									if (generalization) {
										const initialSize = initialSizes.get(nodeId);
										updateGeneralization(nodeId, {
											position: { x: finalX, y: finalY },
											size: initialSize
												? {
														width: Math.max(40, initialSize.width * scaleX),
														height: Math.max(30, initialSize.height * scaleY),
													}
												: generalization.size,
										});
										// Reset scale
										node.scaleX(1);
										node.scaleY(1);
										return;
									}

									// Update attribute (only position, no size)
									const attribute = attributes.find((a) => a.id === nodeId);
									if (attribute) {
										updateAttributePosition(nodeId, {
											x: finalX,
											y: finalY,
										});
										return;
									}
								}
							});

							// Reset scale on all nodes
							selectedNodes.forEach((node: Konva.Node) => {
								node.scaleX(1);
								node.scaleY(1);
							});
						} else {
							// This was rotation only - update rotation for all nodes
							selectedNodes.forEach((node: Konva.Node) => {
								const nodeId = node.id();
								const newRotation = node.rotation();

								// Update entity
								const entity = entities.find((e) => e.id === nodeId);
								if (entity) {
									updateEntity(nodeId, {
										rotation: newRotation,
									});
									return;
								}

								// Update relationship
								const relationship = relationships.find((r) => r.id === nodeId);
								if (relationship) {
									updateRelationship(nodeId, {
										rotation: newRotation,
									});
									return;
								}

								// Generalizations typically don't rotate
								const generalization = generalizations?.find(
									(g) => g.id === nodeId,
								);
								if (generalization) return;
							});
						}

						initialPositions.clear();
						initialSizes.clear();
						initialTransformerBox = null;
						dragPreviewPositionsRef.current = {};
						forceDragPreviewUpdate({});
					};

					// Attach drag handlers to all selected nodes
					selectedNodes.forEach((node: Konva.Node) => {
						node.off("dragstart dragmove dragend");
						node.on("dragstart", handleNodeDragStart);
						node.on("dragmove", handleNodeDragMove);
						node.on("dragend", handleNodeDragEnd);
					});

					// Attach transform handlers to transformer
					transformer.off("transformstart transform transformend");
					transformer.on("transformstart", handleTransformStart);
					transformer.on("transform", handleTransform);
					transformer.on("transformend", handleTransformEnd);
				} else {
					// Clean up drag handlers when not in multi-select
					selectedNodes.forEach((node: Konva.Node) => {
						node.off("dragstart dragmove dragend");
					});
					transformer.off("transformstart transform transformend");
				}

				transformer.getLayer()?.batchDraw();
			} catch (e) {
				console.error("Error setting transformer nodes:", e);
			}
		} else {
			// Clear selection: remove drag/transform handlers from previously selected nodes
			// so they don't stay attached and allow group movement after unselect
			const currentNodes = transformer.nodes() ?? [];
			currentNodes.forEach((node: Konva.Node) => {
				node.off("dragstart dragmove dragend");
			});
			transformer.off("transformstart transform transformend");
			transformer.nodes([]);
			prevNodePositionsRef.current.clear();
			dragPreviewPositionsRef.current = {};
			forceDragPreviewUpdate({});
		}
	}, [
		selectedIds,
		entities,
		relationships,
		attributes,
		generalizations,
		updateEntity,
		updateRelationship,
		updateGeneralization,
		updateAttributePosition,
	]);

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

		const scaleBy = 1.05;
		const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

		// Clamp the scale to min (0.1) and max (3.0)
		const clampedScale = Math.max(0.1, Math.min(3, newScale));

		// Only adjust position if scale actually changed
		// This prevents phantom scrolling when at zoom limits
		if (clampedScale === oldScale) {
			return; // No change, don't move canvas
		}

		setZoom(clampedScale);

		const mousePointTo = {
			x: (pointer.x - stage.x()) / oldScale,
			y: (pointer.y - stage.y()) / oldScale,
		};

		const newPos = {
			x: pointer.x - mousePointTo.x * clampedScale,
			y: pointer.y - mousePointTo.y * clampedScale,
		};

		stage.position(newPos);
		// Sync viewport position to store
		setViewportPosition(newPos);
		stage.batchDraw();
	};

	// Handle touch events (tap) - same logic as click but with touch-specific position handling
	const handleStageTap = (
		e: Konva.KonvaEventObject<PointerEvent | TouchEvent>,
	) => {
		const stage = stageRef.current;
		if (!stage) return;

		// Skip if long press selection just ended (don't clear selection immediately after selecting)
		const timeSinceLongPressEnd = Date.now() - longPressEndTimeRef.current;
		if (timeSinceLongPressEnd < 300) {
			return;
		}

		// Get touch position from the event itself (more reliable on mobile)
		let clientX: number;
		let clientY: number;

		const evt = e.evt as TouchEvent | PointerEvent;
		if ("changedTouches" in evt && evt.changedTouches.length > 0) {
			// TouchEvent - use changedTouches for tap end position
			clientX = evt.changedTouches[0].clientX;
			clientY = evt.changedTouches[0].clientY;
		} else if ("clientX" in evt) {
			// PointerEvent
			clientX = evt.clientX;
			clientY = evt.clientY;
		} else {
			// Fallback to getPointerPosition
			const pointer = stage.getPointerPosition();
			if (!pointer) return;
			clientX = pointer.x;
			clientY = pointer.y;
		}

		// Convert client coordinates to stage coordinates
		const container = stage.container();
		const rect = container.getBoundingClientRect();
		const stageX = clientX - rect.left;
		const stageY = clientY - rect.top;

		// Apply inverse transform to get canvas coordinates
		const transform = stage.getAbsoluteTransform().copy();
		transform.invert();
		const pos = transform.point({ x: stageX, y: stageY });

		// Empty canvas = Stage or Layer
		const isEmptyCanvasClick =
			e.target === e.target.getStage() || e.target.getType() === "Layer";

		// Handle entity creation mode
		if (mode === "entity" && isEmptyCanvasClick) {
			lastTapTimeRef.current = Date.now();
			addEntity(pos);
			return;
		}

		// Handle relationship creation mode
		if (mode === "relationship" && isEmptyCanvasClick) {
			lastTapTimeRef.current = Date.now();
			addRelationship(pos);
			return;
		}

		// Handle select mode - clear selection when tapping on empty canvas
		if (mode === "select" && isEmptyCanvasClick) {
			lastTapTimeRef.current = Date.now();
			clearSelection();
			return;
		}

		// For other modes (attribute, connect, etc.), delegate to the regular click handler
		// Set tap guard to prevent the native click from double-firing after delegation
		lastTapTimeRef.current = Date.now();
		isTapDelegatingRef.current = true;
		const mouseEvent = {
			...e,
			evt: {
				...e.evt,
				shiftKey: false,
			},
		} as Konva.KonvaEventObject<MouseEvent>;
		handleStageClick(mouseEvent);
		isTapDelegatingRef.current = false;
	};

	// Handle canvas mouse down (for box selection)
	const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
		// Only start box selection in select mode and when clicking on empty space
		if (mode === "select" && e.target === e.target.getStage()) {
			// Don't start box selection if clicking on transformer or its handles
			const targetType = e.target.getType();
			if (
				targetType === "Transformer" ||
				targetType === "Circle" ||
				targetType === "Rect"
			) {
				return;
			}

			const stage = stageRef.current;
			if (!stage) return;

			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			const transform = stage.getAbsoluteTransform().copy();
			transform.invert();
			const pos = transform.point(pointer);

			// Start box selection
			setIsSelecting(true);
			setSelectionBox({
				startX: pos.x,
				startY: pos.y,
				endX: pos.x,
				endY: pos.y,
			});
		}
	};

	// Handle canvas mouse move (for box selection)
	const handleStageMouseMove = () => {
		if (isSelecting && selectionBox) {
			const stage = stageRef.current;
			if (!stage) return;

			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			const transform = stage.getAbsoluteTransform().copy();
			transform.invert();
			const pos = transform.point(pointer);

			setSelectionBox({
				...selectionBox,
				endX: pos.x,
				endY: pos.y,
			});
		}
	};

	// Handle canvas mouse up (for box selection)
	const handleStageMouseUp = () => {
		if (isSelecting && selectionBox) {
			const stage = stageRef.current;
			if (!stage) {
				// Reset even if stage not found
				setIsSelecting(false);
				setSelectionBox(null);
				return;
			}

			const boxX = Math.min(selectionBox.startX, selectionBox.endX);
			const boxY = Math.min(selectionBox.startY, selectionBox.endY);
			const boxWidth = Math.abs(selectionBox.endX - selectionBox.startX);
			const boxHeight = Math.abs(selectionBox.endY - selectionBox.startY);

			// Only select if box is large enough (to avoid accidental selection on click)
			if (boxWidth > 5 && boxHeight > 5) {
				// Find all elements within the selection box
				const selectedIds: string[] = [];

				// Check entities
				entities.forEach((entity) => {
					const entityCenterX = entity.position.x + entity.size.width / 2;
					const entityCenterY = entity.position.y + entity.size.height / 2;
					if (
						entityCenterX >= boxX &&
						entityCenterX <= boxX + boxWidth &&
						entityCenterY >= boxY &&
						entityCenterY <= boxY + boxHeight
					) {
						selectedIds.push(entity.id);
					}
				});

				// Check relationships
				relationships.forEach((relationship) => {
					const relCenterX =
						relationship.position.x + relationship.size.width / 2;
					const relCenterY =
						relationship.position.y + relationship.size.height / 2;
					if (
						relCenterX >= boxX &&
						relCenterX <= boxX + boxWidth &&
						relCenterY >= boxY &&
						relCenterY <= boxY + boxHeight
					) {
						selectedIds.push(relationship.id);
					}
				});

				// Check attributes
				attributes.forEach((attribute) => {
					const attrCenterX = attribute.position.x;
					const attrCenterY = attribute.position.y;
					if (
						attrCenterX >= boxX &&
						attrCenterX <= boxX + boxWidth &&
						attrCenterY >= boxY &&
						attrCenterY <= boxY + boxHeight
					) {
						selectedIds.push(attribute.id);
					}
				});

				// Check generalizations (triangle center)
				generalizations.forEach((gen) => {
					const genCenterX = gen.position.x + gen.size.width / 2;
					const genCenterY = gen.position.y + gen.size.height / 2;
					if (
						genCenterX >= boxX &&
						genCenterX <= boxX + boxWidth &&
						genCenterY >= boxY &&
						genCenterY <= boxY + boxHeight
					) {
						selectedIds.push(gen.id);
					}
				});

				// Check connections (check if any point is in the box)
				connections.forEach((connection) => {
					// Check if any point in the connection is within the box
					for (let i = 0; i < connection.points.length; i += 2) {
						const x = connection.points[i];
						const y = connection.points[i + 1];
						if (
							x >= boxX &&
							x <= boxX + boxWidth &&
							y >= boxY &&
							y <= boxY + boxHeight
						) {
							selectedIds.push(connection.id);
							break;
						}
					}
				});

				if (selectedIds.length > 0) {
					selectMultiple(selectedIds);
				}
			}
		}

		// Always reset selection box state (even for small/no drag clicks)
		setIsSelecting(false);
		setSelectionBox(null);
	};

	// Handle canvas click
	const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
		const stage = stageRef.current;
		if (!stage) return;

		// Skip if a tap just happened (prevents double-firing on touch devices)
		// Allow through if explicitly delegated from handleStageTap
		if (!isTapDelegatingRef.current) {
			const timeSinceLastTap = Date.now() - lastTapTimeRef.current;
			if (timeSinceLastTap < 100) {
				return;
			}
		}

		// Check if click originated from a warning badge or popover
		const target = e.evt.target as HTMLElement;
		if (
			target?.closest("[data-warning-popover]") ||
			target?.closest("button")
		) {
			return;
		}

		const pointer = stage.getPointerPosition();
		if (!pointer) return;

		const transform = stage.getAbsoluteTransform().copy();
		transform.invert();
		const pos = transform.point(pointer);

		// Empty canvas = Stage or Layer (in Konva, clicks on empty area hit the Layer)
		const isEmptyCanvasClick =
			e.target === e.target.getStage() || e.target.getType() === "Layer";

		// Clear selection when clicking on empty canvas, regardless of current mode
		if (isEmptyCanvasClick && selectedIds.length > 0) {
			clearSelection();
		}

		// Handle connection drawing mode - only for empty space clicks
		// Entity/Relationship clicks are handled in their respective components
		if (mode === "connect") {
			// Clear pending generalization connect if clicking on empty stage
			if (isEmptyCanvasClick) {
				setPendingGeneralizationConnect(null);
			}
			// Only handle empty space clicks (for waypoints)
			if (isEmptyCanvasClick && drawingConnection.isDrawing) {
				// Clicked on empty space - add waypoint if in connect mode
				setDrawingConnection(
					true,
					drawingConnection.fromId,
					drawingConnection.fromPoint,
					pos,
					[...drawingConnection.waypoints, pos],
				);
			}
			return;
		}

		// Check if clicking on an entity or relationship (for attribute mode)
		if (mode === "attribute") {
			// First, check if clicking on an existing attribute - if so, don't create
			const clickedNode = e.target;

			// Check if directly clicking on an attribute Group
			if (clickedNode) {
				const groupId = clickedNode.id ? clickedNode.id() : null;
				if (groupId) {
					const isAttribute = attributes.find((a) => a.id === groupId);
					if (isAttribute) {
						// Clicked on an attribute, don't create a new one
						return;
					}
				}

				// Also check if clicking on a child of an attribute (Ellipse or Text)
				const parent = clickedNode.getParent();
				if (parent && parent.id) {
					const parentId = parent.id();
					const isAttributeChild = attributes.find((a) => a.id === parentId);
					if (isAttributeChild) {
						// Clicked on an attribute's child element, don't create a new one
						return;
					}
				}
			}

			// Find the entity or relationship that was clicked on or nearest one
			let targetEntity = null;
			let targetRelationship = null;

			// Check if clicking directly on an entity or relationship (or their children like Rect/Text)
			if (clickedNode) {
				const checkNode = (node: typeof clickedNode) => {
					if (node.getType() === "Group" && node.id()) {
						const gid = node.id();
						targetEntity = entities.find((e) => e.id === gid) || null;
						if (!targetEntity) {
							targetRelationship = relationships.find((r) => r.id === gid) || null;
						}
					}
				};
				checkNode(clickedNode);
				// If clicked a child (Rect, Text), walk up parents
				if (!targetEntity && !targetRelationship) {
					let parent = clickedNode.getParent();
					for (let i = 0; i < 2 && parent; i++) {
						checkNode(parent);
						if (targetEntity || targetRelationship) break;
						parent = parent.getParent();
					}
				}
			}

			// If not clicking directly, find nearest entity or relationship within reasonable distance
			if (!targetEntity && !targetRelationship) {
				let minDistance = Infinity;
				const maxDistance = 100; // Maximum distance from center to consider

				// Check entities first
				for (const entity of entities) {
					const entityCenterX = entity.position.x + entity.size.width / 2;
					const entityCenterY = entity.position.y + entity.size.height / 2;
					const distance = Math.sqrt(
						Math.pow(pos.x - entityCenterX, 2) +
							Math.pow(pos.y - entityCenterY, 2),
					);

					if (distance < minDistance && distance < maxDistance) {
						minDistance = distance;
						targetEntity = entity;
					}
				}

				// Check relationships if no entity found
				if (!targetEntity) {
					for (const relationship of relationships) {
						const relCenterX =
							relationship.position.x + relationship.size.width / 2;
						const relCenterY =
							relationship.position.y + relationship.size.height / 2;
						const distance = Math.sqrt(
							Math.pow(pos.x - relCenterX, 2) + Math.pow(pos.y - relCenterY, 2),
						);

						if (distance < minDistance && distance < maxDistance) {
							minDistance = distance;
							targetRelationship = relationship;
						}
					}
				}
			}

			if (targetEntity) {
				// Add attribute to the entity
				// Count existing attributes for this entity
				const attributeCount = attributes.filter(
					(a) => a.entityId === targetEntity.id,
				).length;

				// Calculate position based on click location relative to entity
				const entityCenterX =
					targetEntity.position.x + targetEntity.size.width / 2;
				const entityCenterY =
					targetEntity.position.y + targetEntity.size.height / 2;
				const dx = pos.x - entityCenterX;
				const dy = pos.y - entityCenterY;

				// Determine which side was clicked based on angle
				const angle = Math.atan2(dy, dx);
				const offset = 60; // Distance from entity edge
				const spacing = 40; // Vertical spacing between attributes on the same side
				let side: "right" | "bottom" | "left" | "top";
				let basePosition: { x: number; y: number };

				// Top: -3π/4 to -π/4, Right: -π/4 to π/4, Bottom: π/4 to 3π/4, Left: 3π/4 to -3π/4
				if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
					// Right side
					side = "right";
					basePosition = {
						x: targetEntity.position.x + targetEntity.size.width + offset,
						y: targetEntity.position.y + targetEntity.size.height / 2,
					};
				} else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
					// Bottom side
					side = "bottom";
					basePosition = {
						x: targetEntity.position.x + targetEntity.size.width / 2,
						y: targetEntity.position.y + targetEntity.size.height + offset,
					};
				} else if (angle >= (3 * Math.PI) / 4 || angle < -(3 * Math.PI) / 4) {
					// Left side
					side = "left";
					basePosition = {
						x: targetEntity.position.x - offset,
						y: targetEntity.position.y + targetEntity.size.height / 2,
					};
				} else {
					// Top side
					side = "top";
					basePosition = {
						x: targetEntity.position.x + targetEntity.size.width / 2,
						y: targetEntity.position.y - offset,
					};
				}

				// Check for existing attributes on the same side and adjust position
				const existingAttributesOnSide = attributes.filter((a) => {
					if (a.entityId !== targetEntity.id) return false;

					// Determine which side this attribute is on
					const attrDx = a.position.x - entityCenterX;
					const attrDy = a.position.y - entityCenterY;
					const attrAngle = Math.atan2(attrDy, attrDx);

					let attrSide: "right" | "bottom" | "left" | "top";
					if (attrAngle >= -Math.PI / 4 && attrAngle < Math.PI / 4) {
						attrSide = "right";
					} else if (
						attrAngle >= Math.PI / 4 &&
						attrAngle < (3 * Math.PI) / 4
					) {
						attrSide = "bottom";
					} else if (
						attrAngle >= (3 * Math.PI) / 4 ||
						attrAngle < -(3 * Math.PI) / 4
					) {
						attrSide = "left";
					} else {
						attrSide = "top";
					}

					return attrSide === side;
				});

				// Offset the position based on number of existing attributes on this side
				const attributePosition = { ...basePosition };
				if (side === "right" || side === "left") {
					// Stack vertically for left/right sides
					attributePosition.y += existingAttributesOnSide.length * spacing;
				} else {
					// Stack horizontally for top/bottom sides
					attributePosition.x += existingAttributesOnSide.length * spacing;
				}

				addAttribute(
					targetEntity.id,
					{
						name: `Attribute ${attributeCount + 1}`,
						isKey: false,
						isDiscriminant: false,
						isMultivalued: false,
						isDerived: false,
					},
					attributePosition,
				);
			} else if (targetRelationship) {
				// Add attribute to the relationship
				// Count existing attributes for this relationship
				const attributeCount = attributes.filter(
					(a) => a.relationshipId === targetRelationship.id,
				).length;

				// Calculate position based on click location relative to relationship
				const relCenterX =
					targetRelationship.position.x + targetRelationship.size.width / 2;
				const relCenterY =
					targetRelationship.position.y + targetRelationship.size.height / 2;
				const dx = pos.x - relCenterX;
				const dy = pos.y - relCenterY;

				// Determine which side was clicked based on angle
				const angle = Math.atan2(dy, dx);
				const offset = 60; // Distance from relationship edge
				const spacing = 40; // Vertical spacing between attributes on the same side
				let side: "right" | "bottom" | "left" | "top";
				let basePosition: { x: number; y: number };

				// Top: -3π/4 to -π/4, Right: -π/4 to π/4, Bottom: π/4 to 3π/4, Left: 3π/4 to -3π/4
				if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
					// Right side
					side = "right";
					basePosition = {
						x:
							targetRelationship.position.x +
							targetRelationship.size.width +
							offset,
						y:
							targetRelationship.position.y +
							targetRelationship.size.height / 2,
					};
				} else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
					// Bottom side
					side = "bottom";
					basePosition = {
						x:
							targetRelationship.position.x + targetRelationship.size.width / 2,
						y:
							targetRelationship.position.y +
							targetRelationship.size.height +
							offset,
					};
				} else if (angle >= (3 * Math.PI) / 4 || angle < -(3 * Math.PI) / 4) {
					// Left side
					side = "left";
					basePosition = {
						x: targetRelationship.position.x - offset,
						y:
							targetRelationship.position.y +
							targetRelationship.size.height / 2,
					};
				} else {
					// Top side
					side = "top";
					basePosition = {
						x:
							targetRelationship.position.x + targetRelationship.size.width / 2,
						y: targetRelationship.position.y - offset,
					};
				}

				// Check for existing attributes on the same side and adjust position
				const existingAttributesOnSide = attributes.filter((a) => {
					if (a.relationshipId !== targetRelationship.id) return false;

					// Determine which side this attribute is on
					const attrDx = a.position.x - relCenterX;
					const attrDy = a.position.y - relCenterY;
					const attrAngle = Math.atan2(attrDy, attrDx);

					let attrSide: "right" | "bottom" | "left" | "top";
					if (attrAngle >= -Math.PI / 4 && attrAngle < Math.PI / 4) {
						attrSide = "right";
					} else if (
						attrAngle >= Math.PI / 4 &&
						attrAngle < (3 * Math.PI) / 4
					) {
						attrSide = "bottom";
					} else if (
						attrAngle >= (3 * Math.PI) / 4 ||
						attrAngle < -(3 * Math.PI) / 4
					) {
						attrSide = "left";
					} else {
						attrSide = "top";
					}

					return attrSide === side;
				});

				// Offset the position based on number of existing attributes on this side
				const attributePosition = { ...basePosition };
				if (side === "right" || side === "left") {
					// Stack vertically for left/right sides
					attributePosition.y += existingAttributesOnSide.length * spacing;
				} else {
					// Stack horizontally for top/bottom sides
					attributePosition.x += existingAttributesOnSide.length * spacing;
				}

				addRelationshipAttribute(
					targetRelationship.id,
					{
						name: `Attribute ${attributeCount + 1}`,
						isKey: false,
						isDiscriminant: false,
						isMultivalued: false,
						isDerived: false,
					},
					attributePosition,
				);
			}
			return;
		}

		if (isEmptyCanvasClick) {
			if (mode === "entity") {
				addEntity(pos);
			} else if (
				mode === "relationship-1-1" ||
				mode === "relationship-1-n" ||
				mode === "relationship-n-n"
			) {
				// Quick relationship flow: click two entities; don't place diamond on stage click; cancel pending if any
				setPendingQuickRelationship(null);
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
			} else if (mode === "select") {
				// Only clear selection if not in box selection mode
				if (!isSelecting) {
					clearSelection();
				}
			}
		}
	};

	// Add mouse/touch move handler for preview
	const handlePointerMove = () => {
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
				drawingConnection.waypoints,
			);
		}
	};

	// Handle pinch-to-zoom gesture and long-press selection
	const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
		// Clear any existing long press timer
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}

		if (e.evt.touches.length === 2) {
			// Two finger touch - pinch to zoom
			const touch1 = e.evt.touches[0];
			const touch2 = e.evt.touches[1];

			const distance = Math.sqrt(
				Math.pow(touch2.clientX - touch1.clientX, 2) +
					Math.pow(touch2.clientY - touch1.clientY, 2),
			);

			const centerX = (touch1.clientX + touch2.clientX) / 2;
			const centerY = (touch1.clientY + touch2.clientY) / 2;

			lastPinchDistanceRef.current = distance;
			lastPinchCenterRef.current = { x: centerX, y: centerY };
		} else if (e.evt.touches.length === 1 && mode === "select") {
			// Single finger touch in select mode - check for long press on empty canvas
			const stage = stageRef.current;
			if (!stage) return;

			// Check if touching empty canvas (Stage or Layer)
			const target = e.target;
			const isEmptyCanvas = target === stage || target.getType() === "Layer";

			if (isEmptyCanvas) {
				// Store touch start position for movement detection
				const touch = e.evt.touches[0];
				const container = stage.container();
				const rect = container.getBoundingClientRect();
				const stageX = touch.clientX - rect.left;
				const stageY = touch.clientY - rect.top;

				// Transform to canvas coordinates
				const transform = stage.getAbsoluteTransform().copy();
				transform.invert();
				const pos = transform.point({ x: stageX, y: stageY });

				touchStartPosRef.current = pos;

				// Start long press timer (500ms)
				longPressTimerRef.current = setTimeout(() => {
					// Long press detected - start selection mode
					isLongPressActiveRef.current = true;
					longPressStartPosRef.current = pos;

					// Start selection box
					setIsSelecting(true);
					setSelectionBox({
						startX: pos.x,
						startY: pos.y,
						endX: pos.x,
						endY: pos.y,
					});

					// Haptic feedback if available
					if (navigator.vibrate) {
						navigator.vibrate(50);
					}
				}, 500);
			}
		}
	};

	const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
		if (e.evt.touches.length === 2 && lastPinchDistanceRef.current !== null) {
			// Cancel long press if pinching
			if (longPressTimerRef.current) {
				clearTimeout(longPressTimerRef.current);
				longPressTimerRef.current = null;
			}

			e.evt.preventDefault(); // Prevent scrolling while pinching

			const touch1 = e.evt.touches[0];
			const touch2 = e.evt.touches[1];

			const distance = Math.sqrt(
				Math.pow(touch2.clientX - touch1.clientX, 2) +
					Math.pow(touch2.clientY - touch1.clientY, 2),
			);

			const stage = stageRef.current;
			if (!stage) return;

			const scaleChange = distance / lastPinchDistanceRef.current;
			const oldScale = viewport.scale;
			const newScale = Math.max(0.1, Math.min(5, oldScale * scaleChange));

			// Get the center point in stage coordinates
			const container = containerRef.current;
			if (!container) return;

			const rect = container.getBoundingClientRect();
			const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
			const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

			const pointer = { x: centerX, y: centerY };
			const mousePointTo = {
				x: (pointer.x - stage.x()) / oldScale,
				y: (pointer.y - stage.y()) / oldScale,
			};

			setZoom(newScale);

			const newPos = {
				x: pointer.x - mousePointTo.x * newScale,
				y: pointer.y - mousePointTo.y * newScale,
			};

			stage.position(newPos);
			setViewportPosition(newPos);
			stage.batchDraw();

			lastPinchDistanceRef.current = distance;
		} else if (e.evt.touches.length === 1) {
			const stage = stageRef.current;
			if (!stage) return;

			const touch = e.evt.touches[0];
			const container = stage.container();
			const rect = container.getBoundingClientRect();
			const stageX = touch.clientX - rect.left;
			const stageY = touch.clientY - rect.top;

			// Transform to canvas coordinates
			const transform = stage.getAbsoluteTransform().copy();
			transform.invert();
			const pos = transform.point({ x: stageX, y: stageY });

			// Check if user moved too much before long press triggered - cancel timer
			if (longPressTimerRef.current && touchStartPosRef.current) {
				const dx = pos.x - touchStartPosRef.current.x;
				const dy = pos.y - touchStartPosRef.current.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				// If moved more than 10 pixels, cancel long press
				if (distance > 10) {
					clearTimeout(longPressTimerRef.current);
					longPressTimerRef.current = null;
				}
			}

			// If long press is active, update selection box
			if (isLongPressActiveRef.current && isSelecting && selectionBox) {
				e.evt.preventDefault(); // Prevent scrolling while selecting

				setSelectionBox({
					...selectionBox,
					endX: pos.x,
					endY: pos.y,
				});
			} else {
				// Single touch - update preview for drawing modes
				handlePointerMove();
			}
		}
	};

	const handleTouchEnd = () => {
		lastPinchDistanceRef.current = null;
		lastPinchCenterRef.current = null;

		// Clear long press timer
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}

		// Complete selection if long press was active
		if (isLongPressActiveRef.current && isSelecting && selectionBox) {
			const boxX = Math.min(selectionBox.startX, selectionBox.endX);
			const boxY = Math.min(selectionBox.startY, selectionBox.endY);
			const boxWidth = Math.abs(selectionBox.endX - selectionBox.startX);
			const boxHeight = Math.abs(selectionBox.endY - selectionBox.startY);

			// Only select if box is large enough
			if (boxWidth > 5 && boxHeight > 5) {
				const selectedElementIds: string[] = [];

				// Check entities
				entities.forEach((entity) => {
					const entityCenterX = entity.position.x + entity.size.width / 2;
					const entityCenterY = entity.position.y + entity.size.height / 2;
					if (
						entityCenterX >= boxX &&
						entityCenterX <= boxX + boxWidth &&
						entityCenterY >= boxY &&
						entityCenterY <= boxY + boxHeight
					) {
						selectedElementIds.push(entity.id);
					}
				});

				// Check relationships
				relationships.forEach((relationship) => {
					const relCenterX =
						relationship.position.x + relationship.size.width / 2;
					const relCenterY =
						relationship.position.y + relationship.size.height / 2;
					if (
						relCenterX >= boxX &&
						relCenterX <= boxX + boxWidth &&
						relCenterY >= boxY &&
						relCenterY <= boxY + boxHeight
					) {
						selectedElementIds.push(relationship.id);
					}
				});

				// Check attributes
				attributes.forEach((attribute) => {
					const attrCenterX = attribute.position.x;
					const attrCenterY = attribute.position.y;
					if (
						attrCenterX >= boxX &&
						attrCenterX <= boxX + boxWidth &&
						attrCenterY >= boxY &&
						attrCenterY <= boxY + boxHeight
					) {
						selectedElementIds.push(attribute.id);
					}
				});

				// Check generalizations
				generalizations.forEach((gen) => {
					const genCenterX = gen.position.x + gen.size.width / 2;
					const genCenterY = gen.position.y + gen.size.height / 2;
					if (
						genCenterX >= boxX &&
						genCenterX <= boxX + boxWidth &&
						genCenterY >= boxY &&
						genCenterY <= boxY + boxHeight
					) {
						selectedElementIds.push(gen.id);
					}
				});

				// Check connections
				connections.forEach((connection) => {
					for (let i = 0; i < connection.points.length; i += 2) {
						const x = connection.points[i];
						const y = connection.points[i + 1];
						if (
							x >= boxX &&
							x <= boxX + boxWidth &&
							y >= boxY &&
							y <= boxY + boxHeight
						) {
							selectedElementIds.push(connection.id);
							break;
						}
					}
				});

				if (selectedElementIds.length > 0) {
					selectMultiple(selectedElementIds);
				}
			}

			// Reset selection state
			setIsSelecting(false);
			setSelectionBox(null);

			// Mark the time when long press selection ended (to prevent tap from clearing it)
			longPressEndTimeRef.current = Date.now();
		}

		// Reset long press state
		isLongPressActiveRef.current = false;
		longPressStartPosRef.current = null;
		touchStartPosRef.current = null;
	};

	// Expose stageRef via ref
	useImperativeHandle(ref, () => ({
		stageRef,
	}));

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
		<div
			ref={containerRef}
			className="relative w-full h-full bg-gray-50 dark:bg-gray-900"
			style={{ touchAction: "none" }}
		>
			{/* Grid background */}
			<div className="absolute inset-0 bg-grid-pattern opacity-20 dark:opacity-10" />

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
				onTap={handleStageTap}
				onMouseDown={handleStageMouseDown}
				onMouseMove={() => {
					handlePointerMove();
					handleStageMouseMove();
				}}
				onMouseUp={handleStageMouseUp}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onDragEnd={(e) => {
					if (mode === "pan") {
						const stage = e.target as Konva.Stage;
						setViewportPosition({
							x: stage.x(),
							y: stage.y(),
						});
					}
				}}
				className={
					selectedIds.length > 1 && mode === "select"
						? "cursor-move"
						: "cursor-crosshair"
				}
				style={{ touchAction: "none" }}
			>
				<Layer ref={layerRef}>
					{/* Render entities */}
					{entities.map((entity) => (
						<EntityShape
							key={entity.id}
							entity={entity}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
					))}

					{/* Render relationships */}
					{relationships.map((relationship) => (
						<RelationshipShape
							key={relationship.id}
							relationship={relationship}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
					))}

					{/* Render generalizations (lines first, then triangle on top) */}
					{generalizations.map((gen) => (
						<GeneralizationLines
							key={`lines-${gen.id}`}
							generalization={gen}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
					))}
					{generalizations.map((gen) => (
						<GeneralizationShape
							key={gen.id}
							generalization={gen}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
					))}

					{/* Render attributes with connection lines */}
					{attributes.map((attribute) => (
						<AttributeShape
							key={attribute.id}
							attribute={attribute}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
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
						<ConnectionShape
							key={connection.id}
							connection={connection}
							dragPreviewPositions={dragPreviewPositionsRef.current}
						/>
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
											(r) => r.id === drawingConnection.fromId,
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
										drawingConnection.currentPoint.y,
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

					{/* Selection box for multi-select */}
					{isSelecting && selectionBox && (
						<Rect
							x={Math.min(selectionBox.startX, selectionBox.endX)}
							y={Math.min(selectionBox.startY, selectionBox.endY)}
							width={Math.abs(selectionBox.endX - selectionBox.startX)}
							height={Math.abs(selectionBox.endY - selectionBox.startY)}
							fill="rgba(59, 130, 246, 0.1)"
							stroke="#3b82f6"
							strokeWidth={2}
							dash={[5, 5]}
							listening={false}
						/>
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

			{/* Zoom indicator and Recenter button */}
			<div className="absolute bottom-4 right-4 flex items-center gap-2">
				{/* Recenter button */}
				<button
					onClick={() => {
						// Reset zoom to 1 (100%)
						setZoom(1);

						// Reset position to (0, 0)
						setViewportPosition({ x: 0, y: 0 });

						// Update stage position immediately
						if (stageRef.current) {
							stageRef.current.position({ x: 0, y: 0 });
							stageRef.current.scale({ x: 1, y: 1 });
							stageRef.current.batchDraw();
						}
					}}
					className="p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
					title="Recenter diagram (Reset zoom and position)"
				>
					<Maximize2 size={16} className="text-gray-700 dark:text-gray-300" />
				</button>

				{/* Zoom indicator */}
				<div className="bg-white dark:bg-gray-800 px-3 py-1 rounded shadow text-sm border border-gray-200 dark:border-gray-700">
					{Math.round(viewport.scale * 100)}%
				</div>
			</div>
		</div>
	);
});

ERCanvas.displayName = "ERCanvas";
