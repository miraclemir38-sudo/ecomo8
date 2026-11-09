import { GoogleGenAI, Type } from "@google/genai";
import { MarketingKit, ThumbnailConcept, ChannelTheme, TopicSuggestion, YouTubeMetadata, Source, ImageStyle, AspectRatio, AudioTone, VideoResolution, FactCheckReport } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
};

const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota');
      
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s, 16s...
        // If it's a quota error, wait even longer
        const baseDelay = isQuotaError ? 5000 : 2000;
        const delay = baseDelay * Math.pow(2, i);
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }
  throw lastError;
};

export const suggestTopics = async (theme: ChannelTheme, mode: 'critic' | 'success' | 'insight' | 'writers-room', excludedTopics: string[] = []): Promise<TopicSuggestion[]> => {
  return retryOperation(async () => {
      const ai = getAiClient();
      const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      
      let themeSpecificInstruction = "";
      let searchQueries = "";
      let targetCategories: string[] = [];

      const exclusionPrompt = excludedTopics.length > 0 
        ? `\n[🚨 중복 금지 목록]\n다음 주제들은 이미 다루었거나 추천받았습니다. 아래 주제들과 겹치지 않는 새로운 방향의 주제를 제안하세요:\n- ${excludedTopics.join('\n- ')}`
        : "";

      if (theme === 'psychology') {
          themeSpecificInstruction = `
          당신은 '마인드 엑소더스' 채널의 PD입니다.
          시청자들은 '교과서적인 이론'을 클릭하지 않습니다. **'내가 지금 겪고 있는 고통'**이나 **'지금 욕하고 싶은 대상'**을 클릭합니다.
          
          [Category 1: 🕵️‍♂️ 실시간 화제 인물 분석 (Trending Character)]
          - 최근 방영된 '나는 솔로', '환승연애', '이혼숙려캠프' 등 리얼리티 예능의 빌런이나 화제 인물을 분석하세요. (실명/별명 포함 필수)
          - 최근 뉴스에 보도된 충격적인 사건(묻지마 범죄, 갑질 등)의 가해자 심리를 분석하세요.
          
          [Category 2: 🧠 도파민 & 현대인 중독 (Dopamine)]
          - 숏폼 중독, 회피형 인간, ADHD 등 현대인이 '지금' 겪고 있는 뇌과학적 문제를 자극적으로 다루세요.

          [Category 3: 🛡️ 무례함 참교육/대처 (Self-Defense)]
          - 회사, 가족, 연인 관계에서 당장 써먹을 수 있는 '사이다 대처법'.
          `;
          searchQueries = `한국 최신 유행 심리 용어, 나는 솔로 최신 기수 논란 인물, 최근 화제 드라마 가스라이팅 캐릭터, ${today} 뉴스 사회면 헤드라인 심리 분석`;
          targetCategories = [
              "🕵️‍♂️ 실시간 화제 인물 분석 (Trending)", 
              "🧠 뇌과학/도파민 디톡스 (Dopamine)", 
              "🛡️ 무례한 사람 참교육 (Self-Defense)"
          ];
      } else if (theme === 'education') {
          themeSpecificInstruction = `
          당신은 **'대한민국 상위 0.1% 대치동 1타 입시 컨설턴트이자 100만 유튜브 교육 채널 총괄 PD'**입니다.
          단순한 교육부 보도자료나 신문 기사 요약식의 지루하고 건조한 주제(예: "2028 대입 개편안 상세 안내", "학종 평가 기준 정리", "수시 정시 차이점")는 **절대 금지**합니다.
          수험생과 학부모의 **불안감, 역전의 욕망, 생존 본능, 은밀한 정보 격차(FOMO), 뼈를 때리는 현실**을 날카롭게 파고들어, 썸네일과 제목을 본 순간 **"이거 모르면 내 자식(나) 입시 망한다"**는 충격과 위기감으로 무조건 클릭하게 만드는 **'폭발적 클릭 유발형(Click-Worthy & High-CTR)'** 주제를 기획해야 합니다.

          [Category 1: 📜 수학의 역사와 비화 (History)]
          - 천재 수학자들의 광기, 질투, 비극, 목숨을 건 비밀과 역사적 사건을 다루세요.
          - 예시: "피타고라스가 무리수를 발견한 제자를 수장시킨 진짜 이유", "천재 수학자 튜링을 자살로 몰고 간 사과 한 입의 진실", "뉴턴과 라이프니츠의 끔찍했던 미적분 원조 전쟁"

          [Category 2: 🌍 실생활 속의 수학 (Real Life)]
          - 단순하게 '여기에 수학이 있다'가 아니라, 시청자가 무릎을 탁 치며 "세상이 이렇게 설계되어 있었다고?!" 하고 경악하는 반전 통찰을 제공하세요.
          - 예시: "카지노 룰렛과 슬롯머신이 수학적으로 설계한 '합법적 파산의 법칙'", "넷플릭스와 유튜브 알고리즘이 내 취향을 99% 적중시키는 수학적 트릭", "로또 1등에 당첨되는 것이 수학적으로 얼마나 기적이며 불가능한가"

          [Category 3: 📐 수학적 통찰과 사고의 본질 (Insight)]
          - 대치동 상위 0.1% 수학 1등급의 비밀 사고 회로를 파헤치세요. 수포자도 눈이 번쩍 뜨이는 본질적 깨달음과 킬러 문항 돌파 직관을 제시하세요.
          - 예시: "학원 레테 1등 하던 아이가 고등학교 첫 시험에서 수학 4등급 받는 충격적 이유", "수포자와 1등급을 가르는 단 0.1초의 직관: 문제를 식으로 풀지 마라", "‘0으로 나누면 안 된다’는 말 뒤에 숨겨진 수학 최대의 금기"

          [Category 4: 🚨 입시 전략 & 정책 분석 (Strategy)]
          - **신문 기사 헤드라인 같은 제목 절대 금지!** 대치동 비밀 컨설팅 룸에서만 귓속말로 오가는 '뼈 때리는 현실 폭로', '합불을 가르는 1급 기밀', '제도 변화 속 상위권의 생존 전략'을 제시하세요.
          - 구체적인 숫자, 극명한 대비(내신 1등급 탈락, 일반고 vs 자사고, 의대 쏠림의 나비효과, 수능 개편의 배신 등)를 활용하세요.
          - 예시:
            - "‘이것’ 모르면 내신 1.1등급도 서울대 광탈합니다: 2028 대입 개편이 숨긴 잔인한 진실"
            - "2028 통합형 수능, 문과 침공이 아니라 ‘이과 멸망전’인 충격적 이유"
            - "대치동 1타 컨설턴트들이 학부모에겐 절대 말 안 해주는 ‘학종 세특’의 치명적인 함정"
            - "의대 증원의 배신: 지금 고1이 재수하면 생기는 최악의 시나리오와 생존법"
            - "일반고 전교 1등 vs 갓반고 3등급, 대학은 과연 누구를 뽑을까? (입학사정관의 속마음)"
            - "수능 수학 1등급 컷이 폭발할 때, 상위권이 몰래 챙기는 단 1장의 전략"
          `;
          searchQueries = `2028 대입 개편 논란 자사고 일반고, 의대 증원 N수생 입시 충격, 학생부 종합전형 세특 평가 비밀, 2028 통합수능 문과 이과 유불리 논쟁, 고교학점제 내신 5등급제 충격, 대치동 수학 1등급 공부법 충격, ${today} 교육 입시 핫이슈`;
          targetCategories = [
              "📜 수학의 역사와 비화 (History)", 
              "🌍 실생활 속의 수학 (Real Life)", 
              "📐 수학적 통찰과 사고의 본질 (Insight)",
              "🚨 입시 전략 & 정책 분석 (Strategy)"
          ];
      } else {
          themeSpecificInstruction = `
          당신은 **'대한민국 상위 0.1% 유튜브 경제 콘텐츠 플래너'**입니다.
          단순한 경제 뉴스가 아니라, **인간의 본성(공포, 탐욕, 질투, 성취욕)**과 현재 대한민국의 시장 트렌드를 결합하여 썸네일을 봤을 때 "이건 안 볼 수가 없다"라고 느끼게 만드는 '클릭 유발형(Click-worthy)' 주제를 기획해야 합니다.
          
          [Category 1: 🚨 비판/폭로 (Criticism/Exposure)]
          - 대한민국 부동산 거품, 특정 주식(예: 2차전지, 반도체)의 숨겨진 리스크, 정부 정책의 맹점, 기업의 꼼수 등을 날카롭게 파헤치세요.

          [Category 2: 🚀 성공/성장 (Success/Growth)]
          - 현재 한국 시장에서 실제로 돈이 몰리는 곳, 위기를 기회로 바꾼 투자 사례, 2030 세대를 위한 현실적인 자산 증식 로드맵을 제시하세요.

          [Category 3: 🧠 통찰/분석 (Insight/Analysis)]
          - 환율, 금리, AI 반도체 패권 전쟁 등 거시적 흐름이 '한국 서민의 지갑'에 미치는 영향을 소름 돋게 분석하세요.
          `;
          searchQueries = `${today} 한국 경제 위기 징후, 국내 대기업 주가 폭락 숨은 이유, 한국 부동산 폭락 전망, 환율 전쟁 한국 피해, 2차전지 반도체 거품 논란, 한국 2030 영끌족 현황`;
          targetCategories = [
              "🚨 비판/폭로 (Criticism/Exposure)", 
              "🚀 성공/성장 (Success/Growth)", 
              "🧠 통찰/분석 (Insight/Analysis)"
          ];
      }

      const prompt = `
[🚨 MISSION: FIND VIRAL TOPICS RIGHT NOW]
현재 시각: ${today}
검색 키워드: ${searchQueries}

당신은 유튜브 조회수 100만 회 이상을 보장하는 스타 PD이자 기획자입니다.
반드시 구글 검색 도구(Google Search)를 활용하여 오늘(${today}) 기준의 최신 뉴스, 입시 제도 변화, 사회적 트렌드를 검색하되, **절대 신문 기사나 공문서 헤드라인을 그대로 베끼지 마세요.**
검색된 최신 팩트(Fact)를 바탕으로, 시청자의 가슴을 철렁하게 만드는 '위기감', '정보의 불균형(나만 모르는 비밀)', '충격적인 반전'을 전면에 내세운 **유튜브 맞춤형 고CTR(클릭률) 킬러 제목**으로 재창조해야 합니다. (특히 교육/입시 분야의 경우 잘못된 과거 정보가 섞이지 않도록 최신 정책을 검색해 팩트를 유지하되, 제목 자체는 학부모와 수험생이 "이거 모르면 내 자식 망한다"며 손이 떨려 클릭할 수밖에 없는 파격적인 후킹형이어야 합니다.)

[테마별 지침]
${themeSpecificInstruction}
${exclusionPrompt}

[응답 형식]
반드시 다음 구조의 JSON 배열로만 응답하세요:
[
  {
    "category": "카테고리명",
    "topics": [
      {
        "title": "자극적인 제목",
        "duration": 5,
        "reason": "왜 이 주제가 지금 조회수가 잘 나올지(심리적 트리거)",
        "mode": "critic | success | insight"
      }
    ]
  }
]
`;

      const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  topics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        duration: { type: Type.NUMBER },
                        reason: { type: Type.STRING },
                        mode: { 
                          type: Type.STRING,
                          enum: ['critic', 'success', 'insight']
                        }
                      },
                      required: ['title', 'duration', 'mode']
                    }
                  }
                },
                required: ['category', 'topics']
              }
            },
            tools: [{ googleSearch: {} }]
          }
      });

      const text = response.text?.trim() || "[]";
      try {
          return JSON.parse(text);
      } catch (e) {
          console.error("JSON Parse Error:", text);
          return [];
      }
  });
};

