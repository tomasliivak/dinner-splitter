import vision from "@google-cloud/vision";

const visionClient = new vision.ImageAnnotatorClient();

export async function ocrReceiptImageBuffer(imageBuffer) {
  // Use DOCUMENT_TEXT_DETECTION for receipts (usually better structure than plain TEXT_DETECTION)
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBuffer },
  });
  console.log(result)
  const fullText = result?.fullTextAnnotation?.text ?? "";
  return fullText.trim();
}
