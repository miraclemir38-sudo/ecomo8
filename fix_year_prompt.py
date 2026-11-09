import sys
import re

with open('services/geminiService.ts', 'r') as f:
    code = f.read()

target = """    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다. AI가 분석한 이 주제의 최적 영상 길이는 **${length}분**입니다. 시청자가 지루하지 않으면서도 정보를 충분히 소화할 수 있도록 리드미컬한 호흡으로 구성하세요.
주제: ${finalTopicContext}
타겟: ${audience}"""

replacement = """    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다. AI가 분석한 이 주제의 최적 영상 길이는 **${length}분**입니다. 시청자가 지루하지 않으면서도 정보를 충분히 소화할 수 있도록 리드미컬한 호흡으로 구성하세요.
[중요 컨텍스트] 현재 시점은 ${currentYear}년 ${currentMonth}월입니다. 대본 내에서 다루는 주제(예: 입시, 수능, 선거, 트렌드, 이벤트 등)의 연도나 시점은 이 현재 시점을 기준으로 정확히 반영하세요. (예: 현재가 2026년 하반기라면 다가오는 수능은 '2027학년도 수능'이며, 입시 제도나 가산점 등도 해당 학년도의 최신 확정(또는 예고)된 제도를 기준으로 작성해야 합니다.)

주제: ${finalTopicContext}
타겟: ${audience}"""

if target in code:
    code = code.replace(target, replacement)
    with open('services/geminiService.ts', 'w') as f:
        f.write(code)
    print("Patched prompt successfully!")
else:
    print("Target prompt not found in generateScript")

target_writers_room = """        const writerPrompt = `당신은 "초안 작가 에이전트"입니다. 다음 주제에 대해 상세하고 흥미로운 스토리텔링 뼈대(초안)를 작성하세요.\n주제: ${finalTopicContext}\n타겟: ${audience}\n${dialogueInstruction}`; """

replacement_writers_room = """        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const writerPrompt = `당신은 "초안 작가 에이전트"입니다. 다음 주제에 대해 상세하고 흥미로운 스토리텔링 뼈대(초안)를 작성하세요.
[중요 컨텍스트] 현재 시점은 ${currentYear}년 ${currentMonth}월입니다. 입시(수능 학년도), 정책, 최신 트렌드 등 시점과 관련된 모든 정보는 현재 시점을 기준으로 최신 사실에 맞게 반영하세요. (예: 2026년 하반기 기준 다가오는 수능은 '2027학년도 수능'입니다.)\n주제: ${finalTopicContext}\n타겟: ${audience}\n${dialogueInstruction}`; """

if target_writers_room in code:
    code = code.replace(target_writers_room, replacement_writers_room)
    with open('services/geminiService.ts', 'w') as f:
        f.write(code)
    print("Patched writers room prompt successfully!")
else:
    print("Target writers room prompt not found")