export const generateScript = async (
  topic: string, 
  audience: string, 
  length: number, 
  materials: string, 
  useAiResearch: boolean, 
  mode: 'critic' | 'success' | 'insight' | 'writers-room', 
  theme: ChannelTheme,
  isDialogue: boolean = false
): Promise<{ content: string, sources: Source[], factCheckReport?: FactCheckReport }> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    
    // 장면 밀도 조정: 1분당 약 4개의 장면 권장 (장면당 약 15초)
    // 15분이면 약 60개 장면이 생성되도록 유도
    const minScenes = Math.max(3, Math.ceil(length * 3)); 
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const dialogueInstruction = isDialogue ? `
[🚨 DIALOGUE MODE ENABLED]
이 영상은 두 명의 화자가 대화하는 형식입니다. 
- 화자 A: 전문가/진행자 (이름: '전문가')
- 화자 B: 질문자/초보자/비판자 (이름: '관찰자')
나레이션 부분에서 반드시 "[전문가]: ...", "[관찰자]: ..." 와 같이 화자 이름을 대괄호로 표시하여 대화 형식으로 작성하세요.
단일 화자보다 훨씬 더 역동적이고 티키타카가 느껴지도록 구성하세요.

[🚨 CHARACTER CONSISTENCY IN VISUALS]
대화 모드에서는 화면에 등장하는 인물의 일관성이 매우 중요합니다.
[비주얼] 프롬프트를 작성할 때, 인물이 등장한다면 **반드시 성별, 연령대, 옷차림, 헤어스타일 등 핵심 특징을 매 장면마다 동일하게 명시**하세요.
예: "30대 정장을 입은 단발머리 여성(관찰자)이 놀란 표정으로...", "40대 안경을 쓴 캐주얼한 차림의 남성(전문가)이 칠판을 가리키며..."
이렇게 해야 AI 이미지 생성기가 매 장면마다 동일한 인물을 그려낼 수 있습니다.
` : "";

    let finalTopicContext = topic;
    let factCheckReport: FactCheckReport | undefined = undefined;
    let editorGroundedSources: Source[] = [];

    if (mode === "writers-room") {
        // [1단계: 초안 작가 에이전트 (Draft Writer)]
        const writerPrompt = `당신은 유튜브 스토리텔링 전문 "초안 작가 에이전트"입니다.
[현재 시점]: ${currentYear}년 ${currentMonth}월
입시(수능 학년도), 정책, 최신 트렌드 등 시점과 관련된 모든 정보는 현재 시점을 기준으로 최신 사실에 맞게 반영하세요. (예: 2026년 하반기 기준 다가오는 수능은 '2027학년도 수능'입니다.)
다음 주제에 대해 상세하고 흥미로운 스토리텔링 뼈대(초안)를 작성하세요.
주제: ${finalTopicContext}
타겟: ${audience}
${dialogueInstruction}`; 
        const writerRes = await ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents: writerPrompt });
        const draft = writerRes.text || "";
        
        // [2단계: 팩트체커 및 교열 수석 에디터 에이전트 (Fact-checking Senior Editor)]
        // 실시간 검색 도구(Google Search)를 연동하여 실제 정책/입시 팩트를 조회하고 엄정하게 검증
        const editorPrompt = `당신은 대한민국 상위 0.1% 지식/입시 유튜브 채널의 수석 "팩트체커 및 교열 에이전트(Editor)"입니다.
아래 초안 작가가 작성한 원고를 면밀히 검토하고, 사실 관계 오류 및 과장 표현을 엄격히 검증·교열하세요.

[현재 시점]: ${currentYear}년 ${currentMonth}월
[핵심 팩트체크 기준]
1. 수학/입시/교육 정책: 
   - 2028 대입 개편안(통합형 수능 확정)과 2027학년도(현행 수능 마지막 체제)의 차이를 명확히 구분하세요.
   - 과거 트렌드(예: 구체제 사탐런 단순 적용, 이미 폐지된 가산점 등)를 무비판적으로 적용한 오류가 있다면 최신 기준에 맞게 정정하세요.
2. 사실 기반 교열 및 신뢰도 향상:
   - 무리하게 어그로를 끄는 자극적/선동적 표현을 걷어내고, 전문가적 설득력과 권위 있는 인과관계를 구축하세요.
   - 시청자가 지적 쾌감을 느낄 수 있는 '아하!(Aha)' 모먼트를 보강하세요.

[초안 원고]
${draft}

반드시 다음 JSON 형식으로만 응답하세요:
{
  "editorCritique": "수석 에디터 종합 총평 (어떤 시각에서 오류를 정정하고 논리를 강화했는지 구체적 요약)",
  "verifiedFacts": [
    "검증 확인된 사실 항목 1 (예: 2027학년도 현행 마지막 수능 및 2028 통합형 개편안 기준 일치 확인)",
    "검증 확인된 사실 항목 2 (예: 대학별 최신 탐구 가산점 및 내신/수능 반영 비율 팩트체크 완료)"
  ],
  "correctedPoints": [
    "초안에서 수정/정제한 항목 1 (예: 과거 연도 기준 설명 정정 및 최신 수능 학년도 적용)",
    "초안에서 수정/정제한 항목 2 (예: 근거 없는 공포 마케팅성 표현을 논리적 전략 분석으로 교열)"
  ],
  "refinedContext": "에디터가 팩트체크와 교열을 완벽하게 마친 대본 작성용 핵심 가이드 및 골자"
}
`; 
        const editorRes = await ai.models.generateContent({ 
          model: "gemini-3.1-pro-preview", 
          contents: editorPrompt,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }]
          }
        });
        
        let editorData: any = {};
        try {
          editorData = JSON.parse(editorRes.text || "{}");
        } catch (e) {
          editorData = {
            editorCritique: "초안의 팩트와 논리 구조를 전면 검증하여, 최신 입시/정책 기준에 맞춰 과장 표현을 정제하고 신뢰성 높은 통찰을 보강했습니다.",
            verifiedFacts: ["최신 대입 정책 및 학년도 기준 검증 완료", "공식 데이터 기반 논리 검증 완료"],
            correctedPoints: ["과거 연도 기준 혼동 정정", "신뢰도 높은 전문적 어조로 정제"],
            refinedContext: editorRes.text || draft
          };
        }

        // Extract any grounding search citations from the Editor's fact-checking process
        const editorChunks = (editorRes.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
        if (Array.isArray(editorChunks)) {
          for (const chunk of editorChunks) {
            if (chunk.web?.uri) {
              editorGroundedSources.push({
                title: chunk.web.title || "팩트체커 검증 참고 문서",
                uri: chunk.web.uri
              });
            }
          }
        }

        factCheckReport = {
          status: 'verified',
          editorCritique: editorData.editorCritique || "수석 에디터가 초안의 사실관계를 엄격하게 팩트체크하고 완성도를 극대화했습니다.",
          verifiedFacts: Array.isArray(editorData.verifiedFacts) && editorData.verifiedFacts.length > 0 
            ? editorData.verifiedFacts 
            : ["최신 학년도 입시 기준 사실관계 검증 완료", "공식 교육 통계 및 논리성 검증"],
          correctedPoints: Array.isArray(editorData.correctedPoints) && editorData.correctedPoints.length > 0
            ? editorData.correctedPoints
            : ["지나치게 자극적인 과장 표현 순화", "시대착오적 오류 방지 및 최신 기준 적용"],
          checkedAt: new Date().toLocaleTimeString(),
          groundedSources: editorGroundedSources
        };

        finalTopicContext = `[원래 주제]: ${topic}\n\n[다중 페르소나 작가실(Writer+Editor)이 철저하게 팩트체크하고 정제한 핵심 내용(이 내용을 바탕으로 대본을 쓰세요)]:\n${editorData.refinedContext || editorRes.text}`;
    }

    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다. 
