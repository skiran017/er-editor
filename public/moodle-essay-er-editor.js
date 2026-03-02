/*
 * Moodle host script for embedding ER Editor in Essay questions.
 * Stores raw XML directly in Moodle textarea.value.
 */

(function () {
	"use strict";

	// Configure these for your deployment.
	const ER_EDITOR_ORIGIN = "https://er-editor.vercel.app";
	const ER_EDITOR_URL = `${ER_EDITOR_ORIGIN}/?embed=true&examMode=true&parentOrigin=${encodeURIComponent(window.location.origin)}`;

	const HOST_SOURCE = "moodle-er-host";
	const EDITOR_SOURCE = "er-editor";
	const CONTAINER_ID = "er_editor";

	let moodleTextarea = null;
	let editorContainer = null;
	let editorIframe = null;
	let initialized = false;

	function createIframe() {
		const frame = document.createElement("iframe");
		frame.src = ER_EDITOR_URL;
		frame.style.position = "relative";
		frame.style.border = "0";
		frame.style.top = "0";
		frame.style.left = "0";
		frame.style.width = "100%";
		frame.style.height = "100%";
		return frame;
	}

	function setTextareaValue(xml) {
		if (!moodleTextarea) return;
		moodleTextarea.value = xml || "";
		// Trigger standard form listeners.
		moodleTextarea.dispatchEvent(new Event("input", { bubbles: true }));
		moodleTextarea.dispatchEvent(new Event("change", { bubbles: true }));
	}

	function postToEditor(message) {
		if (!editorIframe || !editorIframe.contentWindow) return;
		editorIframe.contentWindow.postMessage(
			{ source: HOST_SOURCE, ...message },
			ER_EDITOR_ORIGIN,
		);
	}

	function init() {
		try {
			moodleTextarea = document.querySelector("textarea.form-control");
			editorContainer = document.getElementById(CONTAINER_ID);
			if (!moodleTextarea || !editorContainer) return;

			if (moodleTextarea.parentElement) {
				moodleTextarea.parentElement.hidden = true;
			}

			editorIframe = createIframe();
			editorContainer.appendChild(editorIframe);

			const editorStyle = getComputedStyle(editorContainer);
			const btw = editorStyle.borderTopWidth || "0px";
			const bbw = editorStyle.borderBottomWidth || "0px";
			editorContainer.style.height = `calc(${moodleTextarea.rows}lh + ${btw} + ${bbw})`;

			window.addEventListener("message", function (evt) {
				if (evt.origin !== ER_EDITOR_ORIGIN) return;
				const data = evt.data;
				if (
					!data ||
					data.source !== EDITOR_SOURCE ||
					typeof data.type !== "string"
				) {
					return;
				}

				if (data.type === "ready") {
					if (initialized) return;
					initialized = true;
					postToEditor({
						type: "init",
						xml: moodleTextarea.value || "",
					});
					return;
				}

				if (data.type === "save" || data.type === "autosave") {
					const xml = typeof data.xml === "string" ? data.xml : "";
					setTextareaValue(xml);
					return;
				}

				if (data.type === "error") {
					// Keep logging lightweight but visible during rollout.
					console.error(
						"[ER Editor Embed] Editor error:",
						data.message || "Unknown error",
					);
				}
			});
		} catch (e) {
			console.error("[ER Editor Embed] Initialization failed:", e);
		}
	}

	document.addEventListener("DOMContentLoaded", init);
})();
