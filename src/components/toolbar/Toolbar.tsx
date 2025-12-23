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
	Download,
	Upload,
	Minus,
	ArrowLeft,
	ArrowRight,
	Trash2,
	Circle,
	Link,
	Image,
} from "lucide-react";
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

	return (
		<div className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-2 sm:px-4 gap-1 sm:gap-2 shadow-sm overflow-x-auto">
			{/* Mode tools */}
			<div className="flex items-center gap-1 mr-4 border-r pr-4">
				{tools.map((tool) => {
					const Icon = tool.icon;
					const isActive = mode === tool.id;

					return (
						<button
							key={tool.id}
							onClick={() => setMode(tool.id as typeof mode)}
							className={cn(
								"p-2 rounded hover:bg-gray-100 transition-colors",
								isActive && "bg-blue-100 text-blue-600"
							)}
							title={tool.label}
						>
							<Icon size={20} />
						</button>
					);
				})}
			</div>

			{/* History tools */}
			<div className="flex items-center gap-1 mr-4 border-r pr-4">
				<button
					onClick={() => undo()}
					disabled={!canUndo}
					className={cn(
						"p-2 rounded hover:bg-gray-100 transition-colors",
						!canUndo && "opacity-50 cursor-not-allowed"
					)}
					title="Undo (Ctrl+Z)"
				>
					<Undo2 size={20} />
				</button>
				<button
					onClick={() => redo()}
					disabled={!canRedo}
					className={cn(
						"p-2 rounded hover:bg-gray-100 transition-colors",
						!canRedo && "opacity-50 cursor-not-allowed"
					)}
					title="Redo (Ctrl+Y)"
				>
					<Redo2 size={20} />
				</button>
			</div>

			{/* Delete button - only show when something is selected */}
			{selectedIds.length > 0 && (
				<div className="flex items-center gap-1 mr-4 border-r pr-4">
					<button
						onClick={handleDelete}
						className="p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
						title={`Delete selected (${selectedIds.length})`}
					>
						<Trash2 size={20} />
					</button>
				</div>
			)}

			{/* Zoom tools */}
			<div className="flex items-center gap-1 mr-4 border-r pr-4">
				<button
					onClick={handleZoomOut}
					className="p-2 rounded hover:bg-gray-100 transition-colors"
					title="Zoom Out"
				>
					<ZoomOut size={20} />
				</button>
				<span className="text-sm text-gray-600 min-w-[50px] text-center">
					{Math.round(viewport.scale * 100)}%
				</span>
				<button
					onClick={handleZoomIn}
					className="p-2 rounded hover:bg-gray-100 transition-colors"
					title="Zoom In"
				>
					<ZoomIn size={20} />
				</button>
			</div>

			{/* File operations */}
			<div className="flex items-center gap-1 ml-auto">
				<button
					onClick={handleImport}
					className="p-2 rounded hover:bg-gray-100 transition-colors"
					title="Import XML"
				>
					<Upload size={20} />
				</button>
				<button
					onClick={handleExport}
					className="p-2 rounded hover:bg-gray-100 transition-colors"
					title="Export XML"
				>
					<Download size={20} />
				</button>
				<button
					onClick={handleExportImage}
					className="p-2 rounded hover:bg-gray-100 transition-colors"
					title="Export as Image (PNG)"
				>
					<Image size={20} />
				</button>
			</div>
		</div>
	);
};
