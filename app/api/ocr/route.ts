import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { pipeline } from 'stream/promises';

// --- CONFIGURATION ---
const TESS_VERSION = '5.1.0';
const CORE_VERSION = '5.1.0';

// URLs to download (We need all 3 parts: Worker, Core JS, Core WASM)
const CDN_BASE = `https://cdn.jsdelivr.net/npm`;
const WORKER_URL = `${CDN_BASE}/tesseract.js@${TESS_VERSION}/dist/worker.min.js`;
const CORE_JS_URL = `${CDN_BASE}/tesseract.js-core@${CORE_VERSION}/tesseract-core.wasm.js`;
const CORE_WASM_URL = `${CDN_BASE}/tesseract.js-core@${CORE_VERSION}/tesseract-core.wasm`;

// --- HELPERS ---

// Download a file from URL to local disk
async function downloadFile(url: string, outputPath: string) {
  if (fs.existsSync(outputPath)) return; // Skip if already downloaded (Warm Cache)

  console.log(`Downloading ${url} to ${outputPath}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  
  // Use Node.js stream pipeline to write file
  // @ts-ignore - response.body is a stream in Node
  await pipeline(res.body, fs.createWriteStream(outputPath));
}

function getMealType(date: Date): string {
  const hour = date.getHours();
  if (hour >= 7 && hour < 11) return 'Breakfast';
  if (hour >= 12 && hour < 16) return 'Lunch';
  if (hour >= 17 && hour < 19) return 'Snacks';
  if (hour >= 19 || hour < 4) return 'Dinner';
  return 'Other';
}

// --- API HANDLER ---

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. SETUP PATHS IN /tmp (The only writable directory on Vercel)
    const tmpDir = os.tmpdir();
    const workerPath = path.join(tmpDir, 'worker.min.js');
    const coreJsPath = path.join(tmpDir, 'tesseract-core.wasm.js');
    const coreWasmPath = path.join(tmpDir, 'tesseract-core.wasm');
    const langPath = path.join(tmpDir, 'tesseract_lang_data');

    // 2. DOWNLOAD BINARIES (If missing)
    await Promise.all([
      downloadFile(WORKER_URL, workerPath),
      downloadFile(CORE_JS_URL, coreJsPath),
      downloadFile(CORE_WASM_URL, coreWasmPath)
    ]);

    // Ensure lang directory exists
    if (!fs.existsSync(langPath)) {
      fs.mkdirSync(langPath, { recursive: true });
    }

    // 3. INITIALIZE WORKER WITH LOCAL PATHS
    const worker = await createWorker('eng', 1, {
      workerPath: workerPath,     // Point to local /tmp/worker.min.js
      corePath: coreJsPath,       // Point to local /tmp/tesseract-core.wasm.js
      cachePath: langPath,        // Save language data to /tmp
      logger: m => console.log(m),
    });

    // 4. RUN OCR
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();

    console.log("OCR Success:", text.substring(0, 100) + "...");

    // 5. PARSE DATA (Regex)
    const billPattern = /Bill\s*No\D*?(\d+)[\s\S]*?Date\D*?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?Total\D*?(\d+)/gi;
    const bills = [];
    let match;

    while ((match = billPattern.exec(text)) !== null) {
      const billNo = parseInt(match[1]);
      const dateStr = match[2];
      const timeStr = match[3];
      let amount = parseInt(match[4]);

      // FIX: Phantom '2'
      if (amount > 1000 && amount.toString().startsWith('2')) {
         amount = parseInt(amount.toString().substring(1));
      }

      let timestamp = new Date().toISOString();
      let mealType = 'Other';
      try {
        const d = new Date(`${dateStr} ${timeStr}`);
        timestamp = d.toISOString();
        mealType = getMealType(d);
      } catch (e) {
        console.error("Date parse error", e);
      }

      bills.push({
        bill_no: billNo,
        amount: amount,
        bill_date: timestamp,
        meal_type: mealType
      });
    }

    return NextResponse.json({ success: true, data: bills });

  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Processing failed' }, { status: 500 });
  }
}