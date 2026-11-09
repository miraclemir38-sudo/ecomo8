node -e '
const fs = require("fs");
let content = fs.readFileSync("./components/VideoProductionPanel.tsx", "utf8");
const target = `<div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1"> <span className="text-[10px] font-bold text-slate-500 px-1">로고 위치</span> <button onClick={() => setLogoPosition('\''left'\'')} className={\`p-1 rounded transition-all \${logoPosition === '\''left'\'' ? '\''bg-slate-800 text-white shadow-sm'\'' : '\''text-slate-400 hover:bg-slate-50 hover:text-slate-800'\''}\`} title="로고 왼쪽 상단" > <AlignLeft className="w-3 h-3" /> </button> <button onClick={() => setLogoPosition('\''right'\'')} className={\`p-1 rounded transition-all \${logoPosition === '\''right'\'' ? '\''bg-slate-800 text-white shadow-sm'\'' : '\''text-slate-400 hover:bg-slate-50 hover:text-slate-800'\''}\`} title="로고 우측 상단" > <AlignRight className="w-3 h-3" /> </button> </div>`;

const replacement = `<div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1"> <span className="text-[10px] font-bold text-slate-500 px-1">로고 위치</span> <button onClick={() => setLogoPosition('\''left'\'')} className={\`p-1 rounded transition-all \${logoPosition === '\''left'\'' ? '\''bg-slate-800 text-white shadow-sm'\'' : '\''text-slate-400 hover:bg-slate-50 hover:text-slate-800'\''}\`} title="로고 왼쪽 상단" > <AlignLeft className="w-3 h-3" /> </button> <button onClick={() => setLogoPosition('\''right'\'')} className={\`p-1 rounded transition-all \${logoPosition === '\''right'\'' ? '\''bg-slate-800 text-white shadow-sm'\'' : '\''text-slate-400 hover:bg-slate-50 hover:text-slate-800'\''}\`} title="로고 우측 상단" > <AlignRight className="w-3 h-3" /> </button> <button onClick={() => setLogoPosition('\''none'\'')} className={\`p-1 rounded transition-all \${logoPosition === '\''none'\'' ? '\''bg-slate-800 text-white shadow-sm'\'' : '\''text-slate-400 hover:bg-slate-50 hover:text-slate-800'\''}\`} title="로고 숨김" > <X className="w-3 h-3" /> </button> </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync("./components/VideoProductionPanel.tsx", content);
  console.log("Success");
} else {
  console.log("Target not found");
}
'
