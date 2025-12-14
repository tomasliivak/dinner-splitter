# Dinner Splitter

A mobile-first web app that lets groups split a restaurant bill by uploading a receipt, claiming items, and paying via Venmo.

## Features
- Upload a receipt photo
- Automatic item extraction (OCR)
- Item-by-item claiming via shareable link
- Automatic tax and tip splitting
- Venmo payment links
- No account required

## Tech Stack
**Frontend**
- React (Vite)
- Mobile-first UI

**Backend**
- Node.js
- Express
- OCR provider (e.g. Google Vision / AWS Textract)

## Project Structure
client/   # React frontend
server/   # Express backend

## Notes
- OCR accuracy depends on receipt quality
- Manual corrections are supported
- Receipts are intended for short-term use

## License
MIT
