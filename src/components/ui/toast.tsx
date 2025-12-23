import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

interface ToastProps {
	toast: Toast;
	onRemove: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const duration = toast.duration ?? 3000;
		const timer = setTimeout(() => {
			setIsVisible(false);
			setTimeout(() => onRemove(toast.id), 300); // Wait for animation
		}, duration);

		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onRemove]);

	const icons = {
		success: CheckCircle,
		error: XCircle,
		info: Info,
		warning: AlertCircle,
	};

	const colors = {
		success: "bg-green-50 border-green-200 text-green-800",
		error: "bg-red-50 border-red-200 text-red-800",
		info: "bg-blue-50 border-blue-200 text-blue-800",
		warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
	};

	const Icon = icons[toast.type];

	return (
		<div
			className={cn(
				"flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 min-w-[300px] max-w-[500px]",
				colors[toast.type],
				isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
			)}
		>
			<Icon className="w-5 h-5 flex-shrink-0" />
			<p className="flex-1 text-sm font-medium">{toast.message}</p>
			<button
				onClick={() => {
					setIsVisible(false);
					setTimeout(() => onRemove(toast.id), 300);
				}}
				className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};

interface ToastContainerProps {
	toasts: Toast[];
	onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
	toasts,
	onRemove,
}) => {
	if (toasts.length === 0) return null;

	return (
		<div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
			{toasts.map((toast) => (
				<div key={toast.id} className="pointer-events-auto">
					<ToastComponent toast={toast} onRemove={onRemove} />
				</div>
			))}
		</div>
	);
};

// Toast manager (singleton pattern)
let toastIdCounter = 0;
const toasts: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

function notifyListeners() {
	listeners.forEach((listener) => listener([...toasts]));
}

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(
	message: string,
	type: ToastType = "info",
	duration?: number
) {
	const id = `toast-${++toastIdCounter}`;
	const newToast: Toast = { id, message, type, duration };
	toasts.push(newToast);
	notifyListeners();
}

// eslint-disable-next-line react-refresh/only-export-components
export function removeToast(id: string) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index > -1) {
		toasts.splice(index, 1);
		notifyListeners();
	}
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
	const [toastList, setToastList] = useState<Toast[]>([]);

	useEffect(() => {
		const updateToasts = (newToasts: Toast[]) => {
			setToastList([...newToasts]);
		};
		listeners.add(updateToasts);
		updateToasts(toasts);

		return () => {
			listeners.delete(updateToasts);
		};
	}, []);

	return {
		toasts: toastList,
		showToast,
		removeToast,
	};
}
