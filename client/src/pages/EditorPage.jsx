import { useLocation } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import ReceiptIcon from "../components/ReceiptIcon.jsx"
import EditorItem from "../components/EditorItem.jsx"
import { useNavigate } from "react-router-dom"
import "./ReceiptPage.css"

// Editor Page Notes: Need to add venmo handle validation. Make page look good as well...
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
    const [ready, setReady] = useState(false)
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
        setItems((prev) => prev.map(i => i.id == item.id ? {...i, quantity:newQty} : i))
    }
    function handleNameChange(newName,item) {
        setItems((prev) => prev.map(i => i.id == item.id ? {...i, name:newName} : i))
    }
    // currently doesnt account for the tax % but i'd rather allow the user to directly edit the tax
    function handlePriceChange(newPrice,item) {
        setReceipt((prev) => ({...prev,subtotal:Number(prev.subtotal)-Number(item.line_total)+Number(newPrice), total:Number(prev.total)-Number(item.line_total)+Number(newPrice)}))
        setItems((prev) => prev.map(i => i.id == item.id ? {...i, line_total:newPrice} : i))
    }
    function renderItems() {
        return items.map((item) => <EditorItem key={item.id} item={item} qtyChange={handleQtyChange} nameChange={handleNameChange} priceChange={handlePriceChange}/>)
    }
    return (
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
            <h4>Review Your Items</h4>
            {items ? renderItems() : undefined}
            <div id="items-div">
            </div>
            <h3 id="receipt-totals-header">Receipt Totals</h3>
            <div className="totals-item">
                <h4>Subtotal:</h4>
                <p>${receipt ? Math.round((receipt.subtotal)*100)/100: "subtotal"}</p>
            </div>
            <div className="totals-item">
                <h4>Tax:</h4>
                <p>${receipt ? Math.round((receipt.tax)*100)/100: "tax"}</p>
            </div>
            <div className="totals-item">
                <h4>Tip:</h4>
                <p>${receipt ? receipt.tip ? Math.round((receipt.tip)*100)/100: "0": undefined}</p>
            </div>
            <div className="totals-item" id="last-totals-item">
                <h4>Balance Due:</h4>
                <p>${receipt ? Math.round((receipt.total)*100)/100: "total"}</p>
            </div>
            <div id="items-div">
            </div>
            <h4>Creators Name:</h4>
            <input type="text" value={creatorName} onChange={e => setCreatorName(e.target.value)}/>
            <h4>Venmo Handle For Recipient:{}</h4>
            <input type="text" value={venmoHandle} onChange={e => setVenmoHandle(e.target.value)}/>
            <button onClick={updateReceipt}>Save Receipt</button>
        </section>
    )
}