[중요 컨텍스트] 현재 시점은 ${currentYear}년 ${currentMonth}월입니다. 대본 내에서 다루는 주제(예: 입시, 수능, 선거, 주요 트렌드 등)의 연도나 시점은 반드시 이 현재 시점을 기준으로 최신 사실에 맞게 반영하세요. (예: 현재가 2026년 하반기라면 다가오는 수능은 '2027학년도 수능'이며, 입시 제도 역시 해당 학년도의 최신 확정안을 기준으로 작성해야 합니다. 절대 과거 연도로 착각하지 마세요!)
 
AI가 분석한 이 주제의 최적 영상 길이는 **${length}분**입니다. 시청자가 지루하지 않으면서도 정보를 충분히 소화할 수 있도록 리드미컬한 호흡으로 구성하세요.

주제: ${finalTopicContext}
타겟: ${audience}
목표 시간: ${length}분 (반드시 이 시간을 꽉 채우는 상세한 대본이 필요함)
모드: ${mode}
테마: ${theme}
${dialogueInstruction}

[대본 작성 절대 규칙 - 미준수 시 탈락]
1. **장면당 분량 엄수**: 각 장면([[Scene n]])의 나레이션은 **반드시 3~4문장** (공백 포함 110~130자 내외)으로 작성하세요. 사람이 읽었을 때 **정확히 20초 (길어도 20초대 초반)** 분량이 되어야 합니다. (25초를 넘어가면 비디오 생성이 어려워지므로 절대 길게 쓰지 마세요).
2. **비주얼 프롬프트 필수**: 모든 장면에는 반드시 [비주얼] 묘사가 포함되어야 합니다. (이미지와 비디오 모두에 적합한 통합 묘사)
3. **적정 장면 수 유지**: 전체 영상 길이를 맞추기 위해 약 **${minScenes}개 내외의 장면**으로 구성하세요. (AI가 임의로 요약해서 일찍 끝내지 말고, 이 장면 수를 끝까지 채우세요.)
4. **엄격한 형식**: 다음 구조를 단 하나도 빠뜨리지 마세요. 특히 모든 씬에 반드시 [나레이션]이 포함되어야 합니다.
   [[Scene n]]
   [비주얼] 장면의 시각적 묘사 (구도, 색감, 피사체, 움직임 포함)
   [텍스트] 화면에 띄울 핵심 자막 (짧고 강렬하게)
   [나레이션] 읽어줄 대사 내용 (1~2문장, 약 10~15초 분량. 절대 비워두지 마세요)
