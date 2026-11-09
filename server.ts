import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

// Retrieve the API key from the environment variable standardly exposed by AI Studio
const apiKey = process.env.GEMINI_API_KEY;

// If you prefer to fail fast on startup if key is missing (optional but recommended)
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Set up the API client lazily inside the route or setup once if safe
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });

  app.post("/api/deep-research", async (req, res) => {
    try {
      const { prompt } = req.body;
      const initialInteraction = await ai.interactions.create({
          agent: "deep-research-preview-04-2026",
          input: prompt,
          background: true,
      });
      res.json({ interactionId: initialInteraction.id });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deep-research/status", async (req, res) => {
    try {
      const { interactionId } = req.body;
      const interaction = await ai.interactions.get(interactionId);
      
      if (interaction.status === "completed") {
          let fullReport = "";
          for (const step of interaction.steps || []) {
              if (step.type === 'model_output') {
                  const textContent: any = step.content?.find((c: any) => c.type === 'text');
                  if (textContent && textContent.text) fullReport += textContent.text;
              }
          }
          res.json({ status: "completed", result: fullReport });
      } else if (["failed", "cancelled"].includes(interaction.status)) {
          res.json({ status: "failed" });
      } else {
          res.json({ status: "running" }); 
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For React router if applicable
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
