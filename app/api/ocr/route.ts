import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    console.log("OCR Raw Text:", text); // Check logs to confirm reading

    // --- FINAL REGEX FIX ---
    // Explanation of the pattern:
    // 1. Bill No\D*?(\d+)        -> Find "Bill No", skip garbage (:), capture Number (245)
    // 2. [\s\S]*?                -> Skip EVERYTHING (newlines, "“F") until...
    // 3. Date\D*?                -> Find "Date", skip garbage (:)
    // 4. (\d+/\d+/\d+)           -> Capture Date (1/15/2026)
    // 5. [\s\S]*?                -> Skip garbage (icons, "&)") until...
    // 6. (\d+:\d+:\d+)           -> Capture Time (19:03:23)
    // 7. [\s\S]*?                -> Skip EVERYTHING ("Type: Sales", newlines) until...
    // 8. Total\D*?(\d+)          -> Find "Total", skip garbage (: &), capture Amount (237)
    
    const billPattern = /Bill\s*No\D*?(\d+)[\s\S]*?Date\D*?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?Total\D*?(\d+)/gi;

    const bills = [];
    let match;

    while ((match = billPattern.exec(text)) !== null) {
      const billNo = parseInt(match[1]);
      const dateStr = match[2];
      const timeStr = match[3];
      let amount = parseInt(match[4]);

      // FIX: The "Phantom 2" error (e.g., OCR reads "2214" instead of "214")
      // In your raw text: "Total: 2214" -> Real value is likely 214
      if (amount > 1000 && amount.toString().startsWith('2')) {
         amount = parseInt(amount.toString().substring(1));
      }

      // Combine Date and Time
      // Note: "1/15/2026" implies MM/DD/YYYY format in standard JS
      let timestamp = new Date().toISOString(); 
      try {
        timestamp = new Date(`${dateStr} ${timeStr}`).toISOString();
      } catch (e) {
        console.error("Date parsing error", e);
      }

      bills.push({
        bill_no: billNo,
        amount: amount,
        bill_date: timestamp
      });
    }

    console.log("Parsed Bills:", bills); // Debugging: See what we found

    if (bills.length === 0) {
       return NextResponse.json({ success: false, error: 'OCR finished but found no matching bills. Check server logs for raw text.' });
    }

    return NextResponse.json({
      success: true,
      data: bills 
    });

  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process image' }, { status: 500 });
  }
}