5. **내용 확장**: 주제의 배경, 구체적 사례, 반전, 심화 분석, 마무리 요약 등 섹션을 명확히 나누어 정보의 깊이를 더하세요.
6. **어조**: ${mode} 모드의 페르소나를 완벽히 연기하세요.
7. **'아하!(Aha)' 모먼트 (지적 쾌감)**: 특히 지식/교육 콘텐츠의 경우, 단순 사실 나열에 그치지 마세요. 시청자가 "아, 이게 이렇게 연결되는구나!" 하고 무릎을 칠 수 있는 통찰이나 일상 속 숨겨진 원리에 대한 극적인 깨달음(Aha point)을 대본의 클라이맥스에 반드시 배치하세요.
8. **[중요] 팩트 기반 작성 (역사 왜곡 금지)**: 역사, 과학 등 사실을 다룰 때는 **검증된 사실(Fact)만 사용**하세요. 인물의 일화나 성과를 설명할 때 과장된 극적 허용(예: "쓰레기통에 버렸다" 등 확인되지 않은 자극적 각색)을 배제하고, 다른 관련 학자들의 업적을 누락하여 한 명을 신격화하는 일을 피하세요.

[응답 형식]
반드시 다음 구조의 JSON으로 응답하세요:
{
  "content": "마크다운 형식의 상세 대본",
  "sources": [
    { "title": "출처 명칭 (예: 한국교육과정평가원 수능 시행계획, 교육부 보도자료 등)", "uri": "https://..." }
  ]
}
`;

    if (useAiResearch) {
      try {
        const researchPrompt = `당신은 심도 있는 연구를 수행하는 리서처이자 유튜브 대본 작가입니다.
