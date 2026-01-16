import "./LoadingDots.css"

export default function LoadingDots({ size = 8, color = "#111" }) {
  return (
    <div className="loading-dots" style={{ "--dot-size": `${size}px`, "--dot-color": color }}>
      <span />
      <span />
      <span />
    </div>
  )
}
