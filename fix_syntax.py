import sys

with open('services/geminiService.ts', 'r') as f:
    code = f.read()

# First, move `const now = new Date(); ...` to the very top of `generateScript`
code = code.replace("""const dialogueInstruction = isDialogue ?""", """const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const dialogueInstruction = isDialogue ?""")

# Then remove the duplicate `const now...` that I added in replacement1
code = code.replace("""    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다.""", """    const prompt = `당신은 유튜브 조회수 100만 회를 보장하는 전문 시나리오 작가입니다.""")

with open('services/geminiService.ts', 'w') as f:
    f.write(code)
print("Fixed syntax")