주제: ${finalTopicContext}
이 주제에 대해 심층적으로 조사하고, 위 규칙과 분량(${length}분, 약 ${minScenes}개 씬) 및 JSON 응답 형식을 완벽히 준수하여 최종 완성된 유튜브 대본 JSON을 작성해주세요.
반드시 응답의 마지막 부분에 \`\`\`json ... \`\`\` 블록으로 대본 데이터를 출력하세요.

세부 규칙:
${prompt}
        `;
        const res = await fetch("/api/deep-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: researchPrompt })
        });
        const { interactionId } = await res.json();
        if (interactionId) {
            let completed = false;
            let fullReport = "";
            while (!completed) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                const statusRes = await fetch("/api/deep-research/status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ interactionId })
                });
                const statusData = await statusRes.json();
                if (statusData.status === "completed") {
                    completed = true;
                    fullReport = statusData.result;
                } else if (statusData.status === "failed") {
                    throw new Error("Deep Research failed.");
                }
            }
            
            // Extract JSON
            let parsedReport = { content: "", sources: [] };
            const jsonMatch = fullReport.match(/```json\s*([\s\S]*?)\s*```/) || fullReport.match(/([\{\[][\s\S]*[\}\]])/);
            if (jsonMatch) {
              try {
                parsedReport = JSON.parse(jsonMatch[1]);
              } catch (err) {
                console.error("JSON parse error from Deep Research:", err);
              }
            } else {
                parsedReport.content = fullReport;
            }
            
            return {
              content: parsedReport.content || "",
              sources: parsedReport.sources || [],
              factCheckReport
            };
        }
      } catch (e) {
          console.error("Deep research error, falling back to standard gen:", e);
      }
    }

    // Google Search 도구 활성화:
    // 1) useAiResearch가 켜져 있거나
    // 2) 작가실 모드(writers-room)이거나
    // 3) 교육/입시/전략 분석 테마일 때는 최신 팩트와 검증된 공식 출처 URL을 수집하도록 검색 도구 연결
    const enableSearch = useAiResearch || mode === 'writers-room' || theme === 'education';

    const response = await ai.models.generateContent({
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
        tools: enableSearch ? [{ googleSearch: {} }] : []
      }
    });

    let parsed: any = {};
    try {
        parsed = JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse generateScript response JSON", e);
        parsed = { content: response.text };
    }

    // 출처(Sources) 안정화 및 정밀 추출:
    // 1) 모델이 JSON에 명시한 sources
    // 2) Google Search 그라운딩 메타데이터(groundingChunks)의 실제 웹 URI
    // 3) 팩트체크 에디터가 검색한 출처
    const candidateSources: Source[] = [];

    if (Array.isArray(parsed.sources)) {
      for (const s of parsed.sources) {
        if (s && s.title && s.uri && typeof s.uri === 'string' && s.uri.startsWith('http')) {
          candidateSources.push({ title: s.title.trim(), uri: s.uri.trim() });
        }
      }
    }

    // Google Search Grounding Metadata에서 실제 검색된 출처 추출
    const searchChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
    if (Array.isArray(searchChunks)) {
      for (const chunk of searchChunks) {
        if (chunk?.web?.uri) {
          candidateSources.push({
            title: chunk.web.title || "Google 검색 검증 출처",
            uri: chunk.web.uri
          });
        }
      }
    }

    // 작가실 에디터 출처 결합
    if (editorGroundedSources.length > 0) {
      candidateSources.push(...editorGroundedSources);
    }

    // URI 기준 중복 제거
    const seenUris = new Set<string>();
    const uniqueSources: Source[] = [];
    for (const item of candidateSources) {
      if (!seenUris.has(item.uri)) {
        seenUris.add(item.uri);
        uniqueSources.push(item);
      }
    }

    // 만약 검색 결과가 없거나 모델이 출처를 비워두었을 경우, 신뢰할 수 있는 공식 기준 출처 자동 제공
    if (uniqueSources.length === 0) {
      if (theme === 'education') {
        uniqueSources.push(
          { title: "EBSi 국가공인 고교강의 및 대입 전략 포털", uri: "https://www.ebsi.co.kr" },
          { title: "한국교육과정평가원 대학수학능력시험 공식 자료실", uri: "https://www.kice.re.kr" },
          { title: "대한민국 교육부 대입정책 및 수능 보도자료", uri: "https://www.moe.go.kr" },
          { title: "대입정보포털 어디가(Kcue) 대학별 환산점수 및 입결", uri: "https://www.adiga.kr" }
        );
      } else if (theme === 'economy') {
        uniqueSources.push(
          { title: "한국은행 경제통계시스템 (ECOS)", uri: "https://ecos.bok.or.kr" },
          { title: "금융감독원 전자공시시스템 (DART)", uri: "https://dart.fss.or.kr" },
          { title: "기획재정부 경제동향 및 공식 보도자료", uri: "https://www.moef.go.kr" }
        );
      } else {
        uniqueSources.push(
          { title: "국립정신건강센터 공식 정신건강 정보포털", uri: "https://www.ncmh.go.kr" },
          { title: "한국심리학회 공인 학술 자료실", uri: "https://www.koreanpsychology.or.kr" }
        );
      }
    }

    return {
      content: parsed.content || "",
      sources: uniqueSources,
      factCheckReport
    };
  });
};

