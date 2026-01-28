import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import ReceiptPage from "./pages/ReceiptPage.jsx"
import Header from "./components/Header.jsx"
import EditorPage from "./pages/EditorPage.jsx"
import { Toaster } from "react-hot-toast";
import './App.css'

export default function App() {
  
  return (
    <div className="page">
      <div className="app">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "white",
            borderRadius: "14px"
          },
          error: {
            style: {
              background: "#1f2937"
            }
          }
        }}
      />
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


