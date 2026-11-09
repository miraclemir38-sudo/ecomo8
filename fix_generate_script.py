import re

with open("services/geminiService.ts", "r") as f:
    content = f.read()

old_block = """    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        tools: useAiResearch ? [{ googleSearch: {} }] : []
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      content: parsed.content || "",
      sources: parsed.sources || []
    };"""

new_block = """    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "마크다운 형식의 상세 대본" },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  uri: { type: Type.STRING }
                }
              }
            }
          }
        },
        tools: useAiResearch ? [{ googleSearch: {} }] : []
      }
    });

    let parsed: any = {};
    try {
        parsed = JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse generateScript response JSON", e);
        // Fallback: Just try to extract content if JSON is broken, or return raw text
        parsed = { content: response.text };
    }

    return {
      content: parsed.content || "",
      sources: parsed.sources || []
    };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("services/geminiService.ts", "w") as f:
        f.write(content)
    print("Successfully replaced generateScript block")
else:
    print("Could not find block to replace")
