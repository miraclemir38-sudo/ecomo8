import re

with open('services/geminiService.ts', 'r') as f:
    content = f.read()

# Using regex to find the styleDescriptions object.
old_obj_match = re.search(r"const styleDescriptions: Record<string, string> = \{[\s\S]*?\};\n", content)
old_obj = old_obj_match.group(0)

new_obj = """const styleDescriptions: Record<string, string> = {
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
"""

content = content.replace(old_obj, new_obj)

with open('services/geminiService.ts', 'w') as f:
    f.write(content)
print("Updated geminiService.ts")
