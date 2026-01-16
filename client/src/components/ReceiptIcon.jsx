export default function ReceiptIcon({ size = 24, className = ""}) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 28"
        width={size}
        height={size * (28 / 24)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="
          M5 1
          H19
          V23
          L17 21
          L15 23
          L13 21
          L11 23
          L9 21
          L7 23
          L5 21
          Z
        " />
  
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="14" y2="15" />
      </svg>
    );
  }
  