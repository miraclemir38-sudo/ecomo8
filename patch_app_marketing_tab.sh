#!/bin/bash
sed -i '/<Video className="w-4 h-4" \/> 비디오 제작/a \
             </button>\
             <button\
               onClick={() => setActiveTab('\''marketing'\'')}\
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === '\''marketing'\'' ? '\''bg-green-600 text-white shadow-md'\'' : '\''text-slate-500 hover:bg-slate-50'\''}`}\
             >\
               <Megaphone className="w-4 h-4" /> 마케팅/SEO' App.tsx
