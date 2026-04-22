import React from "react";

interface IconProps {
	size?: number;
	className?: string;
}

/** Partial generalization (ISA) - inverted triangle with single line to parent */
export const GeneralizationIcon: React.FC<IconProps> = ({
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
			{/* Single vertical line going up from base midpoint */}
			<line x1="12" y1="2" x2="12" y2="8" />
			{/* Inverted triangle: base at top, apex at bottom */}
			<path d="M5 8 L19 8 L12 20 Z" />
		</svg>
	);
};
