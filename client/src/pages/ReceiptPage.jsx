import { useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import ReceiptItem from "../components/ReceiptItem.jsx"
export default function ReceiptPage() {
    // this probably would break if something put in a random url for now. 
    // also would break if some just went to /r with nothing else with it
    const [receiptId,setReceiptId] = useState(useLocation().pathname.split("/")[2])
    const [shareKey, setShareKey] = useState(useLocation().search.split("=")[1])
    const [items, setItems] = useState()
    const [receipt, setReceipt] = useState()
    const [activeItems, setActiveItems] = useState([])
    const [participantId, setParticipantId] = useState()


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
    // handles participant registration
    async function registerParticipant(receiptId) {
        let id = crypto.randomUUID(); // browser-native, secure
        localStorage.setItem("participant_id", id)
        const res = await fetch("http://localhost:3000/api/receipts/register", {
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

    }
    // handles startup/calling to get the initial receipt and will also probably be used for refreshes later
    useEffect(() => {
        async function loadReceipt() {
            const data = await getReceipt()
            setItems(data.items)
            setReceipt(data.receipt)

            let id = localStorage.getItem("participant_id");
            if (!id) {
            await registerParticipant(data.receipt.id)
            }
            else {
                setParticipantId(id)
            }
        }
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
    // stopped working here
    async function claimItems(items) {
        const res = await fetch("http://localhost:3000/api/receipts/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Participant-Token" : participantId },
            body: JSON.stringify({claimedItems: items})
            }
        )
        const data = await res.json()
        window.open(data.venmoLink, "_blank")
    }
    function renderItems() {
        return items.map((item) => <ReceiptItem item={item} onClick={itemClick} activeItems={activeItems}/>)
    }
    return (
        <section>
            <h1>Your receipt</h1>
            {items ? renderItems() : undefined}
            <button disabled={activeItems.length < 1} onClick={() => {
                payClick()
            }}>Pay Now</button>
            <h3>Receipt:{receipt ? receipt.merchant_name: null}</h3>
        </section>
    )
}