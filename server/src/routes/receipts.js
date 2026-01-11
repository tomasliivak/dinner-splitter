import express from "express"
import multer from "multer"
import sharp from "sharp";
import { ocrReceiptImageBuffer } from "../services/ocr.js";
import { extractReceipt } from "../services/extract.js"

export const receiptsRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

receiptsRouter.post(
    "/scan",
    upload.single("receipt"),
    async (req, res) => {
        if (!req.file?.buffer) {
            return res.status(400).json({ error: "No file" })
        }
        const normalizedBuffer = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 2000, withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer();
        const text = await ocrReceiptImageBuffer(normalizedBuffer)

        const receipt = await extractReceipt(text)

        return res.json({ receipt })
    }
  )
  