import express from "express"
import multer from "multer"
import sharp from "sharp"

import crypto from "crypto"
import { pool } from "../db.js"

import { ocrReceiptImageBuffer } from "../services/ocr.js"
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
            .toBuffer()
        const text = await ocrReceiptImageBuffer(normalizedBuffer)

        const receipt = await extractReceipt(text)
        
        const share_key = crypto.randomBytes(16).toString("hex")
        
        const client = await pool.connect()

        try {
            await client.query("BEGIN")

            const receiptResult = await client.query(
                `
                INSERT INTO receipts (share_key, merchant_name, subtotal, tax, tip, total)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                `,
                [share_key,receipt.merchant_name, receipt.subtotal, receipt.tax, receipt.tip, receipt.total]
            )
            let receiptRow = receiptResult.rows[0]
            
            const insertedItems = []
            const items = receipt.line_items

            for (const item of items) {
                if (item.quantity == null) {
                    item.quantity = 1
                }
                const { rows } = await client.query(
                  `
                  INSERT INTO receipt_items
                    (receipt_id, name, quantity, unit_price, line_total)
                  VALUES ($1, $2, $3, $4, $5)
                  RETURNING *
                  `,
                  [receiptRow.id, item.name, item.quantity, item.unit_price, item.price]
                )
            
                insertedItems.push(rows[0])
              }
            
            await client.query("COMMIT")

            return res.json({created:true,receipt_id:receiptRow.id,share_key:share_key})
        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }

    }
  )
  