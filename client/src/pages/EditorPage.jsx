import { useLocation } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import ReceiptIcon from "../components/ReceiptIcon.jsx"
import EditorItem from "../components/EditorItem.jsx"
import { useNavigate } from "react-router-dom"
import "./ReceiptPage.css"
import "./EditorPage.css"

// Editor Page Notes: Need to add venmo handle validation. Make page look good as well...
// Some of the stuff (like the delete button) may not be mobile sized(too small to press)
export default function EditorPage() {
    // this probably would break if something put in a random url for now. 
    // also would break if some just went to /r with nothing else with it
    const [receiptId,setReceiptId] = useState(useLocation().pathname.split("/")[3])
    const [shareKey, setShareKey] = useState(useLocation().search.split("=")[1])
    const [items, setItems] = useState()
    const [receipt, setReceipt] = useState()
    const [taxPercent, setTaxPercent] = useState(0)
    const [tipPercent, setTipPercent] = useState(0)
    const [venmoHandle, setVenmoHandle] = useState("")
    const [creatorName, setCreatorName] = useState("")
    const [create, setCreate] = useState(false)
    const [ready, setReady] = useState(false)
    const [newQty, setNewQty] = useState("")
    const [newName, setNewName] = useState("")
    const [newPrice, setNewPrice] = useState("")
    const navigate = useNavigate()

    const params = new URLSearchParams({
        receiptId,
        shareKey
      })
    // get the receipt data and the receipt items
    async function getReceipt() {
        const res = await fetch(`http://localhost:3000/api/receipts/retrieve?${params.toString()}`, {
            method: "GET"
        }
        )
        return res.json()
    }
    // need to add protection against negative quantities
    async function updateReceipt() {
        const res = await fetch("http://localhost:3000/api/receipts/update", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
              },
            body: JSON.stringify({
                receipt: receipt,
                items: items,
                venmoHandle: venmoHandle,
                creatorName: creatorName
            })
        })
        setReady(true)
    }
    /*these are technically not done. Need to also edit the receipt values 
    in addition to the item values on the backend side cus currently the receipt values dont get changed
    and need to update them all at the same time in a client mode or potentially could come out of line
    with eachother
    */
    function deleteItem(item) {
        setItems(prev => prev.filter(oldItem => oldItem.client_id != item.client_id))
        setReceipt((prev) => ({...prev,subtotal:Number(prev.subtotal)-Number(item.line_total),total:Number(prev.subtotal)-Number(item.line_total)}))
    }
    function createItem(quantity,name,price) {
        setItems(prev => [...prev,{client_id: crypto.randomUUID, id: null,name:name,quantity:Number(quantity),unit_price:Number(price),line_total:Number(price),receipt_id:receipt.id}])
        setReceipt((prev) => ({...prev,subtotal:Number(prev.subtotal)+Number(price),total:Number(prev.subtotal)+Number(price)}))
    }
    useEffect(() => {
        if (ready) {
            const nav = "/r/" + receiptId + "?key=" + shareKey
            navigate(nav)
        }
      }, [ready, navigate])
    // handles startup/calling to get the initial receipt and will also probably be used for refreshes later
    // need to add check for a proper link. If not proper link, re-nav to error page. 
    async function loadReceipt() {
        const data = await getReceipt()
            // potentially a problem if the llm returns like a decimal quantity for whatever reason
            data.items = data.items.map(item => ({...item,quantity:Math.floor(item.quantity),client_id: crypto.randomUUID()}))
            setItems(data.items)
            setReceipt(data.receipt)
            setTaxPercent(data.receipt.tax/data.receipt.subtotal)
            setTipPercent(data.receipt.tip/data.receipt.subtotal)
    }
    useEffect(() => {
        loadReceipt()
    }, []
    )
    // need to add logic to update receipts subtotals and stuff. Also need to have it so it persists between refreshes but like probably shouldnt send the api call to change it for every little change?
    function handleQtyChange(newQty,item) {
        
        setItems((prev) => prev.map(i => i.client_id == item.client_id ? {...i, quantity:newQty ? newQty: undefined} : i))
    }
    function handleQtyCommit(raw, item) {
        let committed
      
        if (raw === "" || raw === null) {
          return undefined
        } else {
          const n = Number(raw)
          committed = String(Math.max(0, Math.floor(n || 0)))
        }
      
        setItems(prev =>
          prev.map(i =>
            i.client_id === item.client_id ? { ...i, quantity: committed } : i
          )
        )
      }
    function handleNameChange(newName,item) {
        setItems((prev) => prev.map(i => i.client_id == item.client_id ? {...i, name:newName} : i))
    }
    function handlePriceChange(newPrice,item) {
        setReceipt((prev) => ({...prev,subtotal:Number(prev.subtotal)-Number(item.line_total)+Number(newPrice), total:Number(prev.total)-Number(item.line_total)+Number(newPrice)}))
        setItems((prev) => prev.map(i => i.client_id == item.client_id ? {...i, line_total:newPrice} : i))
    }
    // need to add blur/commit handling
    function handleTaxChange(newTax) {
        setReceipt((prev) => ({...prev,tax:newTax, total:Number(prev.total)-Number(prev.tax)+Number(newTax)}))
        setTaxPercent(Number(newTax)/Number(receipt.subtotal))
    }
    function handleTaxCommit(raw) {
        if (Number(raw) == 0) {
            setReceipt((prev) => ({...prev,tax:Number(raw), total:Number(prev.total)-Number(prev.tax)+Number(raw)}))
        }
        else {
            let rounded = Math.round(raw*100)/100
            setReceipt((prev) => ({...prev,tax:rounded, total:Number(prev.total)-Number(prev.tax)+Number(raw)}))
        }
      }
    function handleTipChange(newTip) {
        setReceipt((prev) => ({...prev,tip:newTip, total:Number(prev.total)-Number(prev.tip)+Number(newTip)}))
        setTipPercent(Number(newTip)/Number(receipt.subtotal))
    }
    function handleTipCommit(raw) {
        if (Number(raw) == 0) {
            setReceipt((prev) => ({...prev,tip:Number(raw), total:Number(prev.total)-Number(prev.tip)+Number(raw)}))
        }
        else {
            let rounded = Math.round(raw*100)/100
            setReceipt((prev) => ({...prev,tip:rounded, total:Number(prev.total)-Number(prev.tip)+Number(raw)}))
        }
      }
    function handlePriceCommit(raw, item) {
        let committed
      
        if (raw === "" || raw === null) {
          return undefined
        } else {
          const n = Number(raw)
          committed = Math.round(n*100)/100
        }
      
        setItems(prev =>
          prev.map(i =>
            i.client_id === item.client_id ? { ...i, line_total: committed } : i
          )
        )
      }
    function renderItems() {
        return items.map((item,index) => <EditorItem key={item.client_id} 
        item={item} qtyChange={handleQtyChange} nameChange={handleNameChange} 
        priceChange={handlePriceChange} index={index} qtyCommit={handleQtyCommit} 
        priceCommit={handlePriceCommit} deleteItem={deleteItem}
        />)
    }
    function sanitizeVenmoInput(raw) {
        return raw
          .trim()
          .replace(/^@+/, "")     // remove leading @@@
          .replace(/\s+/g, "")    // remove spaces
          .toLowerCase();
      }
    return (
        <form onSubmit={(e) => {
            e.preventDefault()
            updateReceipt()
            }}>
        <section className="receipt-page">
            <div id="column-receipt-topper">
                <div id="receipt-top">
                    <ReceiptIcon size={50} className="receipt-svg"/>
                    <div>
                        <h4>{receipt ? receipt.merchant_name: "Merchant Name"}</h4>
                        <p>{receipt ? "Created At: " + receipt.created_at: "Loading"}</p>
                    </div>
                </div>
            </div>
            <h4 className="editor-title">Review Your Receipt</h4>
            {items ? renderItems() : undefined}
            {create ? 
            <div className="create-div">
                <div>
                    <h4>Create Item</h4>
                    <button type="button" onClick={e => setCreate(false)}>Cancel</button>
                </div>
                <div>
                    <div className="create-field qty">
                        <input type="number"
                        onChange={e => setNewQty(e.target.value)}
                        />
                        <p>qty</p>
                    </div>
                    <div className="create-field name">
                        <input type="text" 
                        onChange={e => setNewName(e.target.value)}
                        />
                        <p>item name</p>
                    </div>
                    <div className="create-field price">
                        <input type="number"
                        onChange={e => setNewPrice(e.target.value)}
                        />
                        <p>price</p>
                    </div>
                </div>
                <button type="button" 
                onClick={(e => {createItem(newQty,newName,newPrice)
                setNewQty("")
                setNewName("")
                setNewPrice("")
                setCreate(false)
                }
                )}>Confirm</button>
            </div>
            : 
            <button id="add-item" type="button" onClick={e => (setCreate(true))}>Add Item</button>}
            <div id="items-div">
            </div>
            <h3 id="receipt-totals-header">Receipt Totals</h3>
            <div className="totals-item">
                <h4>Subtotal:</h4>
                <p>${receipt ? Math.round((receipt.subtotal)*100)/100: "subtotal"}</p>
            </div>
            {/* Honestly this part is kinda ugly but its okay for the mvp. Looked a Lot better as white text so less red*/}
            <div className="totals-item edit">
                <h4>Tax:</h4>
                <div>
                    <p>$</p>
                    <input type="number" value={receipt?.tax ?? ""}
                    onChange={e => handleTaxChange(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder="TAX"
                    onBlur={e => handleTaxCommit(e.target.value)}
                    />
                </div>
            </div>
            <div className="totals-item edit">
                <h4>Tip:</h4>
                <div>
                <p>$</p>
                    <input type="number" value={receipt?.tip ?? ""}
                    onChange={e => handleTipChange(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder="TIP"
                    onBlur={e => handleTipCommit(e.target.value)}
                    />
                </div>
            </div>
            <div className="totals-item" id="last-totals-item">
                <h4>Balance Due:</h4>
                <p>${receipt ? Math.round((receipt.total)*100)/100: "total"}</p>
            </div>
            <div id="items-div">
            </div>
            <div className="editor-input-div">
                <input type="text" value={creatorName} onChange={e => setCreatorName(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter") e.preventDefault()
                }}
                placeholder="Enter Creators Name"
                />
                <p>Creator</p>
            </div>
            <div className="editor-input-div">
                <input type="text" value={venmoHandle} onChange={e => setVenmoHandle(sanitizeVenmoInput(e.target.value))}
                onKeyDown={e => {
                    if (e.key === "Enter") e.preventDefault()
                }}
                required
                placeholder="Enter your Venmo handle (no @, no spaces)"
                />
                <div>
                    <p>Venmo Handle (no @, no spaces)</p>
                    <button type="button" onClick={(e => window.open("https://venmo.com/?txn=pay&recipients=" + venmoHandle +"&note=Venmo Handle Testing", "_blank"))}>Test Venmo Handle</button>
                </div>
            </div>
            <button className="save-button" type="submit">Save Receipt</button>
        </section>
        </form>
    )
}