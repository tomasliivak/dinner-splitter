import "./ReceiptItems.css"
import Dot from "./Dot.jsx"
export default function ClaimedReceiptItem(props) {
    return (
        <button onClick={() => props.onClick(props.item)} className="receipt-item">
            <div className="dot-buffer">
                <Dot fill={"#EF3D50"} circleStroke={`transparent`} xColor={"white"} showX={true}/>
            </div>
            <p className="item-quantity">{Math.floor(props.item.quantity)}</p>
            <p className="item-name">{props.item.name}</p>
            <p className="item-price">${props.item.line_total}</p>
        </button>
    )
}