import React from 'react';

export default function MaleSuit({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Corporate Suit and Tie Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-male-suit">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-male-suit)">
        {/* Cool Institutional Slate Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#EEF2F6" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D5956E" />
        {/* White Formal Dress Shirt */}
        <path d="M22 122C24 94 38 82 60 82C82 82 96 94 98 122H22Z" fill="#FFFFFF" />
        {/* Tie & Knot */}
        <path d="M56 85H64L62 93H58L56 85Z" fill="#0F766E" />
        <path d="M58 93H62L65 122H55L58 93Z" fill="#0D9488" />
        {/* Shirt Collar Points */}
        <path d="M48 82L60 91L53 96L45 86L48 82Z" fill="#F1F5F9" />
        <path d="M72 82L60 91L67 96L75 86L72 82Z" fill="#F1F5F9" />
        {/* Tailored Dark Navy Suit Jacket */}
        <path d="M16 122C18 93 34 81 47 82L57 122H16Z" fill="#0F172A" />
        <path d="M104 122C102 93 86 81 73 82L63 122H104Z" fill="#0F172A" />
        {/* Jacket Lapels */}
        <path d="M46 82L57 114L48 108L41 92L46 82Z" fill="#1E293B" />
        <path d="M74 82L63 114L72 108L79 92L74 82Z" fill="#1E293B" />
        {/* Ears */}
        <circle cx="38.5" cy="56" r="4" fill="#D5956E" />
        <circle cx="81.5" cy="56" r="4" fill="#D5956E" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill="#E2A67E" />
        {/* Neat Executive Side-Part Hair */}
        <path
          d="M38 51C37 30 48 20 61 20C74 20 83 30 82 51C79 39 71 34 60 33C49 33 41 39 38 51Z"
          fill="#1E293B"
        />
        {/* Eyebrows */}
        <path d="M46.5 47.5C49.5 46 53 46 55.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M64.5 47.5C67 46 70.5 46 73.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53" r="2.2" fill="#1E293B" />
        <circle cx="69" cy="53" r="2.2" fill="#1E293B" />
        {/* Nose & Composed Smile */}
        <path d="M60 53.5V60" stroke="#C5835B" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M54.5 66C57.5 68.5 62.5 68.5 65.5 66" stroke="#9B5C43" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
