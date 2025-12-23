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
	onExportImage: () => void;
	onResetCanvas?: () => void;
	onShowShortcuts?: () => void;
}

export const Menu: React.FC<MenuProps> = ({
	onImport,
	onExportXML,
	onExportImage,
	onResetCanvas,
	onShowShortcuts,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const theme = useThemeStore((state) => state.theme);
	const setTheme = useThemeStore((state) => state.setTheme);

	const menuItems: MenuItem[] = [
		{
			id: "import",
			label: "Open",
			icon: Upload,
			shortcut: "Cmd+O",
			onClick: () => {
				onImport();
				setIsOpen(false);
			},
		},
		{
			id: "export-xml",
			label: "Save to...",
			icon: Download,
			shortcut: "Cmd+S",
			onClick: () => {
				onExportXML();
				setIsOpen(false);
			},
		},
		{
			id: "export-image",
			label: "Export image...",
			icon: Image,
			shortcut: "Cmd+Shift+E",
			onClick: () => {
				onExportImage();
				setIsOpen(false);
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
								return (
									<div
										key={item.id}
										className="h-px bg-gray-200 dark:bg-gray-700 my-2"
									/>
								);
							}

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
									className={cn(
										"w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left text-gray-700 dark:text-gray-300",
										item.id === "reset" &&
											"text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
									)}
								>
									<Icon
										size={18}
										className="text-gray-600 dark:text-gray-400"
									/>
									<span className="flex-1">{item.label}</span>
									{item.shortcut && (
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
