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
			{/* Double vertical lines going up from base midpoint (total participation) */}
			<line x1="10" y1="2" x2="10" y2="8" />
			<line x1="14" y1="2" x2="14" y2="8" />
			{/* Inverted triangle: base at top, apex at bottom */}
			<path d="M5 8 L19 8 L12 20 Z" />
		</svg>
	);
};
