export function MokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar body */}
      <rect x="1" y="3.5" width="12" height="9.5" rx="1.5" stroke="white" strokeWidth="1.15" strokeOpacity="0.95"/>
      {/* Left tab */}
      <line x1="4" y1="1.2" x2="4" y2="5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.95"/>
      {/* Right tab */}
      <line x1="10" y1="1.2" x2="10" y2="5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.95"/>
      {/* Header separator */}
      <line x1="1" y1="6.2" x2="13" y2="6.2" stroke="white" strokeWidth="1.1" strokeOpacity="0.7"/>
      {/* First V / top of M */}
      <polyline points="1.8,7.2 7,10.2 12.2,7.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95"/>
      {/* Second V / bottom of M */}
      <polyline points="3.5,9.5 7,11.8 10.5,9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.85"/>
    </svg>
  )
}
