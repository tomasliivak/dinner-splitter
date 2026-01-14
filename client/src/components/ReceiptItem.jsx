import "./ReceiptItems.css"
export default function ReceiptItem(props) {
    return (
        <button onClick={() => props.onClick(props.item)} className={`receipt_item ${props.activeItems.includes(props.item.id) ? "isActive" : null}`}>
            <h3>{props.item.quantity}</h3>
            <h3>{props.item.name}</h3>
            <h3>{props.item.line_total}</h3>
        </button>
    )
}