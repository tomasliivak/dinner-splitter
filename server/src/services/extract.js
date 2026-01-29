import OpenAI from "openai"
import dotenv from "dotenv"
dotenv.config()

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Note to do later, reduce the amount of tokens in the prompt while maintaining accuracy
function buildPrompt(ocrText) {
  return `
  Extract structured JSON data from a line by line text of a receipt(ocr)

  RECEIPT TEXT: 
  """
  ${ocrText}
  """
  Return ONLY valid JSON exactly matching:
  {
    "subtotal": number|null,
    "merchant_name": string,
    "tax": number|null,
    "tip": number|null,
    "total": number|null,
    "line_items": [{"name": string, "quantity": number|null, "unit_price": number|null, "price": number|null}]|null
  }
  
  Hard rules:
  - Output must be strict JSON. No comments, no trailing commas.
  - Numbers must be decimals with dot (e.g. 56.58). No currency symbols.
  - If unsure, use null (except: try hard to fill total and line items).
  - Parse line items line-by-line.
  - LINE ITEM HEURISTIC(IMPORTANT):
    1) Quantity-first format:: ^(\\d+)\\s+(.+?)\\s+(\\d+\\.\\d{2})$ then:
      quantity = first number
      name = middle text (trim)
      price = last number
    2) Name + price format:
    ^(.+?)\\s+(\\d+\\.\\d{2})$
    → quantity = 1
    → name = text
    → price = last number
    3) Embedded quantity like:
    "Item ( 2 @ 5.00 ) 10.00"
    → quantity = 2
    → unit_price = 5.00
    → price = 10.00
  - Do NOT drop obvious quantities. If a line begins with an integer followed by words, treat that integer as quantity unless it is clearly not a purchasable item line (e.g., address, phone, table, order number).
  - unit_price:
    If quantity > 1 AND price looks like total-for-line, set unit_price = price / quantity (rounded to 2 decimals).
    If quantity == 1, unit_price = price.
  - Ignore metadata lines (address, phone, server, table, guests, thank you, timestamps).
  - Totals:
    - subtotal from "SUB TOTAL" or similar
    - tax from "TAX" lines (sum if multiple)
    - total from the most likely final "TOTAL"
  LINE ITEM Examples:
  Input line: "2 Lunch 45.90" => {name:"Lunch", quantity:2, price:45.90, unit_price:22.95}
  Input line: "1 Coffee 3.00" => {name:"Coffee", quantity:1, price:3.00, unit_price:3.00}
  `.trim()
  }

  
  export async function extractReceipt(ocrText) {
    const prompt = buildPrompt(ocrText)
    
    async function call(promptText) {
      const res = await client.responses.create({
        model: "gpt-5-nano",
        reasoning: { effort: "minimal" },
        text: { verbosity: "low" },
        input: promptText
      })
  
      return res.output_text ?? ""
    }
  
    let lastError = ""
  
    // 2 attempts max (normal + retry) Though rn the retry attempt is kinda shoddy that it might not work anyways
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        
        console.time("llm_call");
        try {
          const outText = await call(
            attempt === 0
              ? prompt
              : `${prompt}\n\nPrevious attempt failed: ${lastError}\nTry again.`
          );
          console.log("outText length:", outText?.length);
          console.log(outText); // maybe too big, but ok for now
        } catch (e) {
          console.error("LLM call failed:", e);
          throw e; // or handle with res.status(500).json(...)
        } finally {
          console.timeEnd("llm_call");
        }


        const cleaned = outText
          .replace(/^```json/i, "")
          .replace(/```$/, "")
          .trim()
  
        const parsed = JSON.parse(cleaned)
  
        
        if (!parsed.merchant_name) throw new Error("missing merchant");
        if (!Array.isArray(parsed.line_items)) throw new Error("no items")
  
        const sum = parsed.line_items.reduce(
          (s, i) => s + (i.price ?? 0),
          0
        )
  
        if (parsed.subtotal && Math.abs(parsed.subtotal - sum) > 0.05) {
          throw new Error("subtotal mismatch")
        }
  
        
        return {
          ...parsed,
          subtotal: parsed.subtotal ?? undefined,
          tax: parsed.tax ?? undefined,
          tip: parsed.tip ?? undefined,
          line_items: parsed.line_items ?? undefined
        }
  
      } catch (err) {
        lastError = String(err)
      }
    }
    
    return undefined
  }
  

