import sys
with open('components/VideoProductionPanel.tsx', 'r') as f:
    code = f.read()

old_cancel = """  const handleCancelAnalysis = () => {
    if (confirm('AI의 추천 결과를 모두 취소하시겠습니까?')) {
        setAssets(prev => prev.map(asset => {
            const { recommendedType, ...rest } = asset;
            return rest;
        }));
    }
  };"""

new_cancel = """  const handleCancelAnalysis = () => {
    // iframe 샌드박스 이슈로 confirm 생략하고 바로 취소
    setAssets(prev => prev.map(asset => ({
        ...asset,
        recommendedType: undefined
    })));
  };"""

if old_cancel in code:
    code = code.replace(old_cancel, new_cancel)
    with open('components/VideoProductionPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully!")
else:
    print("Target not found")
