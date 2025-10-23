import React, { useEffect } from "react";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ERCanvas } from "./components/canvas/ERCanvas";
import { useEditorStore } from "./store/editorStore";

function App() {
	const setMode = useEditorStore((state) => state.setMode);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
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
			<Toolbar />
			<ERCanvas />
		</div>
	);
}

export default App;
