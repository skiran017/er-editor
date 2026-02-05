import React, { useState } from "react";
import {
	MousePointer2,
	Hand,
	Undo2,
	Redo2,
	ZoomIn,
	ZoomOut,
	Minus,
	ArrowLeft,
	ArrowRight,
	Trash2,
	MoreVertical,
	Square,
	Diamond,
} from "lucide-react";
import {
	TbRelationOneToOne,
	TbRelationOneToMany,
	TbRelationManyToMany,
	TbOvalVertical,
} from "react-icons/tb";
import {
	GeneralizationIcon,
	GeneralizationTotalIcon,
	ConnectIcon,
} from "../../assets/icons";
import { Menu } from "../menu/Menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
	useEditorStore,
	useUndo,
	useRedo,
	useCanUndo,
	useCanRedo,
} from "../../store/editorStore";
import { cn } from "../../lib/utils";
import { serializeDiagramToXML } from "../../lib/xmlSerializer";
import { serializeDiagramToJavaXML } from "../../lib/javaXmlSerializer";
import { parseXMLToDiagram } from "../../lib/xmlParser";
import { downloadFile, pickFile, readFileAsText } from "../../lib/fileUtils";
import {
	getDiagramBounds,
	remapDiagramIds,
	applyOffsetToDiagram,
} from "../../lib/diagramUtils";
import { exportCanvasAsImage } from "../../lib/imageExport";
import { showToast } from "../ui/toast";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import Konva from "konva";
import type { Diagram } from "../../types";

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
		(state) => state.deleteRelationship,
	);
	const deleteLine = useEditorStore((state) => state.deleteLine);
	const deleteArrow = useEditorStore((state) => state.deleteArrow);
	const deleteAttribute = useEditorStore((state) => state.deleteAttribute);
	const deleteAttributeById = useEditorStore(
		(state) => state.deleteAttributeById,
	);
	const deleteConnection = useEditorStore((state) => state.deleteConnection);
	const deleteGeneralization = useEditorStore(
		(state) => state.deleteGeneralization,
	);
	const diagram = useEditorStore((state) => state.diagram);
	const loadDiagram = useEditorStore((state) => state.loadDiagram);

	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [pendingImportedDiagram, setPendingImportedDiagram] =
		useState<Diagram | null>(null);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);

	const undo = useUndo();
	const redo = useRedo();
	const canUndo = useCanUndo();
	const canRedo = useCanRedo();

	// Main toolbar tools (visible by default)
	const mainTools = [
		{
			id: "select",
			icon: MousePointer2,
			label: "Select (V)",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "pan",
			icon: Hand,
			label: "Pan (Space)",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "entity",
			icon: Square,
			label: "Entity (E)",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "attribute",
			icon: TbOvalVertical,
			label: "Attribute (A)",
			size: 20,
			type: "react-icon" as const,
		},
		{
			id: "relationship-1-1",
			icon: TbRelationOneToOne,
			label: "Relationship 1:1",
			size: 20,
			type: "react-icon" as const,
		},
		{
			id: "relationship-1-n",
			icon: TbRelationOneToMany,
			label: "Relationship 1:N",
			size: 20,
			type: "react-icon" as const,
		},
		{
			id: "relationship-n-n",
			icon: TbRelationManyToMany,
			label: "Relationship N:N",
			size: 20,
			type: "react-icon" as const,
		},
		{
			id: "generalization",
			icon: GeneralizationIcon,
			label: "Generalization (ISA)",
			size: 20,
			type: "custom-svg" as const,
		},
		{
			id: "generalization-total",
			icon: GeneralizationTotalIcon,
			label: "Generalization Total",
			size: 20,
			type: "custom-svg" as const,
		},
		{
			id: "connect",
			icon: ConnectIcon,
			label: "Connect (C)",
			size: 18,
			type: "custom-svg" as const,
		},
	] as const;

	// Overflow tools (shown in dropdown)
	const moreTools = [
		{
			id: "relationship",
			icon: Diamond,
			label: "Relationship (R)",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "line",
			icon: Minus,
			label: "Line (L)",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "arrow-left",
			icon: ArrowLeft,
			label: "Arrow Left",
			size: 18,
			type: "lucide" as const,
		},
		{
			id: "arrow-right",
			icon: ArrowRight,
			label: "Arrow Right",
			size: 18,
			type: "lucide" as const,
		},
	] as const;

	const handleZoomIn = () => {
		setZoom(Math.min(viewport.scale * 1.2, 3));
	};

	const handleZoomOut = () => {
		setZoom(Math.max(viewport.scale / 1.2, 0.1));
	};

	const handleExport = async (format: "standard" | "java" = "standard") => {
		try {
			const xml =
				format === "java"
					? serializeDiagramToJavaXML(diagram)
					: serializeDiagramToXML(diagram);
			const formatSuffix = format === "java" ? "-java" : "";
			const filename = `er-diagram${formatSuffix}-${Date.now()}.xml`;
			downloadFile(xml, filename, "text/xml");
			showToast(
				`Diagram exported successfully (${
					format === "java" ? "Java" : "Standard"
				} format)`,
				"success",
			);
		} catch (error) {
			console.error("Export error:", error);
			showToast(
				"Failed to export diagram: " +
					(error instanceof Error ? error.message : "Unknown error"),
				"error",
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

			if (hasContent) {
				setPendingImportedDiagram(importedDiagram);
				setImportDialogOpen(true);
				return;
			}

			// No existing content: load directly
			loadDiagram(importedDiagram, true);
			showToast("Diagram imported successfully", "success");
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
				"error",
			);
		}
	};

	const handleImportMerge = () => {
		if (!pendingImportedDiagram) return;
		const bounds = getDiagramBounds(diagram);
		const width = bounds.maxX - bounds.minX;
		const GAP = 80;
		const offsetX = width + GAP;
		const remapped = remapDiagramIds(pendingImportedDiagram);
		const offsetDiagram = applyOffsetToDiagram(remapped, offsetX, 0);
		loadDiagram(offsetDiagram, false);
		setImportDialogOpen(false);
		setPendingImportedDiagram(null);
		showToast("Diagrams merged side by side", "success");
	};

	const handleImportResetAndOpen = () => {
		if (!pendingImportedDiagram) return;
		loadDiagram(pendingImportedDiagram, true);
		setImportDialogOpen(false);
		setPendingImportedDiagram(null);
		showToast("Diagram replaced with imported file", "success");
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
				"error",
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
				} else if (element.type === "generalization") {
					deleteGeneralization(id);
				}
			}
		});
	};

	const handleResetCanvas = () => {
		setResetDialogOpen(true);
	};

	const handleResetCanvasConfirm = () => {
		loadDiagram(
			{
				entities: [],
				relationships: [],
				connections: [],
				generalizations: [],
				lines: [],
				arrows: [],
				attributes: [],
			},
			true,
		);
		setResetDialogOpen(false);
		showToast("Canvas reset", "success");
	};

	const handleShowShortcuts = () => {
		// TODO: Implement shortcuts modal/dialog
		showToast(
			"Keyboard shortcuts: V=Select, E=Entity, R=Relationship, A=Attribute, C=Connect, L=Line, Space=Pan",
			"info",
			5000,
		);
	};

	return (
		<>
			{/* Import options dialog when canvas has content */}
			<AlertDialog
				open={importDialogOpen}
				onOpenChange={(open) => {
					setImportDialogOpen(open);
					if (!open) setPendingImportedDiagram(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Import diagram</AlertDialogTitle>
						<AlertDialogDescription>
							The canvas already has content. How do you want to proceed?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<Button
							variant="default"
							onClick={handleImportMerge}
							className="w-full sm:w-auto"
						>
							Merge
						</Button>
						<Button
							variant="secondary"
							onClick={handleImportResetAndOpen}
							className="w-full sm:w-auto"
						>
							Reset and Open
						</Button>
						<AlertDialogCancel className="w-full sm:w-auto">
							Cancel
						</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reset canvas confirmation dialog */}
			<AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset canvas</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to reset the canvas? This will delete all
							elements.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button variant="destructive" onClick={handleResetCanvasConfirm}>
							Reset
						</Button>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Hamburger Menu - Separate, fixed at top-left */}
			<div className="fixed top-4 left-4 z-50">
				<Menu
					onImport={handleImport}
					onExportXML={() => handleExport("standard")}
					onExportJavaXML={() => handleExport("java")}
					onExportImage={handleExportImage}
					onResetCanvas={handleResetCanvas}
					onShowShortcuts={handleShowShortcuts}
				/>
			</div>

			{/* Toolbar - Scrollable on mobile, centered on desktop */}
			<div className="fixed bottom-4 left-4 right-4 md:bottom-auto md:top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 md:max-w-max">
				<div className="h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg flex items-center px-3 gap-1 overflow-x-auto scrollbar-hide">
					{/* Main Mode tools */}
					<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
						{mainTools.map((tool) => {
							const Icon = tool.icon;
							const isActive = mode === tool.id;

							return (
								<button
									key={tool.id}
									onClick={() => setMode(tool.id as typeof mode)}
									className={cn(
										"p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
										isActive &&
											"bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
									)}
									title={tool.label}
								>
									<Icon size={tool.size} />
								</button>
							);
						})}
					</div>

					{/* More tools dropdown */}
					<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									title="More tools"
								>
									<MoreVertical size={18} />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="bottom"
								align="start"
								className="min-w-[160px]"
							>
								{moreTools.map((tool) => {
									const Icon = tool.icon;
									const isActive = mode === tool.id;

									return (
										<DropdownMenuItem
											key={tool.id}
											onClick={() => setMode(tool.id as typeof mode)}
											className={cn(
												"flex items-center gap-2 cursor-pointer",
												isActive &&
													"bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
											)}
										>
											<Icon size={tool.size} />
											<span className="text-sm">{tool.label}</span>
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* History tools */}
					<div className="flex items-center gap-0.5 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2 shrink-0">
						<button
							onClick={() => undo()}
							disabled={!canUndo}
							className={cn(
								"p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
								!canUndo && "opacity-50 cursor-not-allowed",
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
								!canRedo && "opacity-50 cursor-not-allowed",
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
