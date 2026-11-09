#!/bin/bash
cat << 'INNEREOF' >> services/geminiService.ts

import { MarketingKit, ThumbnailConcept } from '../types';

export const generateMarketingKit = async (script: string): Promise<MarketingKit> => {
    return retryOperation(async () => {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: `당신은 100만 유튜버를 키워낸 최상급 마케팅 에이전트입니다.
다음 유튜브 대본을 분석하여, 클릭을 유발하는 최고의 마케팅 키트(JSON)를 생성하세요.

대본: ${script.substring(0, 3000)}

[요구사항]
1. titles: 클릭률(CTR)이 가장 높을 만한 매력적인 유튜브 제목 5개 (서로 다른 톤앤매너).
2. description: 유튜브 설명란 텍스트.
3. tags: 유튜브 해시태그 목록.
4. pinnedComment: 시청자의 참여(댓글/좋아요)를 유도하는 고정댓글 내용.
5. thumbnails: 3가지 다른 컨셉(어그로형 'aggro', 정보형 'info', 감성형 'emotion')의 썸네일 기획안.
   - 각 기획안에는 썸네일 안에 들어갈 큼직한 메인 텍스트(titleText)와 작은 서브 텍스트(subtitleText)를 지정하세요. 글씨는 매우 짧고 강렬해야 합니다.
   - visualPrompt: 텍스트 뒤에 깔릴 배경 이미지나 인물의 표정, 구도 등을 묘사하세요.`,
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                  description: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pinnedComment: { type: Type.STRING },
                  thumbnails: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              id: { type: Type.STRING },
                              concept: { type: Type.STRING, enum: ['aggro', 'info', 'emotion'] },
                              titleText: { type: Type.STRING },
                              subtitleText: { type: Type.STRING },
                              visualPrompt: { type: Type.STRING }
                          },
                          required: ["id", "concept", "titleText", "subtitleText", "visualPrompt"]
                      }
                  }
                },
                required: ["titles", "description", "tags", "pinnedComment", "thumbnails"]
              }
            }
        });
        
        const parsed = JSON.parse(response.text || "{}");
        return {
            titles: parsed.titles || [],
            description: parsed.description || "",
            tags: parsed.tags || [],
            pinnedComment: parsed.pinnedComment || "",
            thumbnails: parsed.thumbnails || []
        };
    });
};

export const generateMarketingThumbnail = async (concept: ThumbnailConcept): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    
    // We explicitly instruct the model to bake text into the image
    const promptText = `YouTube thumbnail image. Concept: ${concept.concept}. 
Must include large, bold, highly readable typography.
The main big text should read exactly: "${concept.titleText}".
The smaller subtitle text should read exactly: "${concept.subtitleText}".
Visual background and style: ${concept.visualPrompt}.
High contrast between text and background, professional YouTube thumbnail style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: promptText }] },
      config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Thumbnail generation failed");
  });
};
INNEREOF
