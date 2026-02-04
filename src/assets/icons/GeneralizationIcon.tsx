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
			{/* Inverted triangle (ISA shape) */}
			<path d="M12 4 L20 20 L4 20 Z" />
			{/* Single horizontal line at top (parent connection) */}
			<line x1="6" y1="8" x2="18" y2="8" />
		</svg>
	);
};
