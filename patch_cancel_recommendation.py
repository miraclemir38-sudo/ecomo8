import sys
with open('components/VideoProductionPanel.tsx', 'r') as f:
    code = f.read()

func_target = """  const handleAnalyzeMotion = async () => { if (assets.length === 0) return; setIsAnalyzingMotion(true); try { const prompts = assets.map(a => a.prompt); const recommendations = await analyzeMotionNecessity(prompts); setAssets(prev => prev.map((asset, index) => ({ ...asset, recommendedType: recommendations[index] as GenerationMode }))); } catch (error) { console.error("Analysis failed", error); alert("분석 중 오류가 발생했습니다."); } finally { setIsAnalyzingMotion(false); } };"""

func_replacement = """  const handleAnalyzeMotion = async () => { if (assets.length === 0) return; setIsAnalyzingMotion(true); try { const prompts = assets.map(a => a.prompt); const recommendations = await analyzeMotionNecessity(prompts); setAssets(prev => prev.map((asset, index) => ({ ...asset, recommendedType: recommendations[index] as GenerationMode }))); } catch (error) { console.error("Analysis failed", error); alert("분석 중 오류가 발생했습니다."); } finally { setIsAnalyzingMotion(false); } };
  const handleCancelAnalysis = () => {
    if (confirm('AI의 추천 결과를 모두 취소하시겠습니까?')) {
        setAssets(prev => prev.map(asset => {
            const { recommendedType, ...rest } = asset;
            return rest;
        }));
    }
  };"""

if func_target in code:
    code = code.replace(func_target, func_replacement)
else:
    print("Function target not found")
    sys.exit(1)

ui_target = """            <div className="col-span-2"> <Button variant="outline" size="sm" onClick={handleAnalyzeMotion} className="w-full text-xs py-1.5 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" disabled={isAnalyzingMotion || assets.length === 0} isLoading={isAnalyzingMotion} > <Sparkles className="w-3 h-3 mr-1.5" /> {isAnalyzingMotion ? 'AI가 씬 움직임을 분석 중입니다...' : 'AI 씬 분석: 이미지 vs 동영상 추천 받기'} </Button> </div>"""

ui_replacement = """            <div className="col-span-2 flex gap-2"> 
              <Button variant="outline" size="sm" onClick={handleAnalyzeMotion} className="flex-1 text-xs py-1.5 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" disabled={isAnalyzingMotion || assets.length === 0} isLoading={isAnalyzingMotion} > <Sparkles className="w-3 h-3 mr-1.5" /> {isAnalyzingMotion ? '분석 중...' : '이미지 vs 동영상 추천 받기'} </Button> 
              {assets.some(a => a.recommendedType) && (
                  <Button variant="outline" size="sm" onClick={handleCancelAnalysis} className="text-xs py-1.5 border-slate-300 text-slate-600 hover:bg-slate-100" title="추천 결과 취소"> <RotateCcw className="w-3 h-3 mr-1" /> 취소 </Button>
              )}
            </div>"""

if ui_target in code:
    code = code.replace(ui_target, ui_replacement)
else:
    print("UI target not found")
    sys.exit(1)

with open('components/VideoProductionPanel.tsx', 'w') as f:
    f.write(code)
print("Patched successfully!")
