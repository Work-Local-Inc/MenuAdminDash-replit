/**
 * Credit card OCR scanning utilities
 */
import Tesseract from 'tesseract.js';

export interface ScannedCardData {
  cardNumber: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
}

/**
 * Parse credit card number from OCR text
 * Looks for 13-19 digit sequences with optional spaces/dashes
 */
function extractCardNumber(text: string): string | null {
  // Remove all non-digits for processing
  const digitsOnly = text.replace(/\D/g, '');
  
  // Look for 13-19 digit sequences (common card lengths)
  const cardRegex = /\b(\d{13,19})\b/;
  const match = digitsOnly.match(cardRegex);
  
  if (match) {
    const cardNumber = match[1];
    // Basic Luhn algorithm validation
    if (luhnCheck(cardNumber)) {
      return cardNumber;
    }
  }
  
  return null;
}

/**
 * Luhn algorithm for credit card validation
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Extract expiry date from OCR text
 * Looks for MM/YY or MM/YYYY patterns
 */
function extractExpiry(text: string): { month?: string; year?: string } | null {
  // Common expiry patterns: MM/YY, MM/YYYY, MMYY, MM YY
  const expiryPatterns = [
    /\b(0[1-9]|1[0-2])[\/\s-]?(\d{2}|\d{4})\b/,  // MM/YY or MM/YYYY
    /\bVALID\s*THRU\s*[:\s]*(0[1-9]|1[0-2])[\/\s]?(\d{2})\b/i,  // VALID THRU MM/YY
    /\bEXP[:\s]*(0[1-9]|1[0-2])[\/\s]?(\d{2})\b/i,  // EXP: MM/YY
  ];
  
  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match) {
      let month = match[1];
      let year = match[2];
      
      // Ensure month is 2 digits
      if (month.length === 1) month = '0' + month;
      
      // Convert 4-digit year to 2-digit
      if (year.length === 4) {
        year = year.substring(2);
      }
      
      return { month, year };
    }
  }
  
  return null;
}

/**
 * Scan credit card from image data
 */
export async function scanCardImage(imageData: string | File): Promise<ScannedCardData | null> {
  try {
    console.log('[CardScanner] Starting OCR processing...');
    
    const result = await Tesseract.recognize(imageData, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[CardScanner] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    const text = result.data.text;
    console.log('[CardScanner] OCR Text:', text);
    
    // Extract card number
    const cardNumber = extractCardNumber(text);
    if (!cardNumber) {
      console.log('[CardScanner] No valid card number found');
      return null;
    }
    
    // Extract expiry
    const expiry = extractExpiry(text);
    
    console.log('[CardScanner] Extracted:', { 
      cardNumber: cardNumber.substring(0, 4) + '****' + cardNumber.substring(cardNumber.length - 4),
      expiry 
    });
    
    return {
      cardNumber,
      expiryMonth: expiry?.month,
      expiryYear: expiry?.year,
    };
  } catch (error) {
    console.error('[CardScanner] OCR error:', error);
    return null;
  }
}

/**
 * Format card number for display (e.g., 1234 5678 9012 3456)
 */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || cardNumber;
}

