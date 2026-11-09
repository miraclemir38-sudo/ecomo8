import sys

with open('services/geminiService.ts', 'r') as f:
    code = f.read()

target = """        const editorPrompt = `당신은 "팩트체커 및 교열 에이전트(Editor)"입니다. 다음 초안을 엄격하게 검증하세요.\\n특히 수학/역사/입시 등 사실 기반 콘텐츠일 경우, 과장된 내용이나 역사 왜곡(예: 선행 연구자 누락 등)이 없는지 팩트체크하세요. (예: 아벨의 5차 방정식이라면 루피니와 라그랑주의 기여 등).\\n무리하게 어그로를 끄는 자극적 표현은 걷어내고, 논리적이고 깊이 있는 신뢰감 있는 내용으로 완성하세요.\\n\\n[초안]\\n${draft}`; """

replacement = """        const editorPrompt = `당신은 "팩트체커 및 교열 에이전트(Editor)"입니다. 다음 초안을 엄격하게 검증하세요.\\n특히 수학/역사/입시 등 사실 기반 콘텐츠일 경우, 과장된 내용이나 역사 왜곡이 없는지 팩트체크하세요.\\n\\n[중요 검증 포인트: 입시/트렌드/정책]\\n과거의 트렌드(예: 2024~2025년의 '사탐런', 과탐 가산점 이슈 등)를 현재 시점(${currentYear}년)에 기계적으로 적용하여 논리적 모순이 발생하지 않는지 날카롭게 검토하세요. 예를 들어 2028년 대입 개편으로 통합형 수능이 확정된 상황(2027학년도가 마지막)에서, 곧 사라질 과거의 선택과목 유불리를 메인 전략으로 강조하는 것은 '아마추어적 분석'입니다. 다가올 제도의 변화(재수 불가에 따른 하향 안정화 등)까지 통찰하는 진정한 '1타 전문가'의 시각으로 초안의 논리적 오류를 바로잡고 깊이를 더하세요.\\n\\n무리하게 어그로를 끄는 자극적 표현은 걷어내고, 논리적이고 깊이 있는 신뢰감 있는 내용으로 완성하세요.\\n\\n[초안]\\n${draft}`; """

if target in code:
    code = code.replace(target, replacement)
    with open('services/geminiService.ts', 'w') as f:
        f.write(code)
    print("Editor prompt updated successfully!")
else:
    print("Target editor prompt not found")
