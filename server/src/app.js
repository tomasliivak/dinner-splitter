import 'dotenv/config'
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit";
import { pool } from "./db.js"
import { receiptsRouter } from "./routes/receipts.js"


const app = express()
app.set("trust proxy", 1)
/*change cors once I deploy vercel 
const allowedOrigins = [
  "http://localhost:5173",
  "https://YOUR_VERCEL_DOMAIN.vercel.app",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allows curl/postman
    cb(null, allowedOrigins.includes(origin));
  }
}));
*/
app.use(cors())
app.use(express.json({ limit: "20kb" }))

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(generalLimiter)

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url)
  next()
})

app.get("/health", async (req, res) => {
  const r = await pool.query("SELECT 1 as ok");
  res.json(r.rows[0]);
})

app.use("/api/receipts", receiptsRouter)

export default app
