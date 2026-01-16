export default function Dot({
    size = 12,
    fill = "#fff",
    circleStroke = "#111827",
    circleStrokeWidth = 1,
    xColor = "#111827",
    xStrokeWidth = 1,
    showX = false,
  }) {
    const center = size / 2;
    const r = center - circleStrokeWidth;
    const xPadding = size * 0.3;
  
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circle */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill={fill}
          stroke={circleStroke}
          strokeWidth={circleStrokeWidth}
        />
  
        {/* X */}
        {showX && (
          <>
            <line
              x1={xPadding}
              y1={xPadding}
              x2={size - xPadding}
              y2={size - xPadding}
              stroke={xColor}
              strokeWidth={xStrokeWidth}
              strokeLinecap="round"
            />
            <line
              x1={size - xPadding}
              y1={xPadding}
              x2={xPadding}
              y2={size - xPadding}
              stroke={xColor}
              strokeWidth={xStrokeWidth}
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    )
  }
  