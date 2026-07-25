type Props = { size?: number; className?: string }

export function TTechLogo({ size = 52, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="52" height="52" rx="9" fill="#4a6882" />
      {/* Paper stack */}
      <rect x="13" y="16" width="18" height="22" rx="2" fill="white" opacity="0.2" />
      <rect x="15" y="14" width="18" height="22" rx="2" fill="white" opacity="0.35" />
      <rect x="17" y="12" width="18" height="22" rx="2" fill="white" />
      {/* Lines on paper */}
      <line x1="21" y1="18" x2="31" y2="18" stroke="#4a6882" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21" y1="21.5" x2="31" y2="21.5" stroke="#4a6882" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21" y1="25" x2="28" y2="25" stroke="#4a6882" strokeWidth="1.5" strokeLinecap="round" />
      {/* T badge */}
      <circle cx="38" cy="38" r="10" fill="#2d3f52" />
      <text
        x="38"
        y="43"
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        T
      </text>
    </svg>
  )
}
