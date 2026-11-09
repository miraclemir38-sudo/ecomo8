import { GoogleGenAI } from "@google/genai";
async function run() {
    // Need API key
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
    try {
        const response = await ai.models.list();
        for await (const model of response) {
            if (model.name.includes("image")) {
                console.log(model.name);
            }
        }
    } catch(e) { console.error(e.message); }
}
run();
