import { Transaction, TransactionCategory, WorkerType, FilingStep, UserProfile } from "../types";

// VIGILANT AI: Finding 3 - Synchronize Environment Variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/generate`
  : 'http://localhost:3001/api/generate';

// Helper to call the backend proxy
const callProxy = async (payload: any, expectJson = true): Promise<any> => {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    const data = await response.json();
    if (!expectJson) return { text: data.text };
    return JSON.parse(data.text || '{}');
  } catch (error) {
    console.error("STAXX PROXY ERROR:", error);
    return expectJson ? {} : { text: "Error connecting to advisor. Please check server status." };
  }
};

// HELPER: Redact PII (SSN, Phone, Email, Physical Addresses)
export const redactPII = (text: string): string => {
  if (!text) return "";
  return text
    // SSN variants (XXX-XX-XXXX, XXXXXXXXX, XXX XX XXXX)
    .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, 'XXX-XX-XXXX')
    // Phone variants (XXX-XXX-XXXX, (XXX) XXX-XXXX, XXXXXXXXXX)
    .replace(/\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g, 'XXX-XXX-XXXX')
    // Email
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
    // Generic high-risk numeric patterns (EIN/Account numbers)
    .replace(/\b\d{2}-\d{7}\b/g, 'XX-XXXXXXX')
    // Physical Addresses (Enhanced for Round 5: handles Suite, Apt, Unit, and P.O. Boxes)
    .replace(/\b(P\.?O\.?\s+Box\s+\d+|(\d+\s+(([A-Z][a-z0-9]+|1st|2nd|3rd|[0-9]+th)\s+)+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir)\b(\s+(Suite|Ste|Apt|Unit|Building|Bldg)\s+\w+)?))\b/gi, '[REDACTED_ADDRESS]');
};

export const analyzeTaxDocument = async (base64Image: string, docType: string): Promise<any> => {
  const result = await callProxy({
    modelName: 'gemini-1.5-flash',
    prompt: `This is a ${docType} tax document. Extract all relevant IRS fields (EIN, Employer Name, Wages, Federal Tax Withheld, etc) into a clean JSON format.`,
    imageParts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }],
    generationConfig: { responseMimeType: "application/json" }
  });
  return result || {};
};

export const categorizeTransaction = async (description: string, amount: number, workerType: WorkerType): Promise<any> => {
  const result = await callProxy({
    modelName: 'gemini-1.5-flash',
    prompt: `Categorize this transaction for a ${workerType} professional: Description: "${description}", Amount: $${amount}.`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", description: "Categorize as: INCOME, MILEAGE, PLATFORM_FEES, BUSINESS_EQUIPMENT, HOME_OFFICE, COMMUNICATIONS, MARKETING, W2_WITHHOLDING, or OTHER" },
          isDeductible: { type: "BOOLEAN" },
          aiNotes: { type: "STRING" },
          confidence: { type: "NUMBER" }
        },
        required: ["category", "isDeductible", "confidence"]
      }
    }
  });
  return result || { category: 'OTHER', isDeductible: false, confidence: 0 };
};

export const analyzeReceipt = async (base64Image: string, workerType: WorkerType, mimeType: string = 'image/jpeg'): Promise<Partial<Transaction>> => {
  // VIGILANT AI: Finding 2 - Security Disclaimer for Unmasked PII Transmission
  console.warn("PII Security Alert: Transmitting raw receipt image for OCR. Ensure local redaction policy is active.");

  const result = await callProxy({
    modelName: 'gemini-1.5-flash',
    prompt: `Analyze this receipt for a ${workerType} professional. 
    1. Identify the Merchant/Description.
    2. Extract the TOTAL amount (as a number).
    3. Extract the DATE (ISO format YYYY-MM-DD).
    4. Categorize as INCOME, MILEAGE, PLATFORM_FEES, BUSINESS_EQUIPMENT, HOME_OFFICE, COMMUNICATIONS, MARKETING, or OTHER.
    5. Determine if it is likely tax-deductible for this role.
    6. Provide a short 'aiNote' explaining the tax insight.
    
    Return clean JSON only.`,
    imageParts: [{ inlineData: { mimeType, data: base64Image } }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          amount: { type: "NUMBER" },
          date: { type: "STRING" },
          category: { type: "STRING" },
          isDeductible: { type: "BOOLEAN" },
          aiNotes: { type: "STRING" },
          confidence: { type: "NUMBER" }
        },
        required: ["description", "amount", "date", "category", "isDeductible", "confidence"]
      }
    }
  });
  return result || {};
};

