#!/bin/bash
# Insert the Multi-Agent Logic right after dialogueInstruction
sed -i '/const prompt = `당신은 유튜브 조회수/i \
    let finalTopicContext = topic;\
    if (mode === "writers-room") {\
        const writerPrompt = `당신은 "초안 작가 에이전트"입니다. 다음 주제에 대해 상세하고 흥미로운 스토리텔링 뼈대(초안)를 작성하세요.\\n주제: ${topic}\\n타겟: ${audience}\\n${dialogueInstruction}`; \
        const writerRes = await ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents: writerPrompt });\
        const draft = writerRes.text;\
        \
        const editorPrompt = `당신은 "팩트체커 및 교열 에이전트(Editor)"입니다. 다음 초안을 엄격하게 검증하세요.\\n특히 수학/역사/입시 등 사실 기반 콘텐츠일 경우, 과장된 내용이나 역사 왜곡(예: 선행 연구자 누락 등)이 없는지 팩트체크하세요. (예: 아벨의 5차 방정식이라면 루피니와 라그랑주의 기여 등).\\n무리하게 어그로를 끄는 자극적 표현은 걷어내고, 논리적이고 깊이 있는 신뢰감 있는 내용으로 완성하세요.\\n\\n[초안]\\n${draft}`; \
        const editorRes = await ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents: editorPrompt });\
        \
        finalTopicContext = `[원래 주제]: ${topic}\\n\\n[다중 페르소나 작가실(Writer+Editor)이 철저하게 팩트체크하고 정제한 핵심 내용(이 내용을 바탕으로 대본을 쓰세요)]:\\n${editorRes.text}`;\
    }\
' services/geminiService.ts

sed -i 's/주제: ${topic}/주제: ${finalTopicContext}/g' services/geminiService.ts
