import { useState } from 'react'
import { Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import NewReceipt from "./pages/NewReceipt"


import './App.css'

export default function App() {
  
  return (
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/new" element={<NewReceipt />} />
        </Routes>
      </main>
    </div>

  )
}


