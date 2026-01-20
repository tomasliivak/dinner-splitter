import express from "express"
import multer from "multer"
import sharp from "sharp"

import crypto from "crypto"
import { pool } from "../db.js"

import { ocrReceiptImageBuffer } from "../services/ocr.js"
import { extractReceipt } from "../services/extract.js"

export const receiptsRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

function createVenmoLink(venmoHandle,total) {
    // https://venmo.com/?txn=pay&recipients=tomasliivak&amount=10&note=dinner
    //maybe eventually add custom labels but feels irrelevant rn. Replace the note with the name of the app?
    let link = "https://venmo.com/?txn=pay&recipients=" + venmoHandle + "&amount=" + total +"&note=dinner"
    return link
}
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

        let venmo_handle = "default"
        let creator = "development"
        try {
            await client.query("BEGIN")

            const receiptResult = await client.query(
                `
                INSERT INTO receipts (share_key, merchant_name, subtotal, tax, tip, total, venmo_handle, creator)
                VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
                RETURNING *
                `,
                [share_key,receipt.merchant_name, receipt.subtotal, receipt.tax, receipt.tip, receipt.total, venmo_handle, creator]
            )
            let receiptRow = receiptResult.rows[0]
            
            const insertedItems = []
            const items = receipt.line_items
            
            for (const item of items) {
                if (item.quantity == null) {
                    item.quantity = 1
                }
                // eventually need to make partial claiming allowed, but workaround for mvp for now.
                if (item.quantity > 1) {
                    for (let i = 0;i<item.quantity;i++) {
                        const { rows } = await client.query(
                            `
                            INSERT INTO receipt_items
                              (receipt_id, name, quantity, unit_price, line_total)
                            VALUES ($1, $2, $3, $4, $5)
                            RETURNING *
                            `,
                            [receiptRow.id, item.name, 1, item.unit_price, item.unit_price]
                          )
                        
                        insertedItems.push(rows[0])
                    }
                }
                else {
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
        let claimedItems = []
        // prolly should make this all one instance so if something fails it doesnt get messed up + the state of the dbs is all the same as it goes through it
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
        claimedItems = await pool.query(
            `
            SELECT *
            FROM claims
            WHERE receipt_id = $1
            `,
            [receiptId]
        )
        }
        return res.json({receipt:result.rows[0], items:items.rows, claims:claimedItems.rows})
    }
)
// for future notice, need to make this so if the participant has a localStorage but not a id in the participant table, redo it
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
        return res.status(201).json({participant: result.rows[0]})
    }
)

receiptsRouter.post("/claim",
    async(req,res) => {
        const { claimedItems, venmoHandle, tipPercent, taxPercent} = req.body
        const participantToken = req.get("Participant-Token")
        const hashed = hashToken(participantToken)

        const participant = await pool.query(
            `SELECT id FROM participants WHERE token_hash = $1`,
            [hashed]
          )
        
        const participantId = participant.rows[0].id
        let total = 0
        for (const item of claimedItems) {
            total += Number(item.line_total)
        }
        total += total*Number(tipPercent) + total*Number(taxPercent)
        total = Math.round(total*100)/100
        const client = await pool.connect()
        try {
            await client.query("BEGIN")
            const insertedItems = []

            for (const item of claimedItems) {
                if (item.quantity == null) {
                    item.quantity = 1
                }
                const { rows } = await client.query(
                  `
                  INSERT INTO claims (receipt_id,receipt_item_id,participant_id,quantity_claimed)
                  VALUES ($1,$2,$3,$4)
                  RETURNING *
                  `,
                  [item.receipt_id,item.id,participantId,item.quantity]
                )
            
                insertedItems.push(rows[0])
              }
            
            await client.query("COMMIT")
            let link = createVenmoLink(venmoHandle,total)
            return res.json({created:true,createdClaims:insertedItems,venmoLink:link})
        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }
)

receiptsRouter.post("/unclaim",
    async(req,res) => {
        const { item } = req.body
        const claims = await pool.query(
            `
                DELETE FROM claims
                WHERE receipt_item_id = $1
                RETURNING *;
            `, [item.id]
        )
        return res.json({removed: claims.rows[0]})
    }
)

receiptsRouter.patch("/update", 
    async(req,res) => {
        const { receipt, items, creatorName, venmoHandle } = req.body
        // probably should add checks if these are valid formats of things. 
        console.log(items)
        console.log(receipt)
        const client = await pool.connect()
        try {
            await client.query("BEGIN")

            const updatedReceipt = await client.query(
                `
                UPDATE receipts
                SET 
                    merchant_name = $1,
                    creator = $2,
                    venmo_handle = $3,
                    subtotal = $4,
                    tax = $5,
                    tip = $6,
                    total = $7,
                    status = $8,
                    updated_at = NOW()
                WHERE id = $9
                `, [receipt.merchant_name,creatorName,venmoHandle,receipt.subtotal,receipt.tax,receipt.tip,receipt.total,"active",receipt.id]
            )

            for (const item of items) {
                if (item.quantity == null) {
                    item.quantity = 1
                }
                const { rows } = await client.query(
                  `
                UPDATE receipt_items
                SET
                    name = $1,
                    quantity = $2,
                    unit_price = $3,
                    line_total = $4
                WHERE id = $5
                  `,
                  [item.name,item.quantity,item.unit_price,item.line_total,item.id]
                )
        
              }
            await client.query("COMMIT")
            return res.json({updated:true})
        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }
)