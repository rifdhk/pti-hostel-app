import React from 'react';

export default function MalePanjabi({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Traditional Formal Panjabi Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-male-panjabi">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-male-panjabi)">
        {/* Warm Ivory-Stone Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#F4F3EE" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D5956E" />
        {/* Traditional Ivory-Cream Formal Panjabi */}
        <path d="M16 122C18 93 36 81 60 81C84 81 102 93 104 122H16Z" fill="#FFFFFF" />
        {/* Panjabi Shoulder Seam Shade */}
        <path d="M16 122C18 93 36 81 60 81C84 81 102 93 104 122" stroke="#E2E8F0" strokeWidth="2" />
        {/* Standing Band / Mandarin Collar */}
        <path
          d="M47 80C50 86 55 88 60 88C65 88 70 86 73 80L71 86C67 90 64 91 60 91C56 91 53 90 49 86L47 80Z"
          fill="#0F766E"
        />
        {/* Vertical Embroidered Panjabi Placket */}
        <rect x="55" y="88" width="10" height="34" rx="2" fill="#0F766E" />
        <rect x="57.5" y="90" width="5" height="32" fill="#115E59" />
        {/* Subtle Gold/Teal Traditional Buttons */}
        <circle cx="60" cy="95" r="1.5" fill="#FDE68A" />
        <circle cx="60" cy="103" r="1.5" fill="#FDE68A" />
        <circle cx="60" cy="111" r="1.5" fill="#FDE68A" />
        {/* Ears */}
        <circle cx="38.5" cy="56" r="4" fill="#D5956E" />
        <circle cx="81.5" cy="56" r="4" fill="#D5956E" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill="#E2A67E" />
        {/* Hair */}
        <path
          d="M38 51C38 30 48 20 60 20C72 20 82 30 82 51C78 39 70 34 60 33C50 34 42 39 38 51Z"
          fill="#1C1917"
        />
        {/* Eyebrows */}
        <path d="M46.5 47.5C49.5 46 53 46 55.5 47.5" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M64.5 47.5C67 46 70.5 46 73.5 47.5" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53" r="2.2" fill="#1C1917" />
        <circle cx="69" cy="53" r="2.2" fill="#1C1917" />
        {/* Subtle Mustache & Warm Smile */}
        <path d="M54 63.5C57 62.3 63 62.3 66 63.5" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M60 53.5V60" stroke="#C5835B" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M55 66.5C57.5 68.8 62.5 68.8 65 66.5" stroke="#9B5C43" strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
