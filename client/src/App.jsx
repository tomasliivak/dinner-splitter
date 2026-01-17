import { useState } from 'react'
import { Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import ReceiptPage from "./pages/ReceiptPage.jsx"
import Header from "./components/Header.jsx"
import EditorPage from "./pages/EditorPage.jsx"

import './App.css'

export default function App() {
  
  return (
    <div className="page">
      <div className="app">
        <Header/>
        <main>
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/r/draft/:receiptId" element={<EditorPage/>}/>
            <Route path="/r/:receiptId" element={<ReceiptPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}


