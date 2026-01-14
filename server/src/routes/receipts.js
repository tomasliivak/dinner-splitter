import express from "express"
import multer from "multer"
import sharp from "sharp"

import crypto from "crypto"
import { pool } from "../db.js"

import { ocrReceiptImageBuffer } from "../services/ocr.js"
import { extractReceipt } from "../services/extract.js"

export const receiptsRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

function hashToken(token) {
    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  }

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

// Note: definetly need to go through all of these and add error handling. Also need to go through a standardize variable names cus they are a bit effy rn
// Additional Note: Go through and add the proper status codes for the different responses
// four dbs are receipts, receipt_items, participants, and claims
// definetly need to go through and protect stuff from sql injection as well, and such
receiptsRouter.get(
    "/retrieve",
    async (req,res) => {
        const { receiptId,shareKey } = req.query
        let items = []
        const result = await pool.query(
            `
            SELECT *
            FROM receipts
            WHERE id = $1
            AND share_key = $2
            LIMIT 1
            `, 
            [receiptId, shareKey])
        if (result.rows.length == 0) {
            return res.status(404).json({ error: "Receipt not found" })
        }
        else {
        items = await pool.query(
            `
            SELECT *
            FROM receipt_items
            WHERE receipt_id = $1
            `,
            [receiptId]
        )
        }

        return res.json({receipt:result.rows[0], items:items.rows})
    }
)
receiptsRouter.post("/register",
    async(req,res) => {

        const { receiptId, participantId } = req.body

        const hashed = hashToken(participantId)

        //also eventually need venmo_handle and display_name
        const displayName = "development"

        const result = await pool.query(
            `
            INSERT INTO participants (receipt_id,display_name, token_hash)
            VALUES ($1,$2,$3)
            RETURNING *
            `, [receiptId,displayName,hashed]
        )
        console.log(result)
        return res.status(201).json({participant: result.rows[0]})
    }
)