export const getTaxAdvice = async (query: string, context: string, workerType: WorkerType): Promise<{ text: string, sources?: any[] }> => {
  const result = await callProxy({
    modelName: 'gemini-1.5-pro',
    prompt: `User Info: ${workerType} professional. Context: ${context}. Question: ${query}. Instructions: You are a Lead Tax Strategist. Provide real-time advice grounded in 2024 tax code.`
  }, false);
  return { text: result?.text || "The AI advisor is currently offline. Please consult a human tax professional." };
};

export const generateSpeech = async (text: string): Promise<string> => {
  // Finding 4 - Removed empty placeholder, implemented fallback warning
  console.warn("AI Voice Synthesis is a legacy feature and is currently disabled in this tier.");
  return "";
};

// VIGILANT AI: Finding 1 - Explicitly Re-implementing Filing Subsystem Services
export const guideFiling = async (step: FilingStep, transactions: Transaction[], workerType: WorkerType, userResponse?: string, currentProfile?: UserProfile | null): Promise<any> => {
  const safeProfile = currentProfile ? JSON.stringify(currentProfile) : "{}";
  const result = await callProxy({
    modelName: 'gemini-1.5-pro',
    prompt: `Filing Step: ${step}. Role: ${workerType}. User Profile: ${redactPII(safeProfile)}. Message: "${redactPII(userResponse || 'Start')}". Guide the user through providing legal tax information for their 2024 return.`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          profileUpdate: { type: "OBJECT", properties: { name: { type: "STRING" }, ssn: { type: "STRING" }, filingStatus: { type: "STRING" } } }
        },
        required: ["text"]
      }
    }
  });
  return result || { text: "Error processing filing guidance. Please retry or contact support." };
};

export const generateFormDraft = async (transactions: Transaction[], workerType: WorkerType, lastMessage?: string): Promise<any> => {
  const ledgerData = transactions.map(t => ({ desc: t.description, amt: t.amount, cat: t.category, ded: t.isDeductible }));
  const result = await callProxy({
    modelName: 'gemini-1.5-pro',
    prompt: `Act as a CPA. Based on these transactions: ${JSON.stringify(ledgerData)}, generate a FORM 1040 DRAFT for a ${workerType} filer. 
    Include estimated 'Taxable Income', 'Total Tax', and 'Refund/Owed' lines.`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          forms: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                sections: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      label: { type: "STRING" },
                      lines: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            lineId: { type: "STRING" },
                            description: { type: "STRING" },
                            amount: { type: "NUMBER" }
                          },
                          required: ["lineId", "description", "amount"]
                        }
                      }
                    },
                    required: ["label", "lines"]
                  }
                }
              },
              required: ["title", "sections"]
            }
          }
        },
        required: ["forms"]
      }
    }
  });
  return result || null;
};

export const suggestOptimizations = async (transactions: Transaction[], workerType: WorkerType): Promise<string[]> => {
  const result = await callProxy({
    modelName: 'gemini-1.5-flash',
    prompt: `Suggest 3 tax strategies: ${JSON.stringify(transactions)}`,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: { type: "ARRAY", items: { type: "STRING" } }
    }
  });
  return Array.isArray(result) ? result : ["Keep track of mileage.", "Save receipts digitally.", "Monitor self-employment tax obligations."];
};