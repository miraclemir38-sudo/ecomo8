import re

with open('components/VideoProductionPanel.tsx', 'r') as f:
    content = f.read()

old_array = re.search(r"const STYLE_OPTIONS: \{ value: ImageStyle; label: string \}\[\] = \[\s*// --- Trending Styles ---[\s\S]*?\];", content).group(0)

new_array = """const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  // --- Do NOT Touch ---
  { value: 'math-blackboard', label: '📐 수학 칠판 (Math Blackboard)' },
  
  // --- New Trendy Styles (2026/2027) ---
  { value: 'hyper-realism-3d', label: '✨ 하이퍼 리얼리즘 3D (Trendy 3D)' },
  { value: 'modern-abstract-gradient', label: '🌈 모던 추상 그라데이션 (Apple Style)' },
  { value: 'minimal-glassmorphism', label: '🧊 미니멀 글래스모피즘 (UI/UX Look)' },
  { value: 'y2k-retro-pop', label: '💿 Y2K 레트로 팝 (Kitsch & Hip)' },
  { value: 'dark-academia', label: '📚 다크 아카데미아 (Dark Academia)' },
  { value: 'lofi-anime', label: '🎧 로파이 감성 애니 (Lo-Fi Anime)' },
  { value: 'surreal-collage', label: '📰 초현실 힙스터 콜라주 (Surreal Collage)' },
  
  // --- Essentials ---
  { value: 'cinematic-realism', label: '🎬 시네마틱 실사 (Cinematic Realism)' },
  { value: 'flat-vector', label: '🔷 모던 플랫 벡터 (Corporate)' },
];"""

content = content.replace(old_array, new_array)

with open('components/VideoProductionPanel.tsx', 'w') as f:
    f.write(content)
print("Updated VideoProductionPanel.tsx")
