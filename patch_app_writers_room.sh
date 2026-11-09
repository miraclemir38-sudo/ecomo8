#!/bin/bash
sed -i 's/<div className="grid grid-cols-3 gap-2">/<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">/g' App.tsx

# Add the new button inside the grid
sed -i '/<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">/a \
                    <button\
                       type="button"\
                       onClick={() => setFormData(prev => ({ ...prev, scriptMode: "writers-room" }))}\
                       className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${\
                           formData.scriptMode === "writers-room"\
                           ? "bg-purple-50 border-purple-500 text-purple-600 shadow-sm"\
                           : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"\
                       }`}\
                       title="다중 페르소나 작가실 (팩트체크 및 퀄리티 극대화)"\
                    >\
                       <Brain className="w-4 h-4 sm:w-5 sm:h-5" />\
                       👥 작가실(AI)\
                    </button>\
' App.tsx

# Update the Generate Button color for writers-room
sed -i "s/(formData.scriptMode === 'insight' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500\/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500\/20')/(formData.scriptMode === 'insight' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500\/20' : formData.scriptMode === 'writers-room' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500\/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500\/20')/g" App.tsx

# Update the Generate Button text for writers-room
sed -i 's/(formData.scriptMode === '\''insight'\'' ? "💡 통찰\/전략 대본 생성" : "🇰🇷 성공\/희망 대본 생성")/(formData.scriptMode === '\''insight'\'' ? "💡 통찰\/전략 대본 생성" : formData.scriptMode === '\''writers-room'\'' ? "👥 다중 페르소나 작가실 대본 생성" : "🇰🇷 성공\/희망 대본 생성")/g' App.tsx
