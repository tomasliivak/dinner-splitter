import 'dotenv/config'
import path from "path"
import express from "express"
import cors from "cors"

import { receiptsRouter } from "./routes/receipts.js"


const app = express()

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve("../client/dist")
  app.use(express.static(distPath))

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
}
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url)
  next()
})

app.use("/api/receipts", receiptsRouter)

export default app
