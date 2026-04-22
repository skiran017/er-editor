import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Weak Entity Icon (Double Rectangle)
export const WeakEntityIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => {
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
      {/* Outer rectangle */}
      <rect x="3" y="6" width="18" height="12" />
      {/* Inner rectangle */}
      <rect x="5" y="8" width="14" height="8" />
    </svg>
  );
};

// Weak Relationship Icon (Double Diamond)
export const WeakRelationshipIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => {
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
      {/* Outer diamond */}
      <path d="M12 3 L21 12 L12 21 L3 12 Z" />
      {/* Inner diamond */}
      <path d="M12 6 L18 12 L12 18 L6 12 Z" />
    </svg>
  );
};