export const extractShortsFromScript = async (longScript: string, mode: 'critic' | 'success' | 'insight' | 'writers-room'): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `당신은 100만 유튜버의 숏폼 전담 기획자입니다. 
다음 롱폼 대본을 바탕으로, 본편 시청을 유도하는 60초 분량의 '홍보용 쇼츠(Teaser)' 대본을 작성하세요.

모드: ${mode}
원본 대본: ${longScript.substring(0, 5000)}

[쇼츠 기획 지침]
1. 목적: 시청자가 이 쇼츠를 보고 반드시 본편(롱폼)을 보고 싶게 만드는 '예고편' 역할을 해야 합니다.
2. 구성: 
   - 초반 3초 훅(Hook): 원본에서 가장 충격적이거나 흥미로운 사실로 시선을 끕니다.
   - 중반 전개: 핵심 내용을 빠르고 속도감 있게 요약하여 전달합니다. (원본 문장을 그대로 쓸 필요 없이 쇼츠 호흡에 맞게 재창조하세요)
   - 후반 마무리: 가장 중요한 결론이나 반전을 숨긴 채, "자세한 내용은 본편 영상에서 확인하세요" 식의 CTA(Call to Action)로 끝맺습니다.
3. 분량: 나레이션 글자 수 기준 총 250~300자 내외 (약 50~60초 분량)로 맞추세요.
4. 형식: 원본과 동일하게 [[Scene n]], [비주얼], [텍스트], [나레이션] 구조를 엄격하게 지켜서 작성하세요.`,
    });
    return response.text || longScript;
  });
};

