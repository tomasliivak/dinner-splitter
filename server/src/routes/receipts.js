import express from "express"
import multer from "multer"
import sharp from "sharp"

import rateLimit from "express-rate-limit";

import crypto from "crypto"
import { pool } from "../db.js"

import { ocrReceiptImageBuffer } from "../services/ocr.js"
import { extractReceipt } from "../services/extract.js"

export const receiptsRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const scanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many scans. Try again later." },
  })
const badLiterals = new Set(["undefined", "null"]);

function validateString(value, { min = 0, max = 100, regex } = {}) {
if (typeof value !== "string") return undefined;

const trimmed = value.trim();
if (!trimmed) return undefined;
if (badLiterals.has(trimmed.toLowerCase())) return undefined;

if (trimmed.length < min || trimmed.length > max) return undefined;
if (regex && !regex.test(trimmed)) return undefined;

return trimmed;
}
function isValidNumber(x, { min = -Infinity, max = Infinity } = {}) {
    return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max
}
function validateItem(item) {
    if (typeof item !== "object" || item === null) return false;
    const receiptId = validateString(item.receipt_id, { regex: /^[0-9a-f-]{36}$/i })
    const itemId = validateString(item.id, { regex: /^[0-9a-f-]{36}$/i })
    const quantity = Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1 && Number(item.quantity) <= 100
    const price = isValidNumber(Number(item.line_total))
    const unitPrice = isValidNumber(Number(item.unit_price))
    const name = validateString(item.name)
    if (!receiptId || !itemId || !quantity || !price || !unitPrice || !name) {
        return false
    }
    return true
}

function validateReceipt(receipt) {
    const share_key = validateString(receipt.share_key)
    const merchant_name = validateString(receipt.merchant_name)
    const subTotal = isValidNumber(Number(receipt.subtotal))
    let tax = 0;
    if (receipt.tax != null) {
        tax = isValidNumber(Number(receipt.tax))
    }
    else {
        tax = true
    }
    let tip = 0;
    if (receipt.tip != null) {
        tip = isValidNumber(Number(receipt.tip))
    }
    else {
        tip = true
    }
    const total = isValidNumber(Number(receipt.total))
    const venmoHandle = validateString(receipt.venmo_handle)
    const creator = validateString(receipt.creator)
    const creator_id = validateString(receipt.creator_id)
    const id = validateString(receipt.id, { regex: /^[0-9a-f-]{36}$/i })
    if (!share_key || !merchant_name || !subTotal || !tax || !tip || !total || !venmoHandle || !creator || !creator_id || !id) {
        return false
    }
    return true
}

function createVenmoLink(venmoHandle, total) {
    const params = new URLSearchParams({
        txn: "pay",
        recipients: venmoHandle,
        amount: total.toFixed(2),
        note: "usedivvy.app"
    })

    return `https://venmo.com/?${params.toString()}`
}
function hashToken(token) {
    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")
  }
