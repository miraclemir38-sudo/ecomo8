import re

with open('types.ts', 'r') as f:
    content = f.read()

old_type = re.search(r"export type ImageStyle =[\s\S]*?;", content).group(0)

new_type = """export type ImageStyle = 
  | 'math-blackboard'
  | 'hyper-realism-3d'
  | 'modern-abstract-gradient'
  | 'minimal-glassmorphism'
  | 'y2k-retro-pop'
  | 'dark-academia'
  | 'lofi-anime'
  | 'surreal-collage'
  | 'cinematic-realism'
  | 'flat-vector';"""

content = content.replace(old_type, new_type)

with open('types.ts', 'w') as f:
    f.write(content)
print("Updated types.ts")
