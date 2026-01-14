import vision from "@google-cloud/vision";

const visionClient = new vision.ImageAnnotatorClient();

function getWord (word) {
  return word.symbols.map(s => s.text ? s.text : "").join("")
}

function getMedianHeight(words) {
  let wordHeights = []
  for (const word of words) {
    wordHeights.push(Math.abs(word.vertices[3].y-word.vertices[0].y))
  }

  wordHeights.sort((a, b) => a - b)
  const median = wordHeights[Math.floor(wordHeights.length / 2)]
  return median
}

function getLines(words,median) {
  
  const lines = []
  for (const word of words) {
    let word_center_y = word.vertices[3].y < word.vertices[0] ? word.vertices[3].y +(Math.abs(word.vertices[3].y-word.vertices[0].y)/2) : word.vertices[0].y +(Math.abs(word.vertices[3].y-word.vertices[0].y)/2)
    let found = false
    if (lines.length > 0) {
      for (const line of lines) {
        if (Math.abs(word_center_y - line.y) <= median) {
          line.text = line.text + " " + word.text
          line.y = (line.y+word_center_y)/2
          found = true
          break
        }
      }
      if (!found) {
        lines.push({text : word.text, y : word_center_y})
      }
    }
    else {
      lines.push({text : word.text, y : word_center_y})
    }
  }
  return lines
} 

function linesToString(lines) {
  let sortedLines = lines.sort((a, b) => a.y - b.y)
  let ocrString = ""
  for (const line of sortedLines) {
    ocrString = ocrString + line.text + "\n"
  }
  return ocrString
}

export async function ocrReceiptImageBuffer(imageBuffer) {
  
  // Use DOCUMENT_TEXT_DETECTION for receipts (usually better structure than plain TEXT_DETECTION)
  // removed documentTextDetection
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBuffer },
  });
  
  let words = []
  for (const page of result.fullTextAnnotation.pages) {
    for (const block of page.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const word of paragraph.words) {
          const text = getWord(word)
          const vertices = word.boundingBox.vertices
          words.push({text,vertices})
        }
      }
    }
  }

  const median = getMedianHeight(words)
  const lines = getLines(words,median)
  
  const ocrString = linesToString(lines)
  
  
  // const fullText = result?.fullTextAnnotation?.text ?? "";
  return ocrString;
}
