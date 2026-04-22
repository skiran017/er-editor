import React, { useState } from "react";
import {
	Menu as MenuIcon,
	X,
	Upload,
	Download,
	Image,
	Settings,
	HelpCircle,
	Keyboard,
	FileText,
	Trash2,
	Sun,
	Moon,
	Monitor,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore, type Theme } from "../../store/themeStore";
import { useEditorStore } from "../../store/editorStore";
import { Switch } from "../ui/switch";

interface MenuItem {
	id: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	shortcut?: string;
	onClick: () => void;
	separator?: boolean;
}

interface MenuProps {
	onImport: () => void;
	onExportXML: () => void;
	onExportJavaXML?: () => void;
	onExportImage: () => void;
	onResetCanvas?: () => void;
	onShowShortcuts?: () => void;
}

export const Menu: React.FC<MenuProps> = ({
	onImport,
	onExportXML,
	onExportJavaXML,
	onExportImage,
	onResetCanvas,
	onShowShortcuts,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const theme = useThemeStore((state) => state.theme);
	const setTheme = useThemeStore((state) => state.setTheme);
	const examMode = useEditorStore((state) => state.examMode);
	const validationEnabled = useEditorStore((state) => state.validationEnabled);
	const setValidationEnabled = useEditorStore(
		(state) => state.setValidationEnabled
	);

	const menuItems: MenuItem[] = [
		{
			id: "import",
			label: "Open",
			icon: Upload,
			shortcut: "Cmd+O",
			onClick: () => {
				if (!examMode) {
					onImport();
					setIsOpen(false);
				}
			},
		},
		{
			id: "export-xml",
			label: "Save as Standard XML...",
			icon: Download,
			shortcut: "Cmd+S",
			onClick: () => {
				if (!examMode) {
					onExportXML();
					setIsOpen(false);
				}
			},
		},
		...(onExportJavaXML
			? [
					{
						id: "export-java-xml",
						label: "Save as Java XML...",
						icon: Download,
						shortcut: "Cmd+Shift+S",
						onClick: () => {
							if (!examMode) {
								onExportJavaXML();
								setIsOpen(false);
							}
						},
					} as MenuItem,
			  ]
			: []),
		{
			id: "export-image",
			label: "Export image...",
			icon: Image,
			shortcut: "Cmd+Shift+E",
			onClick: () => {
				if (!examMode) {
					onExportImage();
					setIsOpen(false);
				}
			},
		},
		{
			id: "separator-1",
			label: "",
			icon: FileText,
			onClick: () => {},
			separator: true,
		},
		{
			id: "shortcuts",
			label: "Keyboard shortcuts",
			icon: Keyboard,
			shortcut: "Cmd+/",
			onClick: () => {
				onShowShortcuts?.();
				setIsOpen(false);
			},
		},
		{
			id: "help",
			label: "Help",
			icon: HelpCircle,
			shortcut: "?",
			onClick: () => {
				setIsOpen(false);
			},
		},
		{
			id: "separator-2",
			label: "",
			icon: FileText,
			onClick: () => {},
			separator: true,
		},
		{
			id: "theme",
			label: "Theme",
			icon: Settings,
			onClick: () => {},
			separator: false,
		},
		...(onResetCanvas
			? [
					{
						id: "reset",
						label: "Reset the canvas",
						icon: Trash2,
						onClick: () => {
							onResetCanvas();
							setIsOpen(false);
						},
					} as MenuItem,
			  ]
			: []),
	];

	const themes: {
		value: Theme;
		label: string;
		icon: React.ComponentType<{ size?: number; className?: string }>;
	}[] = [
		{ value: "light", label: "Light", icon: Sun },
		{ value: "dark", label: "Dark", icon: Moon },
		{ value: "system", label: "System", icon: Monitor },
	];

	return (
		<div className="relative">
			{/* Hamburger Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="p-2 rounded-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				title="Menu"
			>
				{isOpen ? <X size={18} /> : <MenuIcon size={18} />}
			</button>

			{/* Menu Overlay */}
			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute top-12 left-0 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-xl z-50 py-2">
						{menuItems.map((item) => {
							if (item.separator) {
								// Show validation toggle after separator-1 (before shortcuts)
								if (item.id === "separator-1") {
									return (
										<React.Fragment key={item.id}>
											<div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
											{/* Validation Toggle */}
											<div className="px-4 py-2">
												<div className="flex items-center justify-between">
													<label
														htmlFor="validation-toggle"
														className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
													>
														Validation
													</label>
													<Switch
														id="validation-toggle"
														checked={validationEnabled}
														onCheckedChange={(checked) => {
															if (!examMode) {
																setValidationEnabled(checked);
															}
														}}
														disabled={examMode}
													/>
												</div>
											</div>
										</React.Fragment>
									);
								}
								return (
									<div
										key={item.id}
										className="h-px bg-gray-200 dark:bg-gray-700 my-2"
									/>
								);
							}

							// Disable import and export items in exam mode
							const isDisabled =
								examMode &&
								(item.id === "import" ||
									item.id === "export-xml" ||
									item.id === "export-java-xml" ||
									item.id === "export-image");

							if (item.id === "theme") {
								return (
									<div key={item.id} className="px-4 py-2">
										<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
											Theme
										</div>
										<div className="flex items-center gap-2">
											{themes.map((themeOption) => {
												const ThemeIcon = themeOption.icon;
												const isActive = theme === themeOption.value;
												return (
													<button
														key={themeOption.value}
														onClick={() => {
															setTheme(themeOption.value);
														}}
														className={cn(
															"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
															isActive
																? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
																: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
														)}
														title={themeOption.label}
													>
														<ThemeIcon size={16} />
													</button>
												);
											})}
										</div>
									</div>
								);
							}

							const Icon = item.icon;
							return (
								<button
									key={item.id}
									onClick={item.onClick}
									disabled={isDisabled}
									className={cn(
										"w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
										isDisabled
											? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600"
											: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
										item.id === "reset" &&
											!isDisabled &&
											"text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
									)}
								>
									<Icon
										size={18}
										className={
											isDisabled
												? "text-gray-400 dark:text-gray-600"
												: "text-gray-600 dark:text-gray-400"
										}
									/>
									<span className="flex-1">{item.label}</span>
									{item.shortcut && !isDisabled && (
										<span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
											{item.shortcut}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
};

