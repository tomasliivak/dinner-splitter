import { useState } from 'react'
import { Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import ReceiptPage from "./pages/ReceiptPage"


import './App.css'

export default function App() {
  
  return (
    <div className="page">
      <div className="app">
        <main>
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/r/:receiptId" element={<ReceiptPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}


