import React from 'react';

export default function FemaleHijab({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Hijab Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-female-hijab">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-female-hijab)">
        {/* Calm Institutional Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#E6F4F1" />
        {/* Formal Jacket Shoulders */}
        <path d="M16 122C18 93 36 80 60 80C84 80 102 93 104 122H16Z" fill="#1E293B" />
        {/* Crisp Undershirt Collar */}
        <path d="M46 82L60 98L74 82H46Z" fill="#FFFFFF" />
        {/* Hijab Back & Flowing Drape */}
        <path
          d="M27 56C27 33 41 18 60 18C79 18 93 33 93 56V90C93 97 79 106 60 106C41 106 27 97 27 90V56Z"
          fill="#0F766E"
        />
        {/* Layered Hijab Fold */}
        <path
          d="M32 62C36 84 48 98 60 102C72 98 84 84 88 62C84 78 73 91 60 93C47 91 36 78 32 62Z"
          fill="#115E59"
        />
        {/* White Inner Underscarf Cap */}
        <path
          d="M36 52C36 36 47 26 60 26C73 26 84 36 84 52C80 41 71 34 60 34C49 34 40 41 36 52Z"
          fill="#F8FAFC"
        />
        {/* Face */}
        <ellipse cx="60" cy="57" rx="19" ry="22" fill="#E6B08A" />
        {/* Hijab Frame Around Chin */}
        <path
          d="M39 58C40 73 49 82 60 82C71 82 80 73 81 58C80 70 72 78 60 78C48 78 40 70 39 58Z"
          fill="#0D9488"
          opacity="0.35"
        />
        {/* Eyebrows */}
        <path d="M47 49.5C49.5 47.5 53 47.5 55.5 49" stroke="#332218" strokeWidth="2" strokeLinecap="round" />
        <path d="M64.5 49C67 47.5 70.5 47.5 73 49.5" stroke="#332218" strokeWidth="2" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51.5" cy="54.5" r="2.3" fill="#1E293B" />
        <circle cx="68.5" cy="54.5" r="2.3" fill="#1E293B" />
        {/* Subtle Nose & Calm Smile */}
        <path d="M60 55V61.5" stroke="#C98A63" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M54.5 67.5C57.5 70 62.5 70 65.5 67.5" stroke="#9F5F48" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
