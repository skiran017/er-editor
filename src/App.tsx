import { useEffect, useRef } from "react";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ERCanvas, type ERCanvasRef } from "./components/canvas/ERCanvas";
import { PropertyPanel } from "./components/properties/PropertyPanel";
import { ToastContainer, useToast } from "./components/ui/toast";
import { useEditorStore } from "./store/editorStore";

function App() {
	const setMode = useEditorStore((state) => state.setMode);
	const canvasRef = useRef<ERCanvasRef>(null);
	const { toasts, removeToast } = useToast();

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't interfere with input fields, textareas, or contenteditable elements
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			// Prevent default browser shortcuts
			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case "z":
						e.preventDefault();
						if (e.shiftKey) {
							useEditorStore.temporal.getState().redo();
						} else {
							useEditorStore.temporal.getState().undo();
						}
						break;
					case "y":
						e.preventDefault();
						useEditorStore.temporal.getState().redo();
						break;
				}
				return;
			}

			// Mode shortcuts
			switch (e.key.toLowerCase()) {
				case "v":
					setMode("select");
					break;
				case "e":
					setMode("entity");
					break;
				case "r":
					setMode("relationship");
					break;
				case "a":
					setMode("attribute");
					break;
				case "c":
					setMode("connect");
					break;
				case "l":
					setMode("line");
					break;
				case " ":
					e.preventDefault();
					setMode("pan");
					break;
				case "escape":
					setMode("select");
					break;
				case "delete":
				case "backspace": {
					e.preventDefault();
					// Delete selected elements
					const state = useEditorStore.getState();
					const selectedIds = state.selectedIds;

					selectedIds.forEach((id) => {
						const element = state.getElementById(id);
						if (element) {
							if (element.type === "entity") {
								state.deleteEntity(id);
							} else if (element.type === "relationship") {
								state.deleteRelationship(id);
							} else if (element.type === "line") {
								state.deleteLine(id);
							} else if (
								element.type === "arrow-left" ||
								element.type === "arrow-right"
							) {
								state.deleteArrow(id);
							}
						}
					});
					break;
				}
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			// Return to select mode when space is released
			if (e.key === " ") {
				setMode("select");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [setMode]);

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			<Toolbar stageRef={canvasRef.current?.stageRef} />
			<div className="flex-1 relative overflow-hidden mt-14">
				<ERCanvas ref={canvasRef} />
				<PropertyPanel />
			</div>
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</div>
	);
}

export default App;
