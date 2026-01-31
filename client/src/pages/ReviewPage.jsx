import { useLocation } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import ReceiptItem from "../components/ReceiptItem.jsx"
import ReceiptIcon from "../components/ReceiptIcon.jsx"
import "./ReceiptPage.css"
import posthog from "posthog-js"
import toast from "react-hot-toast"
import Header from "../components/Header.jsx"
import ReviewItem from "../components/ReviewItem.jsx"

const API_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

export default function ReviewPage() {
    // this probably would break if something put in a random url for now. 
    // also would break if some just went to /r with nothing else with it
    const [receiptId,setReceiptId] = useState(useLocation().pathname.split("/")[3])
    const [shareKey, setShareKey] = useState(useLocation().search.split("=")[1])
    const [items, setItems] = useState()
    const [receipt, setReceipt] = useState()
    const [participantId, setParticipantId] = useState()
    const [claimedItems, setClaimedItems] = useState()
    const [taxPercent, setTaxPercent] = useState(0)
    const [tipPercent, setTipPercent] = useState(0)
    const [participantSubtotal, setParticipantSubtotal] = useState(0)
    const [participantItems, setParticipantItems] = useState([])
    const params = new URLSearchParams({
        receiptId,
        shareKey
      })
    // get the receipt data and the receipt items
    // Note to later self: Honestly not particularly sure if the tip math is accurate/if the tip is being counted towards the total by the llm. e.i need to do testing with receipts that have tip written
    // Need to add better looking share button
    async function getReceipt() {
        const res = await fetch(`${API_URL}/api/receipts/retrieve?${params.toString()}`, {
            method: "GET"
        }
        )
        const data = await res.json()
        
        if (!res.ok) {
            toast.error(data.error || "Server error")
            return
        }
        return data
    }
    async function getPItems(id) {
        const itemParams = new URLSearchParams ({
            receiptId,
            id
        })
        const res = await fetch(`${API_URL}/api/receipts/pclaims?${itemParams.toString()}`,
            {
                method:"GET"
            }
        )
        const data = await res.json()
        if (!res.ok) {
            toast.error(data.error || "Server error")
            return
        }
        return data.participantClaims
    }
    async function loadReceipt() {
        const data = await getReceipt()
        setClaimedItems(data.claims)
        setItems(data.items)
        setReceipt(data.receipt)
        setTaxPercent(data.receipt.tax/data.receipt.subtotal)
        setTipPercent(data.receipt.tip/data.receipt.subtotal)
        let id = localStorage.getItem("participant_id");
        setParticipantId(id)
        let pItems = []
        if (!id) {
            // make it so it shows a message "You have no claimed items" or something and a button to navigate away
        }
        else {
            pItems = await getPItems(id)
            setParticipantItems(pItems)
        }
        if (pItems && data.items) {
            
            let participantItemIds = new Set(pItems.map(prev => prev.receipt_item_id))
            
            let total = 0
            
            for (const item of data.items) {
                if (participantItemIds.has(item.id)) {
                    total += Number(item.line_total) || 0;
                }
            }
            setParticipantSubtotal(total)
        }
        else {
            // make it so it shows a message "You have no claimed items" or something and a button to navigate away
        }
    }
    useEffect(() => {
        loadReceipt()
    }, []
    )
    
    function payClick() {
        
    }

    useEffect(() => {
        const refresh = () => loadReceipt()
      
        const onVis = () => {
          if (document.visibilityState === "visible") refresh()
        };
      
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", onVis)
      
        return () => {
          window.removeEventListener("focus", refresh);
          document.removeEventListener("visibilitychange", onVis)
        };
      }, [loadReceipt])

    // needs fixing
    function renderParticipantItems() {
        if (!participantItems) {
            return undefined
        }
        else {
            let participantItemIds = new Set(participantItems.map(prev => prev.receipt_item_id))
            return items.filter(item => participantItemIds.has(item.id)).map((item) => <ReviewItem key={item.id} item={item}/>)
        }
    }

    function createVenmoLink(venmoHandle, total) {
        const params = new URLSearchParams({
            recipients: venmoHandle,
            txn: "pay",
            amount: total.toFixed(2),
            note: "www.usedivvy.app"
        })
    
        return `https://venmo.com/?${params.toString()}`
    }
    
      // remove the outer div depending what I do
    return (
        <div>
            <Header page="pay" back={"/r/" + receiptId + "?key=" + shareKey}/>

            <div className="context-header">
                <div className="context-text-div">
                    <h4>Items Claimed</h4>
                    <p>Review your items and pay with Venmo</p>
                </div>
            </div>
            <section className="receipt-page">
                <div id="column-receipt-topper">
                    <div id="receipt-top">
                        <ReceiptIcon size={50} className="receipt-svg"/>
                        <div>
                            <h4>{receipt ? receipt.merchant_name: "Merchant Name"}</h4>
                            <p>{receipt ? "Created At: " + receipt.created_at: "Loading"}</p>
                            <p>Venmo Handle: {receipt ? receipt.venmo_handle: "Loading"}</p>
                        </div>
                    </div>
                </div>
                <h4>Your Claimed Items</h4>
                {items ? renderParticipantItems() : undefined}

                <h3 id="receipt-totals-header">Review Items Totals</h3>
                <div className="totals-item">
                    <h4>Subtotal:</h4>
                    <p>${participantItems ? (Math.round(participantSubtotal*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item">
                    <h4>Tax:</h4>
                    <p>${participantItems ? (Math.round((participantSubtotal*taxPercent)*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item">
                    <h4>Tip:</h4>
                    <p>${participantItems ? (Math.round((participantSubtotal*tipPercent)*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item" id="last-totals-item">
                    <h4>Total:</h4>
                    <p>${participantItems ? (Math.round((participantSubtotal + participantSubtotal*taxPercent + participantSubtotal*tipPercent)*100)/100).toFixed(2): undefined}</p>
                </div>

                <button disabled={participantItems.length < 1} onClick={() => {
                    window.open(createVenmoLink(receipt.venmo_handle, participantSubtotal + participantSubtotal*taxPercent + participantSubtotal*tipPercent), "_blank")
                }} id = "venmo-btn">Pay With Venmo</button>
            </section>
        </div>
    )
}