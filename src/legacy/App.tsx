import { useEffect, useRef } from "react";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ERCanvas, type ERCanvasRef } from "./components/canvas/ERCanvas";
import { PropertyPanel } from "./components/properties/PropertyPanel";
import { ToastContainer, useToast } from "./components/ui/toast";
import { useEditorStore } from "./store/editorStore";
import { useThemeStore } from "./store/themeStore";
import { parseXMLToDiagram } from "./lib/xmlParser";
import { serializeDiagramToXML } from "./lib/xmlSerializer";
import type { Diagram } from "./types";

function App() {
	const setMode = useEditorStore((state) => state.setMode);
	const canvasRef = useRef<ERCanvasRef>(null);
	const { toasts, removeToast } = useToast();

	// Initialize theme
	useEffect(() => {
		const theme = useThemeStore.getState().theme;
		useThemeStore.getState().setTheme(theme);
	}, []);

	// Initialize exam mode from query parameter
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const embedMode = urlParams.get("embed") === "true";
		const examModeParam = urlParams.get("examMode");
		// In embed mode, default to exam mode unless explicitly disabled.
		const examMode =
			examModeParam === "true" || (embedMode && examModeParam !== "false");
		useEditorStore.getState().setExamMode(examMode);
	}, []);

	// Moodle/embed bridge: raw XML in postMessage payloads.
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const embedMode = urlParams.get("embed") === "true";
		if (!embedMode || window.parent === window) return;

		const parentOriginParam = urlParams.get("parentOrigin");
		let targetOrigin = "*";
		if (parentOriginParam) {
			targetOrigin = parentOriginParam;
		} else if (document.referrer) {
			try {
				targetOrigin = new URL(document.referrer).origin;
			} catch {
				targetOrigin = "*";
			}
		}

		const postToParent = (payload: Record<string, unknown>) => {
			window.parent.postMessage(
				{ source: "er-editor", ...payload },
				targetOrigin,
			);
		};

		const loadEmptyDiagram = () => {
			const emptyDiagram: Diagram = {
				entities: [],
				relationships: [],
				connections: [],
				generalizations: [],
				lines: [],
				arrows: [],
				attributes: [],
			};
			useEditorStore.getState().loadDiagram(emptyDiagram, true);
		};

		const saveAndPost = (eventType: "save" | "autosave") => {
			try {
				const xml = serializeDiagramToXML(useEditorStore.getState().diagram);
				postToParent({ type: eventType, xml });
			} catch (error) {
				postToParent({
					type: "error",
					message:
						error instanceof Error
							? error.message
							: "Failed to serialize diagram",
				});
			}
		};

		let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
		const scheduleAutosave = () => {
			if (autosaveTimeout) clearTimeout(autosaveTimeout);
			autosaveTimeout = setTimeout(() => {
				saveAndPost("autosave");
				autosaveTimeout = null;
			}, 800);
		};

		const unsubscribe = useEditorStore.subscribe((state, prevState) => {
			if (state.diagram !== prevState.diagram) {
				scheduleAutosave();
			}
		});

		const handleMessage = (event: MessageEvent) => {
			if (targetOrigin !== "*" && event.origin !== targetOrigin) return;
			const data = event.data;
			if (!data || typeof data !== "object") return;

			const source = (data as { source?: unknown }).source;
			const type = (data as { type?: unknown }).type;
			if (source !== "moodle-er-host" || typeof type !== "string") return;

			if (type === "init" || type === "load") {
				try {
					const xml = (data as { xml?: unknown }).xml;
					if (typeof xml === "string" && xml.trim().length > 0) {
						const parsed = parseXMLToDiagram(xml);
						useEditorStore.getState().loadDiagram(parsed, true);
					} else {
						loadEmptyDiagram();
					}
				} catch (error) {
					postToParent({
						type: "error",
						message:
							error instanceof Error
								? error.message
								: "Failed to load provided XML",
					});
				}
			}
		};

		const handlePageHide = () => {
			saveAndPost("save");
		};

		window.addEventListener("message", handleMessage);
		window.addEventListener("pagehide", handlePageHide);
		window.addEventListener("beforeunload", handlePageHide);

		postToParent({ type: "ready" });

		return () => {
			window.removeEventListener("message", handleMessage);
			window.removeEventListener("pagehide", handlePageHide);
			window.removeEventListener("beforeunload", handlePageHide);
			if (autosaveTimeout) clearTimeout(autosaveTimeout);
			unsubscribe();
		};
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't interfere with input fields, textareas, contenteditable elements, or buttons
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "BUTTON" ||
				target.isContentEditable ||
				target.closest("button") ||
				target.closest("[data-warning-popover]")
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
				case "escape": {
					setMode("select");
					useEditorStore.getState().clearSelection();
					break;
				}
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
			<div className="flex-1 relative overflow-hidden">
				<ERCanvas ref={canvasRef} />
				<PropertyPanel />
			</div>
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</div>
	);
}

export default App;
