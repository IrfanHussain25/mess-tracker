import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { join } from 'path';
import { tmpdir } from 'os';
import * as fs from 'fs';

// Helper: Auto-tag meal based on hour
function getMealType(date: Date): string {
  const hour = date.getHours();
  if (hour >= 7 && hour < 11) return 'Breakfast';
  if (hour >= 12 && hour < 16) return 'Lunch';
  if (hour >= 17 && hour < 19) return 'Snacks';
  if (hour >= 19 || hour < 4) return 'Dinner';
  return 'Other';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- VERCEL FIX: Use /tmp for cache and CDN for WASM ---
    const langPath = join(tmpdir(), 'tesseract_lang_data');
    
    // Ensure the temp directory exists
    if (!fs.existsSync(langPath)) {
      fs.mkdirSync(langPath, { recursive: true });
    }

    // Initialize Worker with specific CDN paths to bypass local file issues
    const worker = await createWorker('eng', 1, {
      // Force Tesseract to load the WASM file from a reliable CDN
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js',
      // Tell it to save language files in the writable /tmp directory
      cachePath: langPath,
      logger: m => console.log(m.status, m.progress), // Optional logging
    });

    // Run OCR
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate(); // Clean up worker to free memory

    console.log("Raw OCR:", text);

    // --- REGEX LOGIC (Same as before) ---
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

      // Combine Date & Time
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

    // Clean up /tmp files (optional but good practice)
    try {
      fs.rmSync(langPath, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

    return NextResponse.json({ success: true, data: bills });

  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ success: false, error: 'Processing failed' }, { status: 500 });
  }
}