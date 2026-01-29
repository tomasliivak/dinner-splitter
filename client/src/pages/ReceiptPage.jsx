import { useLocation } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import ReceiptItem from "../components/ReceiptItem.jsx"
import ReceiptIcon from "../components/ReceiptIcon.jsx"
import "./ReceiptPage.css"

import ClaimedReceiptItem from "../components/ClaimedReceiptItem.jsx"
const API_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

export default function ReceiptPage() {
    // this probably would break if something put in a random url for now. 
    // also would break if some just went to /r with nothing else with it
    const [receiptId,setReceiptId] = useState(useLocation().pathname.split("/")[2])
    const [shareKey, setShareKey] = useState(useLocation().search.split("=")[1])
    const [items, setItems] = useState()
    const [receipt, setReceipt] = useState()
    const [activeItems, setActiveItems] = useState([])
    const [participantId, setParticipantId] = useState()
    const [claimedItems, setClaimedItems] = useState()
    const [showClaimed, setShowClaimed] = useState(false)
    const [taxPercent, setTaxPercent] = useState(0)
    const [tipPercent, setTipPercent] = useState(0)
    const [claimedSubtotal, setClaimedSubtotal] = useState(0)
    const [activeItemsSubtotal, setActiveItemsSubtotal] = useState(0)


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
    // handles participant registration. Need to add something that happens when it returns not okay
    async function registerParticipant(receiptId) {
        let id = crypto.randomUUID()
        localStorage.setItem("participant_id", id)
        setParticipantId(id)
        const res = await fetch(`${API_URL}/api/receipts/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
              },
            body: JSON.stringify({
                "receiptId" : receiptId,
                "participantId" : id
            })
        }
        )
        const data = await res.json()
        
        if (!res.ok) {
            toast.error(data.error || "Server error")
            return
        }
    }
    // handles startup/calling to get the initial receipt and will also probably be used for refreshes later
    // need to add check for a proper link. If not proper link, re-nav to error page. 
    async function loadReceipt() {
        setActiveItems([])
        const data = await getReceipt()
        setClaimedItems(data.claims)
        setItems(data.items)
        setReceipt(data.receipt)
        setTaxPercent(data.receipt.tax/data.receipt.subtotal)
        setTipPercent(data.receipt.tip/data.receipt.subtotal)
        let id = localStorage.getItem("participant_id");
        if (!id) {
            await registerParticipant(data.receipt.id)
        }
        else {
            setParticipantId(id)
        }
    }
    useEffect(() => {
        loadReceipt()
    }, []
    )


    function itemClick(item) {
        
        if (!activeItems.includes(item)) {
            setActiveItems((prev) => [...prev,item])
        }
        else {
            setActiveItems((prev) => prev.filter(prevItem => prevItem != item))
        }
        
    }
    
    function payClick() {
        claimItems(activeItems)
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

    useMemo(() => {
        if (claimedItems) {
            let claimedItemIds = new Set(claimedItems.map(prev => prev.receipt_item_id))
            let total = 0
            for (const item of items) {
                if (claimedItemIds.has(item.id)) {
                    total += Number(item.line_total)
                    
                }
            }
            setClaimedSubtotal(total)
        }
        else {
            setClaimedSubtotal(0)
        }
    },[claimedItems])

    useMemo(() => {
        if (activeItems) {
            
            let total = 0
            for (const item of activeItems) {
                    total += Number(item.line_total)
            }
            setActiveItemsSubtotal(total)
        }
        else {
            setActiveItemsSubtotal(0)
        }
    },[activeItems])
    // just realized the URL payment isnt correct cus it doesnt include tax or tip. 
    async function claimItems(items) {
        const res = await fetch(`${API_URL}/api/receipts/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Participant-Token" : participantId },
            body: JSON.stringify({claimedItems: items, venmoHandle: receipt.venmo_handle, taxPercent: taxPercent, tipPercent: tipPercent })
            }
        )
        const data = await res.json()

        if (!res.ok) {
            loadReceipt()
            toast.error(data.error || "Server error")
            return
        }

        loadReceipt()
        setActiveItems([])
        const isTouch = window.matchMedia("(pointer: coarse)").matches;
        if(isTouch) {
            window.location.href = data.venmoLink
        }
        else {
            window.open(data.venmoLink, "_blank")
        }
    }
    
    function renderItems() {
        if (!claimedItems) {
            return items.map((item) => <ReceiptItem key={item.id} item={item} onClick={itemClick} activeItems={activeItems}/>)
        }
        else {
            let claimedItemIds = new Set(claimedItems.map(prev => prev.receipt_item_id))
            return items.filter(item => !claimedItemIds.has(item.id)).map((item) => <ReceiptItem key={item.id} item={item} onClick={itemClick} activeItems={activeItems}/>)
        }
    }
    function renderClaimedItems() {
        if (!claimedItems) {
            return undefined
        }
        else {
            let claimedItemIds = new Set(claimedItems.map(prev => prev.receipt_item_id))
            return items.filter(item => claimedItemIds.has(item.id)).map((item) => <ClaimedReceiptItem key={item.id} item={item} onClick={removeClaimClick}/>)
        }
    }

    function removeClaimClick(item) {
        removeClaimedItem(item)
    }

    async function removeClaimedItem(item) {
        const res = await fetch(`${API_URL}/api/receipts/unclaim`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({item: item, receiptId: receipt.id})
            }
        )
        const data = await res.json()
        
        if (!res.ok) {
            loadReceipt()
            toast.error(data.error || "Server error")
            return
        }

        let newClaimed = claimedItems.filter(claim => claim.id !== data.removed.id)
        setClaimedItems(newClaimed)
    }
    async function handleShare() {
        const url = window.location.href;
      
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Split this receipt from ${receipt.merchant_name}`,
              text: "Join and claim your items:",
              url
            });
            return;
          } catch {}
        }
      
        // fallback
        navigator.clipboard.writeText(url);
      }
      // remove the outer div depending what I do
    return (
        <div>
            {receipt ? receipt.creator_id == participantId ?
                <div className="context-header">
                    <div className="context-text-div">
                        <h4>Receipt Ready</h4>
                        <p>Share this link with friends so they can claim their items and pay you.</p>
                    </div>
                    <button className="share-btn" onClick={handleShare}>Share with friends</button>
                </div> 
                : 
                <div className="context-header">
                    <div className="context-text-div">
                        <h4>You've Been Invited To Split A Receipt </h4>
                        <p>Claim your items and pay with venmo</p>
                    </div>
                </div>
                : undefined}
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
                <h4>Click to claim your items:</h4>
                {items ? renderItems() : undefined}
                <button onClick={() => {
                    setShowClaimed((prev) => !prev)
                }} id="show-claimed-btn">
                See Claimed Items {showClaimed ? "▾" : "▸" }
                </button>
                {showClaimed ? <p id="remove-header">Click on item to remove claim</p> : undefined}
                {showClaimed ? renderClaimedItems() : undefined}
                <div className="items-div">
                </div>
                <h3 id="receipt-totals-header">Remaining Receipt Totals</h3>
                <div className="totals-item">
                    <h4>Subtotal:</h4>
                    <p>${receipt ? (Math.round((receipt.subtotal-claimedSubtotal)*100)/100).toFixed(2): "subtotal"}</p>
                </div>
                <div className="totals-item">
                    <h4>Tax:</h4>
                    <p>${receipt ? (Math.round((receipt.tax-(claimedSubtotal*taxPercent))*100)/100).toFixed(2): "tax"}</p>
                </div>
                <div className="totals-item">
                    <h4>Tip:</h4>
                    <p>${receipt ? receipt.tip ? (Math.round((receipt.tip-(claimedSubtotal*tipPercent))*100)/100).toFixed(2): "0": undefined}</p>
                </div>
                <div className="totals-item" id="last-totals-item">
                    <h4>Balance Due:</h4>
                    <p>${receipt ?(Math.round((receipt.total-(claimedSubtotal + claimedSubtotal*taxPercent + claimedSubtotal*tipPercent))*100)/100).toFixed(2): "total"}</p>
                </div>
                <div className="items-div">
                </div>
                <h3 id="receipt-totals-header">Review Selected Items Totals</h3>
                <div className="totals-item">
                    <h4>Subtotal:</h4>
                    <p>${activeItems ? (Math.round(activeItemsSubtotal*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item">
                    <h4>Tax:</h4>
                    <p>${activeItems ? (Math.round((activeItemsSubtotal*taxPercent)*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item">
                    <h4>Tip:</h4>
                    <p>${activeItems ? (Math.round((activeItemsSubtotal*tipPercent)*100)/100).toFixed(2) : undefined}</p>
                </div>
                <div className="totals-item" id="last-totals-item">
                    <h4>Total:</h4>
                    <p>${activeItems ? (Math.round((activeItemsSubtotal + activeItemsSubtotal*taxPercent + activeItemsSubtotal*tipPercent)*100)/100).toFixed(2): undefined}</p>
                </div>
                <button disabled={activeItems.length < 1} onClick={() => {
                    payClick()
                }} id = "venmo-btn">Pay With Venmo</button>
            </section>
        </div>
    )
}