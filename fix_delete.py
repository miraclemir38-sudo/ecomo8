import sys

with open('components/VideoProductionPanel.tsx', 'r') as f:
    content = f.read()

old_block = """  const handleDeleteScene = (id: string) => {
    if (confirm('정말로 이 씬을 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };"""

new_block = """  const handleDeleteScene = (id: string) => {
    // iframe 샌드박스에서 confirm이 차단될 수 있으므로 직접 삭제
    setAssets(prev => prev.filter(a => a.id !== id));
  };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('components/VideoProductionPanel.tsx', 'w') as f:
        f.write(content)
    print("Fixed delete function successfully.")
else:
    print("Could not find the function.")
