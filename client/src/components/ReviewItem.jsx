import "./ReceiptItems.css"
export default function ClaimedReceiptItem(props) {
    return (
        <div className="receipt-item">
            <p className="item-quantity">{Math.floor(props.item.quantity)}</p>
            <p className="item-name">{props.item.name}</p>
            <p className="item-price">${props.item.line_total}</p>
        </div>
    )
}