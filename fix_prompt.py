import sys

with open('services/geminiService.ts', 'r') as f:
    code = f.read()

target1 = "const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다."
replacement1 = """const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다. 
[중요 컨텍스트] 현재 시점은 ${currentYear}년 ${currentMonth}월입니다. 대본 내에서 다루는 주제(예: 입시, 수능, 선거, 주요 트렌드 등)의 연도나 시점은 반드시 이 현재 시점을 기준으로 최신 사실에 맞게 반영하세요. (예: 현재가 2026년 하반기라면 다가오는 수능은 '2027학년도 수능'이며, 입시 제도 역시 해당 학년도의 최신 확정안을 기준으로 작성해야 합니다. 절대 과거 연도로 착각하지 마세요!)
"""

target2 = "const writerPrompt = `당신은 \"초안 작가 에이전트\"입니다."
replacement2 = """const writerPrompt = `당신은 "초안 작가 에이전트"입니다.
[중요 컨텍스트] 현재 시점은 ${currentYear}년 ${currentMonth}월입니다. 입시(수능 학년도), 정책, 최신 트렌드 등 시점과 관련된 모든 정보는 현재 시점을 기준으로 최신 사실에 맞게 반영하세요. (예: 2026년 하반기 기준 다가오는 수능은 '2027학년도 수능'입니다.)
"""

if target1 in code:
    code = code.replace(target1, replacement1)
    print("Replaced target1")
else:
    print("target1 not found")

if target2 in code:
    code = code.replace(target2, replacement2)
    print("Replaced target2")
else:
    print("target2 not found")

with open('services/geminiService.ts', 'w') as f:
    f.write(code)