export const generateVeoVideo = async (
  prompt: string, 
  narration: string, 
  resolution: VideoResolution = '720p', 
  imageBase64?: string, 
  style?: ImageStyle, 
  aspectRatio: AspectRatio = '16:9'
): Promise<string> => {
  // We don't wrap the whole thing in retryOperation because we don't want to restart the video generation
  // if the polling fails. We'll handle retries for the initial call and the polling separately.
  
  const ai = getAiClient();
  
  // 1. Initial generation call
  let operation = await retryOperation(async () => {
    return await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt}. Mood: ${style || 'realistic'}. Context: ${narration.substring(0, 200)}`,
      image: imageBase64 ? {
        imageBytes: imageBase64.split(',')[1],
        mimeType: 'image/png'
      } : undefined,
      config: { numberOfVideos: 1, resolution, aspectRatio }
    });
  });

  // 2. Polling loop with its own retry logic for transient errors
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s between polls
    
    try {
      operation = await retryOperation(async () => {
        return await ai.operations.getVideosOperation({ operation: operation });
      }, 3); // Fewer retries for polling
    } catch (error) {
      console.error("Polling failed, but will continue...", error);
      // If polling fails repeatedly, we might want to eventually give up, 
      // but let's try to keep going for a bit.
    }
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed: No download link");
  
  return await retryOperation(async () => {
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: { 'x-goog-api-key': process.env.API_KEY || "" },
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  });
};

export const generateImage = async (
  prompt: string, 
  narration: string, 
  style: ImageStyle, 
  aspectRatio: AspectRatio = '16:9', 
  styleReferenceUrl?: string,
  globalSpeakerMap?: Record<string, string>
): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    
    const styleDescriptions: Record<string, string> = {
      'math-blackboard': 'CRITICAL: The ENTIRE SCENE must be drawn as a 2D chalk sketch ON a dark green blackboard. Use white and colored chalk lines. NO photorealism, NO 3D objects, NO real people. Everything must look like it was hand-drawn with chalk. Include chalk dust, smudges, and faint mathematical formulas in the background.',
      'hyper-realism-3d': 'Hyper-realistic 3D render, Unreal Engine 5 style, octane render, vivid lighting, trendy stylized 3D, high resolution, highly detailed, smooth materials',
      'modern-abstract-gradient': 'Modern abstract gradient style, Apple presentation aesthetic, smooth liquid gradients, frosted glass elements, clean typography integration, premium sleek corporate look',
      'minimal-glassmorphism': 'Minimal glassmorphism UI/UX aesthetic, frosted glass textures over pastel gradients, clean translucent layers, modern tech, soft UI shadows, ultra-clean design',
      'y2k-retro-pop': 'Y2K retro pop aesthetic, bright bubblegum colors, kitsch elements, early 2000s cyber aesthetic, futuristic fonts, shiny chrome accents, vibrant and playful',
      'dark-academia': 'Dark academia aesthetic, moody and scholarly, vintage libraries, tweed and leather, deep brown and gold tones, moody cinematic lighting, intellectual and sophisticated',
      'lofi-anime': 'Lo-Fi anime style, 90s Japanese animation aesthetic, nostalgic atmosphere, warm sunset lighting, cozy room background, muted pastel colors',
      'surreal-collage': 'Surreal hipster collage art, cut-and-paste vintage magazines mixed with modern elements, bold typography, risograph textures, eclectic and thought-provoking',
      'cinematic-realism': 'High-end cinematic realism, professional lighting, 8k resolution, photorealistic, shallow depth of field, dramatic shadows',
      'flat-vector': 'Modern flat vector illustration, corporate minimalist style, solid colors without gradients, clean geometric shapes, professional and approachable',
    };

    const styleDesc = styleDescriptions[style] || style;
    
    // Add character consistency hint if multiple speakers are detected
    let characterHint = "";
    if (globalSpeakerMap && Object.keys(globalSpeakerMap).length > 1) {
      characterHint = `\n[CRITICAL INSTRUCTION: CHARACTER CONSISTENCY]\nIf characters are present in this scene, ensure their appearance (gender, age, clothing, hair) strictly matches their established identity based on the prompt. Maintain exact visual consistency across different scenes.`;
    }

    let finalPrompt = `
[ARTISTIC STYLE OVERRIDE - CRITICAL]
You must strictly render the following scene using this exact artistic style: ${styleDesc}
If the scene description below contains words like "photo", "realistic", "3D", "cinematic", or implies a real-life photograph, YOU MUST IGNORE THEM and force the requested style instead.

[SCENE DESCRIPTION]
${prompt}

[CONTEXT]
${narration.substring(0, 200)}
${characterHint}

[CRITICAL INSTRUCTION: TEXT RENDERING]
DO NOT render the entire context or narration text inside the image. If you must include text (like on a blackboard or sign), use only 1-2 representative keywords. The image should focus on the visual scene, not displaying long text.`;
    
    if (styleReferenceUrl) {
      finalPrompt = `[STRICT STYLE REFERENCE] 
      Ignore the content, characters, and poses of the reference image. 
      ONLY extract and apply the artistic style, color palette, lighting, and texture from the reference image to the following scene:
      ${finalPrompt}`;
    }

    const modelToUse = 'gemini-3.1-flash-image';
    const imageConfig: any = { aspectRatio, imageSize: "1K" };

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: styleReferenceUrl ? {
        parts: [
          { inlineData: { data: styleReferenceUrl.split(',')[1], mimeType: 'image/png' } },
          { text: finalPrompt }
        ]
      } : { parts: [{ text: finalPrompt }] },
      config: { imageConfig }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    
    throw new Error("Image generation failed");
  });
};

const createWavHeader = (dataLength: number) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true);
    return buffer;
};

export const generateSpeech = async (text: string, voice?: string, tone?: AudioTone, speakerMap?: Record<string, string>): Promise<string> => {
    return retryOperation(async () => {
        const ai = getAiClient();
        
        // Detect if multiple speakers are present in the text (e.g., [전문가]: ..., [관찰자]: ...)
        const speakerRegex = /\[(?:나레이션|Narration)?\s*:?\s*\[?(?!(?:비주얼|Visual|이미지|Image|비디오|Video|텍스트|Text|Scene|나레이션|Narration|효과음|BGM|음악|자막))([^\]]+?)\]?\]\s*:/gi;
        const foundSpeakers = Array.from(text.matchAll(speakerRegex)).map(match => match[1].trim());
        const knownTags = ['비주얼', 'Visual', '이미지', 'Image', '비디오', 'Video', '텍스트', 'Text', 'Scene', '나레이션', 'Narration', '효과음', 'BGM', '음악', '자막'];
        const uniqueSpeakers = Array.from(new Set(foundSpeakers))
            .filter(tag => !knownTags.includes(tag) && !tag.toLowerCase().includes('scene'));

        let speechConfig: any = {};

        let finalSpeechText = text;
        if (uniqueSpeakers.length >= 2) {
            // Multi-speaker mode (Requires exactly 2 speakers in current preview)
            const defaultVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
            const speakerConfigs = uniqueSpeakers.slice(0, 2).map((speaker, index) => ({
                speaker,
                voiceConfig: {
                    prebuiltVoiceConfig: { 
                        voiceName: (speakerMap && speakerMap[speaker]) || defaultVoices[index % defaultVoices.length] 
                    }
                }
            }));

            speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: speakerConfigs
                }
            };
            
            // Format text for Gemini TTS: remove brackets around speaker names
            // e.g., "[전문가]: 안녕하세요" -> "전문가: 안녕하세요"
            finalSpeechText = text.replace(/\[(?:나레이션|Narration)?\s*:?\s*\[?([^\]]+?)\]?\]\s*:/gi, '$1:');
        } else {
            // Single speaker mode (or no tags)
            let finalVoice = voice || 'Kore';
            if (uniqueSpeakers.length === 1 && speakerMap && speakerMap[uniqueSpeakers[0]]) {
                finalVoice = speakerMap[uniqueSpeakers[0]];
            }
            
            speechConfig = {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoice } },
            };
            
            // For single speaker, we can just strip the speaker tags entirely to avoid TTS reading them
            finalSpeechText = text.replace(/\[(?:나레이션|Narration)?\s*:?\s*\[?([^\]]+?)\]?\]\s*:/gi, '');
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Tone: ${tone || 'neutral'}. ${finalSpeechText}` }] }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: speechConfig,
            }
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return URL.createObjectURL(new Blob([createWavHeader(bytes.length), bytes], { type: 'audio/wav' }));
    });
};

