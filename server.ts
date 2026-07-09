import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

import 'dotenv/config';
console.log("Gemini Key:", process.env.GEMINI_API_KEY);
const app = express();
const PORT = 3000;

// Increase request size limits for CSV/Text contents
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of Gemini SDK to prevent crashes if key is missing on start
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabaseConnected: !!process.env.VITE_SUPABASE_URL });
});

// AI generation endpoint
app.post("/api/gemini/generate-testcases", async (req, res) => {
  try {
    const { requirements, contextInfo } = req.body;
    if (!requirements) {
      return res.status(400).json({ error: "Requirements text is required." });
    }

    const ai = getAiClient();
    
    const systemInstruction = `You are an elite QA Lead and Principal Test Automation Architect.
Your task is to analyze the user's requirements or application description and generate a comprehensive suite of structured QA test cases.

Return ONLY a JSON array. Never return prose, markdown, or paragraphs.
Each item must follow the schema exactly.

Rules:
1. Always return an array of objects.
2. Never include explanations outside the JSON array.
3. Use sequential test case numbers in the format TC-001, TC-002, TC-003, and so on.
4. The name field must be a short title.
5. The objective field must be a short sentence or two describing the purpose.
6. The steps field must be an array of plain text step strings, not HTML and not markdown.
7. The issues field must be a short string such as 'None', 'Button not clickable', 'Validation missing', or 'Incorrect calculation'.
8. The status field must always be 'Not Tested'.
9. The screenshot field must be an empty string.
10. Do not include any extra properties.`;

    const userPrompt = `Generate a complete test suite for the following requirements:\n\n${requirements}\n\n${
      contextInfo ? `Additional context or instructions:\n${contextInfo}\n` : ""
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              testCaseNo: {
                type: Type.STRING,
                description: "Sequential test case ID, e.g. TC-001, TC-002"
              },
              name: {
                type: Type.STRING,
                description: "Short, action-oriented test case name"
              },
              objective: {
                type: Type.STRING,
                description: "Short verification objective"
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of plain-text step strings"
              },
              issues: {
                type: Type.STRING,
                description: "Short issue description or 'None'"
              },
              status: {
                type: Type.STRING,
                description: "Must be 'Not Tested'"
              },
              screenshot: {
                type: Type.STRING,
                description: "Always empty string"
              }
            },
            required: ["testCaseNo", "name", "objective", "steps", "issues", "status", "screenshot"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini.");
    }

    const testCases = JSON.parse(resultText.trim());
    res.json({ testCases });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate test cases." });
  }
});

// Vite & Static assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
