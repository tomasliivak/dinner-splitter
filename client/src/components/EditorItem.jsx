import "./EditorItem.css"

export default function EditorItem(props) {
    // onChange={e => setText(e.target.value) 
    // props.setItems((prev) => prev.map(item => item.id=props.item.id ? {...item, qty:e.target.value} : item)) example for changing quantity
    // value = {props.item.qty}
    // type = "number"
    
    return (
        <div className="editor-item">
            <input type="number" value={props.item.quantity} onChange={e => props.qtyChange(e.target.value,props.item)} />
            <input type="text" value={props.item.name} onChange={e => props.nameChange(e.target.value,props.item)} />
            <input type="number" value={props.item.line_total} onChange={e => props.priceChange(e.target.value,props.item)} />
        </div>
        
    )
}