//add error handling to this asap, has failed me once
receiptsRouter.post(
    "/scan", scanLimiter,
    upload.single("receipt"),
    async (req, res) => {
        if (!req.file?.buffer) {
            return res.status(400).json({ error: "No file" })
        }
        const creatorId = validateString(req.body.creatorId)

        if (!creatorId) {
            return res.status(400).json({error: "Invalid Creator Id"})
        }
        

        const normalizedBuffer = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 2000, withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toBuffer()

        let text = ""
        try {
            text = await ocrReceiptImageBuffer(normalizedBuffer)
        }
        catch {
            return res.status(400).json({error:"Try again. Bad Receipt", receipt:"null"})
        }
        
        
        const receipt = await extractReceipt(text)
        if (!receipt) {
            return res.status(400).json({
                error:"Try again. Failed to Extract Receipt",
                receipt: "null"
            })
        }

        const share_key = crypto.randomBytes(16).toString("hex")
        
        const client = await pool.connect()

        let venmo_handle = "placeholder"
        let creator = "placeholder"
        try {
            await client.query("BEGIN")

            const receiptResult = await client.query(
                `
                INSERT INTO receipts (share_key, merchant_name, subtotal, tax, tip, total, venmo_handle, creator, creator_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
                `,
                [share_key,receipt.merchant_name, receipt.subtotal, receipt.tax, receipt.tip, receipt.total, venmo_handle, creator, creatorId]
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
            console.log(err)
            res.status(400).json({error:"Upload Failed"})
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
        const receiptId = validateString(req.query.receiptId)
        const shareKey = validateString(req.query.shareKey)
        if (!receiptId || !shareKey) {
            return res.status(400).json({error: "Invalid Receipt Id or Share Key"})
        }
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
            return res.status(404).json({ error: "Receipt Not Found" })
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
        const receiptId = validateString(req.body.receiptId)
        const participantId = validateString(req.body.participantId)
        if (!receiptId || !participantId) {
            return res.status(400).json({error: "Invalid Receipt Id or Participant Id"})
        }
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
        
        const claimedItems = req.body.claimedItems
        const venmoHandle = validateString(req.body.venmoHandle)
        const tipPercent = req.body.tipPercent
        const taxPercent = req.body.taxPercent
        const participantToken = validateString(req.get("Participant-Token"))

        if (!participantToken || !venmoHandle) {
            return res.status(400).json({error: "Invalid Participant Id or Venmo Handle"})
        }
        if (!isValidNumber(Number(tipPercent), { min: 0, max: 100 }) || !isValidNumber(Number(taxPercent), { min: 0, max: 100 })) {
            return res.status(400).json({ error: "Invalid Tip or Tax" })
        }

        for (const item of claimedItems) {
            if (!validateItem(item)) {
                return res.status(400).json({ error: "Invalid Item" })
            }
        }
        if (claimedItems.length > 100) {
            return res.status(400).json({ error: "Too Many Items" });
        }
        
        const hashed = hashToken(participantToken)

        const participant = await pool.query(
            `SELECT id FROM participants WHERE token_hash = $1`,
            [hashed]
        )
        if (!participant.rows.length === 0) {
            return res.status(400).json({error: "Participant Doesnt Exist"})
        }
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
            return res.status(400).json({error: "Item Already Claimed, Refreshing..."})
        } finally {
            client.release()
        }
    }
)

receiptsRouter.post("/unclaim",
    async(req,res) => {
        const item = req.body.item
        const receiptId = req.body.receiptId
        if (!validateItem(item)) {
            return res.status(400).json({ error: "Invalid Item" })
        }
        if (!validateString(receiptId)) {
            return res.status(400).json({ error: "Invalid Receipt Id" })
        }

        const claims = await pool.query(
            `
                DELETE FROM claims
                WHERE receipt_item_id = $1
                AND receipt_id = $2
                RETURNING *
            `, [item.id,receiptId]
        )
        if (!claims.rows[0]) {
            return res.status(400).json({error: "Couldn't Find Claimed Item"})
        }
        return res.json({removed: claims.rows[0]})
    }
)

receiptsRouter.patch("/update", 
    async(req,res) => {
        const receipt = req.body.receipt
        const items = req.body.items
        const creatorName = validateString(req.body.creatorName)
        const venmoHandle = validateString(req.body.venmoHandle)

        if (!creatorName || !venmoHandle) {
            return res.status(400).json({ error: "Invalid Creator Name or Venmo Handle" })
        } 
        for (const item of items) {
            if (!validateItem(item)) {
                return res.status(400).json({ error: "Invalid Item in Claimed Items" })
            }
        }
        if (items.length > 100) {
            return res.status(400).json({ error: "Too Many Items" });
        }
        if (!validateReceipt(receipt)) {
            return res.status(400).json({ error: "Invalid Receipt"})
        }

        // probably should add checks if these are valid formats of things. 
        let subtotal = 0
        for (const item of items) {
            subtotal += Number(item.line_total)
        }
        let total = Number(receipt.tip) + Number(receipt.tax) + Number(subtotal)

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
                `, [receipt.merchant_name,creatorName,venmoHandle,subtotal,receipt.tax,receipt.tip,total,"active",receipt.id]
            )
            
            let existingItemsIds = items.filter(item => item.id).map(item => item.id)
            await client.query(
                `DELETE FROM receipt_items
                 WHERE receipt_id = $1
                   AND id <> ALL($2::uuid[])`,
                [receipt.id, existingItemsIds]
              )
            
            for (const item of items) {
                if (item.quantity == null) {
                    item.quantity = 1
                }
                if (item.id) {
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
                else {
                    const added = await client.query(
                        `
                        INSERT INTO receipt_items
                          (receipt_id, name, quantity, unit_price, line_total)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *
                        `,
                        [item.receipt_id, item.name, item.quantity, item.line_total, item.line_total]
                      )
                }
              }
            await client.query("COMMIT")
            return res.json({updated:true})
        } catch (err) {
            await client.query("ROLLBACK")
            return res.status(400).json({error : "Update Failed"})
        } finally {
            client.release()
        }
    }
)