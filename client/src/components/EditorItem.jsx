import "./EditorItem.css"

export default function EditorItem(props) {
    // onChange={e => setText(e.target.value) 
    // props.setItems((prev) => prev.map(item => item.id=props.item.id ? {...item, qty:e.target.value} : item)) example for changing quantity
    // value = {props.item.qty}
    // type = "number"
    return (
        <div className="editor-item">
            <div className="top-editor-item">
                <p>{props.index+1}</p>
                <button className="txn-delete-btn" type="button" onClick={e => props.deleteItem(props.item)}>x</button>
            </div>
            <div>
                <div className="e-item-field qty">
                    <input type="number" value={props.item.quantity ?? ""} onChange={e => props.qtyChange(e.target.value,props.item)} 
                    onKeyDown={e => {
                        if (e.key === "Enter") e.preventDefault()
                      }}
                    required
                    onBlur={e => props.qtyCommit(e.target.value, props.item)}
                    placeholder="Qty"
                    />
                    <p>qty</p>
                </div>
                <div className="e-item-field name">
                    <input type="text" value={props.item.name} onChange={e => props.nameChange(e.target.value,props.item)} 
                    onKeyDown={e => {
                        if (e.key === "Enter") e.preventDefault()
                      }}
                    required
                    placeholder="Enter Name"
                    />
                    <p>item name</p>
                    
                </div>
                <div className="e-item-field price">
                    <div>
                        <p>$</p>
                        <input type="number" value={props.item.line_total ?? ""} onChange={e => props.priceChange(e.target.value,props.item)} 
                        onKeyDown={e => {
                            if (e.key === "Enter") e.preventDefault()
                        }}
                        required
                        onBlur={e => props.priceCommit(e.target.value, props.item)}
                        placeholder="Price"
                        />
                    </div>
                    <p>price</p>
                </div>
            </div>
        </div>
        
    )
}