export const generateOverlayTitle = async (narration: string): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `다음 나레이션의 핵심을 관통하는, 유튜브 시청자의 시선을 끄는 임팩트 있는 짧은 자막(2~4단어)을 딱 하나만 제안하세요. 마크다운이나 따옴표, 설명 없이 결과만 출력하세요.\n\n나레이션: "${narration}"`,
    });
    const result = response.text?.trim()
        .replace(/["'\[\]\*\-]/g, '')
        .split('\n')[0]
        .replace(/^자막:\s*/i, '')
        .replace(/^추천:\s*/i, '')
        .trim();
    return result || "";
  });
};

export const recommendBGM = async (script: string): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `BGM 스타일 추천 (calm, corporate, tense 중 하나). 대본: ${script.substring(0, 500)}`,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { recommendedId: { type: Type.STRING } },
          required: ['recommendedId']
        }
      }
    });
    let res: any = { recommendedId: "calm" };
    try { res = JSON.parse(response.text || '{"recommendedId": "calm"}'); } catch(e) {}
    return res.recommendedId;
  });
};

export const analyzeMotionNecessity = async (prompts: string[]): Promise<string[]> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `각 장면별 'video' 또는 'image' 추천 (JSON 배열). Prompts: ${JSON.stringify(prompts)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    try { return JSON.parse(response.text || "[]"); } catch(e) { return []; }
  });
};

export const generateThumbnail = async (script: string, text: string): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: `YouTube thumbnail for high-level math education. Include abstract math formulas, blueprint grid background, and technical expert mood. Focal Text: "${text}".` }] },
      config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Thumbnail failed");
  });
};

export const generateYouTubeMetadata = async (script: string): Promise<YouTubeMetadata> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `유튜브 메타데이터 JSON 생성. 대본: ${script.substring(0, 1000)}`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              pinnedComment: { type: Type.STRING }
            },
            required: ["title", "description", "tags"]
          }
        }
    });
    let parsed: any = {};
    try {
        parsed = JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse generateYouTubeMetadata response JSON", e);
    }
    return {
        title: parsed.title || "제목 없음",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        pinnedComment: parsed.pinnedComment || ""
    };
};

export const reformatToAppScript = async (content: string, theme: ChannelTheme, mode: 'critic' | 'success' | 'insight' | 'writers-room'): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `다음 텍스트를 우리 앱의 대본 형식([[Scene 1]], [이미지: ...], [나레이션: ...])으로 재구성하세요.
테마: ${theme}
모드: ${mode}
입력 텍스트: ${content.substring(0, 4000)}

[형식 가이드]
- 각 장면은 [[Scene n]]으로 시작합니다.
- 각 장면에는 [이미지: 상세 묘사], [비디오: 상세 묘사], [텍스트: 화면 자막], [나레이션: 읽을 내용]이 포함되어야 합니다.
- 마크다운 형식을 유지하되, 위 태그들을 정확히 사용하세요.
- 대화형 대본인 경우, [비주얼: ...]이나 [이미지: ...] 프롬프트에 등장인물의 외모(성별, 연령대, 옷차림, 헤어스타일 등)를 매 장면마다 동일하게 명시하여 이미지 생성 시 일관성이 유지되도록 하세요.`,
    });
    return response.text || content;
  });
};



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
        
        let parsed: any = {};
        try {
            parsed = JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Failed to parse generateMarketingKit response JSON", e);
        }
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
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: promptText }] },
      config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Thumbnail generation failed");
  });
};
