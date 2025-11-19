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
} from "lucide-react";
import {
	useEditorStore,
	useUndo,
	useRedo,
	useCanUndo,
	useCanRedo,
} from "../../store/editorStore";
import { cn } from "../../lib/utils";

export const Toolbar: React.FC = () => {
	const mode = useEditorStore((state) => state.mode);
	const setMode = useEditorStore((state) => state.setMode);
	const setZoom = useEditorStore((state) => state.setZoom);
	const viewport = useEditorStore((state) => state.viewport);

	const undo = useUndo();
	const redo = useRedo();
	const canUndo = useCanUndo();
	const canRedo = useCanRedo();

	const tools = [
		{ id: "select", icon: MousePointer2, label: "Select (V)" },
		{ id: "entity", icon: Square, label: "Entity (E)" },
		{ id: "relationship", icon: Diamond, label: "Relationship (R)" },
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

	const handleExport = () => {
		// TODO: Implement XML export
		console.log("Export clicked");
	};

	const handleImport = () => {
		// TODO: Implement XML import
		console.log("Import clicked");
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
			</div>
		</div>
	);
};
