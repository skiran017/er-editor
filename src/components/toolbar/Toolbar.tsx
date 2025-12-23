import React from "react";
import {
	MousePointer2,
	Square,
	Diamond,
	Hand,
	Undo2,
	Redo2,
	ZoomIn,
	ZoomOut,
	Minus,
	ArrowLeft,
	ArrowRight,
	Trash2,
	Circle,
	Link,
} from "lucide-react";
import { Menu } from "../menu/Menu";
import {
	useEditorStore,
	useUndo,
	useRedo,
	useCanUndo,
	useCanRedo,
} from "../../store/editorStore";
import { cn } from "../../lib/utils";
import { serializeDiagramToXML } from "../../lib/xmlSerializer";
import { parseXMLToDiagram } from "../../lib/xmlParser";
import {
	downloadFile,
	pickFile,
	readFileAsText,
	showConfirmDialog,
} from "../../lib/fileUtils";
import { exportCanvasAsImage } from "../../lib/imageExport";
import { showToast } from "../ui/toast";
import Konva from "konva";

interface ToolbarProps {
	stageRef?: React.RefObject<Konva.Stage | null>;
}

export const Toolbar: React.FC<ToolbarProps> = ({ stageRef }) => {
	const mode = useEditorStore((state) => state.mode);
	const setMode = useEditorStore((state) => state.setMode);
	const setZoom = useEditorStore((state) => state.setZoom);
	const viewport = useEditorStore((state) => state.viewport);
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const getElementById = useEditorStore((state) => state.getElementById);
	const deleteEntity = useEditorStore((state) => state.deleteEntity);
	const deleteRelationship = useEditorStore(
		(state) => state.deleteRelationship
	);
	const deleteLine = useEditorStore((state) => state.deleteLine);
	const deleteArrow = useEditorStore((state) => state.deleteArrow);
	const deleteAttribute = useEditorStore((state) => state.deleteAttribute);
	const deleteAttributeById = useEditorStore(
		(state) => state.deleteAttributeById
	);
	const deleteConnection = useEditorStore((state) => state.deleteConnection);
	const diagram = useEditorStore((state) => state.diagram);
	const loadDiagram = useEditorStore((state) => state.loadDiagram);

	const undo = useUndo();
	const redo = useRedo();
	const canUndo = useCanUndo();
	const canRedo = useCanRedo();

	const tools = [
		{ id: "select", icon: MousePointer2, label: "Select (V)" },
		{ id: "entity", icon: Square, label: "Entity (E)" },
		{ id: "relationship", icon: Diamond, label: "Relationship (R)" },
		{ id: "attribute", icon: Circle, label: "Attribute (A)" },
		{ id: "connect", icon: Link, label: "Connect (C)" },
		{ id: "line", icon: Minus, label: "Line (L)" },
		{ id: "arrow-left", icon: ArrowLeft, label: "Arrow Left" },
		{ id: "arrow-right", icon: ArrowRight, label: "Arrow Right" },
		{ id: "pan", icon: Hand, label: "Pan (Space)" },
	] as const;

	const handleZoomIn = () => {
		setZoom(viewport.scale * 1.2);
	};

	const handleZoomOut = () => {
		setZoom(viewport.scale / 1.2);
	};

	const handleExport = async () => {
		try {
			const xml = serializeDiagramToXML(diagram);
			const filename = `er-diagram-${Date.now()}.xml`;
			downloadFile(xml, filename, "text/xml");
			showToast("Diagram exported successfully", "success");
		} catch (error) {
			console.error("Export error:", error);
			showToast(
				"Failed to export diagram: " +
					(error instanceof Error ? error.message : "Unknown error"),
				"error"
			);
		}
	};

	const handleImport = async () => {
		try {
			const file = await pickFile(".xml");
			const xmlContent = await readFileAsText(file);

			// Parse XML
			const importedDiagram = parseXMLToDiagram(xmlContent);

			// Check if current diagram has content
			const hasContent =
				diagram.entities.length > 0 ||
				diagram.relationships.length > 0 ||
				diagram.connections.length > 0 ||
				diagram.attributes.length > 0 ||
				diagram.lines.length > 0 ||
				diagram.arrows.length > 0;

			let replace = true;
			if (hasContent) {
				const shouldReplace = await showConfirmDialog(
					"Current diagram has content. Do you want to replace it, or merge with existing?"
				);
				replace = shouldReplace;
			}

			// Load diagram
			loadDiagram(importedDiagram, replace);
			showToast(
				`Diagram ${replace ? "replaced" : "merged"} successfully`,
				"success"
			);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "File selection cancelled"
			) {
				// User cancelled, don't show error
				return;
			}
			console.error("Import error:", error);
			showToast(
				"Failed to import diagram: " +
					(error instanceof Error ? error.message : "Unknown error"),
				"error"
			);
		}
	};

	const handleExportImage = async () => {
		if (!stageRef?.current) {
			showToast("Canvas not available for export", "error");
			return;
		}

		try {
			await exportCanvasAsImage(stageRef.current, "png", 0.92);
			showToast("Image exported successfully", "success");
		} catch (error) {
			console.error("Image export error:", error);
			showToast(
				"Failed to export image: " +
					(error instanceof Error ? error.message : "Unknown error"),
				"error"
			);
		}
	};

	const handleDelete = () => {
		if (selectedIds.length === 0) return;

		selectedIds.forEach((id) => {
			const element = getElementById(id);
			if (element) {
				if (element.type === "entity") {
					deleteEntity(id);
				} else if (element.type === "relationship") {
					deleteRelationship(id);
				} else if (element.type === "line") {
					deleteLine(id);
				} else if (
					element.type === "arrow-left" ||
					element.type === "arrow-right"
				) {
					deleteArrow(id);
				} else if (element.type === "attribute") {
					// Attributes can be attached to either entity or relationship
					if (element.entityId) {
						deleteAttribute(element.entityId, id);
					} else if (element.relationshipId) {
						// Use deleteAttributeById for relationship attributes
						deleteAttributeById(id);
					}
				} else if (element.type === "connection") {
					deleteConnection(id);
				}
			}
		});
	};

	const handleResetCanvas = async () => {
		const confirmed = await showConfirmDialog(
			"Are you sure you want to reset the canvas? This will delete all elements."
		);
		if (confirmed) {
			loadDiagram(
				{
					entities: [],
					relationships: [],
					connections: [],
					lines: [],
					arrows: [],
					attributes: [],
				},
				true
			);
			showToast("Canvas reset", "success");
		}
	};

	const handleShowShortcuts = () => {
		// TODO: Implement shortcuts modal/dialog
		showToast(
			"Keyboard shortcuts: V=Select, E=Entity, R=Relationship, A=Attribute, C=Connect, L=Line, Space=Pan",
			"info",
			5000
		);
	};

	return (
		<>
			{/* Hamburger Menu - Separate, fixed at top-left */}
			<div className="fixed top-4 left-4 z-50">
				<Menu
					onImport={handleImport}
					onExportXML={handleExport}
					onExportImage={handleExportImage}
					onResetCanvas={handleResetCanvas}
					onShowShortcuts={handleShowShortcuts}
				/>
			</div>

			{/* Toolbar - Scrollable on mobile, centered on desktop */}
			<div className="fixed bottom-4 left-4 right-4 md:bottom-auto md:top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 md:max-w-max">
				<div className="h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg flex items-center px-3 gap-1 overflow-x-auto scrollbar-hide">
					{/* Mode tools */}
					<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
						{tools.map((tool) => {
							const Icon = tool.icon;
							const isActive = mode === tool.id;

							return (
								<button
									key={tool.id}
									onClick={() => setMode(tool.id as typeof mode)}
									className={cn(
										"p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
										isActive &&
											"bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
									)}
									title={tool.label}
								>
									<Icon size={18} />
								</button>
							);
						})}
					</div>

					{/* History tools */}
					<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
						<button
							onClick={() => undo()}
							disabled={!canUndo}
							className={cn(
								"p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
								!canUndo && "opacity-50 cursor-not-allowed"
							)}
							title="Undo (Ctrl+Z)"
						>
							<Undo2 size={18} />
						</button>
						<button
							onClick={() => redo()}
							disabled={!canRedo}
							className={cn(
								"p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
								!canRedo && "opacity-50 cursor-not-allowed"
							)}
							title="Redo (Ctrl+Y)"
						>
							<Redo2 size={18} />
						</button>
					</div>

					{/* Delete button - only show when something is selected */}
					{selectedIds.length > 0 && (
						<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
							<button
								onClick={handleDelete}
								className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
								title={`Delete selected (${selectedIds.length})`}
							>
								<Trash2 size={18} />
							</button>
						</div>
					)}

					{/* Zoom tools */}
					<div className="flex items-center gap-0.5 shrink-0">
						<button
							onClick={handleZoomOut}
							className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							title="Zoom Out"
						>
							<ZoomOut size={18} />
						</button>
						<span className="text-xs text-gray-600 dark:text-gray-400 min-w-[45px] text-center font-medium">
							{Math.round(viewport.scale * 100)}%
						</span>
						<button
							onClick={handleZoomIn}
							className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							title="Zoom In"
						>
							<ZoomIn size={18} />
						</button>
					</div>
				</div>
			</div>
		</>
	);
};
