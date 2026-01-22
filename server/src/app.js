import 'dotenv/config'
import path from "path"
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit";

import { receiptsRouter } from "./routes/receipts.js"


const app = express()
app.set("trust proxy", 1)
app.use(cors())
app.use(express.json())

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(generalLimiter)
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
