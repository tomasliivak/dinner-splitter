import { NavLink } from "react-router-dom"
import { useRef } from "react"
import { useState } from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import  LoadingDots from "../components/LoadingDots"
import receiptMockup from "../assets/receipt-mockup.png"
import toast from "react-hot-toast"
const API_URL = import.meta.env.NODE == "production" ? import.meta.env.VITE_API_URL : "http://localhost:3000"


import "./Home.css"
export default function Home() {
    const fileInputRef = useRef(null)
    const [receiptId,setReceiptId] = useState()
    const [key, setKey] = useState()
    const [ready, setReady] = useState(false)
    const [loading, setLoading] = useState(false)
    const [participantId, setParticipantId] = useState()
    const navigate = useNavigate()
    // technically no way to fix this client side if it breaks but it shouldnt?
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
    async function handleFileUpload(e) {
        // upload file to backend
        const file = e.target.files[0]
        if (!file) return
        setLoading(true)
        const formData = new FormData()
        formData.append("receipt", file)
        formData.append("creatorId", participantId)

        const res = await fetch(`${API_URL}/api/receipts/scan`, {
            method: "POST",
            body: formData
            })
        
        const data = await res.json()

        if (!res.ok) {
            toast.error(data.error || "Server error")
            e.target.value = null
            setLoading(false)
            return
        }

        e.target.value = null
        setReceiptId(data.receipt_id)
        setKey(data.share_key)
        setLoading(false)
        setReady(true)
      }
      // sends user to receipt page with the url of the receiptId and key
      useEffect(() => {
        if (ready) {
            const nav = "/r/draft/" + receiptId + "?key=" + key
            navigate(nav)
        }
      }, [ready, navigate])
    
    async function onLoad() {
        let id = localStorage.getItem("participant_id");
            if (!id) {
            await registerParticipant(data.receipt.id)
            }
            else {
                setParticipantId(id)
            }
    }
    useEffect(() => {
        onLoad()
    },[]) 

    return (
        <section id="home">
                <div className="home-text">
                    <h1>Split your receipt in seconds</h1>
                    <h2>Upload a photo, claim items, pay friends</h2>
                </div>
                <img src={receiptMockup} alt="Split a receipt by tapping items and paying with Venmo" className="hero-phone"/>
                <div className="upload-cta">
                    {loading && <LoadingDots/>}
                    <button onClick={() => fileInputRef.current.click()}>
                        Upload Receipt
                </button>
                    <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handleFileUpload}
                    name="receipt"
                    />
                </div>
            
        </section>
    )
}