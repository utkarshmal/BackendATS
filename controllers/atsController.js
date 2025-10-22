
// ATS resume/backend/controllers/atsController.js (Final CJS Version with Dynamic Import)

const fs = require("fs");
const { calculateATSScore } = require("../scoreCalculator.js");
const PDFParser = require("pdf2json"); // ✅ FIX: CJS require
// const { GoogleGenAI } = require("@google/genai"); // Hata diya gaya hai

// Global variable to store the dynamically imported module
let GeminiModule = null;

// Function to dynamically load the ESM module
async function loadGeminiModule() {
    if (GeminiModule) return GeminiModule;
    // Dynamic import to load the ESM package
    const module = await import('@google/genai');
    GeminiModule = module.GoogleGenAI;
    return GeminiModule;
}


// एक Promise-आधारित हेल्पर फ़ंक्शन जो pdf2json का उपयोग करता है
function getPdfText(dataBuffer) {
    return new Promise((resolve, reject) => {
        // pdf2json is event-driven
        const pdfParser = new PDFParser(null, 1); 
        
        pdfParser.on("pdfParser_dataError", (errData) => {
            // Rejects the promise if any parsing error occurs
            reject(new Error(errData.parserError));
        });
        
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            let text = "";
            
            // Extracting text from the structured JSON output of pdf2json
            if (pdfData.Pages) {
                pdfData.Pages.forEach(page => {
                    if (page.Texts) {
                        page.Texts.forEach(textObj => {
                            // Decode URI encoded text components and add a space
                            text += decodeURIComponent(textObj.R[0].T) + ' ';
                        });
                    }
                });
            }
            resolve(text);
        });

        // Load PDF data from the buffer
        pdfParser.parseBuffer(dataBuffer);
    });
}

// Function to generate resume improvement suggestions using Gemini
async function getAtsSuggestions(scoreResult, resumeText) {
    const GoogleGenAI = await loadGeminiModule();
    
    // Gemini client initialized, using GEMINI_API_KEY from .env
    const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY // Use GEMINI_API_KEY from .env
    });
    
    const model = 'gemini-2.5-flash';

    const prompt = `
        You are a professional ATS (Applicant Tracking System) and Career Advisor.
        A user's resume was just scanned against a target job profile.

        Here are the results of the ATS scan:
        - ATS Score: ${scoreResult.score}%
        - Matched Keywords: ${scoreResult.matchedKeywords.join(', ') || 'None'}
        - Missing Keywords: ${scoreResult.missingKeywords.join(', ') || 'None'}

        The full extracted resume text is provided below:
        ---
        ${resumeText.slice(0, 3000)}... (truncated for brevity in prompt)
        ---

        Based on the ATS score, matched, and missing keywords, provide a three-part suggestion:
        1. **Summary of Strengths:** Briefly list 2-3 strongest points of the resume for this profile.
        2. **Keyword Improvements:** Suggest specific ways to integrate the missing keywords, using synonyms or contextually relevant phrases.
        3. **Formatting/Structure Tip:** Provide one actionable, high-impact suggestion to improve the resume's formatting or structure for better ATS readability and visual appeal.

        Format your response as a JSON object with a single key 'suggestions' which is an array of strings. Do not include any introductory or concluding text outside the JSON object.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text.trim();
        const jsonResponse = JSON.parse(responseText);
        
        return jsonResponse.suggestions;

    } catch (error) {
        console.error("Gemini API Error:", error);
        return ["Could not generate AI suggestions. Please check your GEMINI_API_KEY and service status."];
    }
}

// Controller function
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    
    const resumeText = await getPdfText(dataBuffer); 

    if (resumeText.length === 0) {
        throw new Error("Could not extract any text from the PDF. File may be image-based or corrupt.");
    }

    const result = calculateATSScore(resumeText);
    
    // --- Generate AI Suggestions ---
    const suggestions = await getAtsSuggestions(result, resumeText);

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path); 

    // Combine results for frontend
    const finalResult = {
        ...result,
        suggestions, // Include AI suggestions
    };

    res.json(finalResult);
  } catch (err) {
    console.error("Error processing resume:", err);
    res.status(500).json({ 
        message: "Error processing resume on server. Check file type (must be text-based PDF).", 
        error: err.message 
    });
  }
};

module.exports = { uploadResume }; // CJS export