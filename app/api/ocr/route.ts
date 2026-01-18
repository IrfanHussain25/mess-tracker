import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

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

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    console.log("Raw OCR:", text);

    // Robust Regex to skip icons/garbage between fields
    const billPattern = /Bill\s*No\D*?(\d+)[\s\S]*?Date\D*?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?Total\D*?(\d+)/gi;

    const bills = [];
    let match;

    while ((match = billPattern.exec(text)) !== null) {
      const billNo = parseInt(match[1]);
      const dateStr = match[2];
      const timeStr = match[3];
      let amount = parseInt(match[4]);

      // FIX: Phantom '2' (e.g. ₹144 read as 2144)
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

    return NextResponse.json({ success: true, data: bills });

  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ success: false, error: 'Processing failed' }, { status: 500 });
  }
}