import React from "react";

interface IconProps {
	size?: number;
	className?: string;
}

/** Total generalization (ISA totale) - inverted triangle with double line to parent */
export const GeneralizationTotalIcon: React.FC<IconProps> = ({
	size = 20,
	className = "",
}) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			{/* Inverted triangle (ISA shape) */}
			<path d="M12 4 L20 20 L4 20 Z" />
			{/* Double horizontal lines at top (total participation to parent) */}
			<line x1="6" y1="7" x2="18" y2="7" />
			<line x1="6" y1="9" x2="18" y2="9" />
		</svg>
	);
};
