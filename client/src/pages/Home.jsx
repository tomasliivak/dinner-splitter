import { NavLink } from "react-router-dom"
import { useRef } from "react"
import { useState } from "react"
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "./Home.css"
export default function Home() {
    const fileInputRef = useRef(null)
    const [ready, setReady] = useState(false)
    const navigate = useNavigate()

    async function handleFileUpload(e) {
        // upload file to backend
        const file = e.target.files[0]
        if (!file) return
        const formData = new FormData()
        formData.append("receipt", file)

        const res = await fetch("http://localhost:3000/api/receipts/scan", {
            method: "POST",
            body: formData,
        })

        const data = await res.json()
        console.log(data)
        e.target.value = null
        setReady(true)
      }

      useEffect(() => {
        if (ready) {
          navigate("/new")
        }
      }, [ready, navigate])
    
    return (
        <section id="home">
            <div>
                <h1>Split your receipt in seconds</h1>
                <h2>Upload a photo, claim items, pay friends</h2>
                
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