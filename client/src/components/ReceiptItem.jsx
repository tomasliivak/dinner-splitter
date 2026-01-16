import "./ReceiptItems.css"
import Dot from "../components/Dot.jsx"

export default function ReceiptItem(props) {
    return (
        <button onClick={() => props.onClick(props.item)} className={`receipt-item ${props.activeItems.includes(props.item) ? "isActive" : null}`}>
            <div className="dot-buffer">
                <Dot fill={`${props.activeItems.includes(props.item) ? "#7b363d" : "white"}`} circleStroke={`${props.activeItems.includes(props.item) ? "transparent" : "black"}`}/>
            </div>
            <p className="item-quantity">{Math.floor(props.item.quantity)}</p>
            <p className="item-name">{props.item.name}</p>
            <p className="item-price">${props.item.line_total}</p>
        </button>
    )
}