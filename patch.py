import sys

with open('components/VideoProductionPanel.tsx', 'r') as f:
    content = f.read()

func_def = """  const handleAddEmptyScene = () => {
    const newAsset: VideoAsset = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: "",
      visualPrompt: "",
      narration: "",
      status: 'idle',
      assetType: 'image',
      imageStyle: 'realistic',
      cameraMotion: 'auto',
      audioStatus: 'idle',
    };
    setAssets(prev => [...prev, newAsset]);
  };"""

replacement = func_def + """

  const handleDeleteScene = (id: string) => {
    if (confirm('정말로 이 씬을 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };"""

if func_def in content:
    content = content.replace(func_def, replacement)
    with open('components/VideoProductionPanel.tsx', 'w') as f:
        f.write(content)
    print("Function added successfully")
else:
    print("Function not found")
