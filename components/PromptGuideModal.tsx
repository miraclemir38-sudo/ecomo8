import React from 'react';
import { X, Lightbulb, Zap, DollarSign, Palette, Type } from 'lucide-react';
import { Button } from './Button';

interface PromptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptGuideModal: React.FC<PromptGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-brand-700">
            <Lightbulb className="w-5 h-5" />
            <h2 className="text-xl font-bold">EcoScript 프롬프트 가이드</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Section 1: Cost Efficiency */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold border-b border-emerald-100 pb-2">
              <DollarSign className="w-5 h-5" />
              <h3>비용 절감 & 고효율 전략</h3>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-sm text-slate-700 space-y-2">
              <p className="font-medium text-emerald-800">🚀 하이브리드 워크플로우 (Hybrid Workflow)</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>1단계 (이미지):</strong> 먼저 <span className="text-emerald-700 font-bold">이미지 모드</span>로 구도를 잡으세요. 비용이 훨씬 저렴합니다.
                </li>
                <li>
                  <strong>2단계 (애니메이션):</strong> 마음에 드는 이미지가 나오면 <span className="text-purple-700 font-bold">[Veo로 움직임 주기]</span> 버튼을 눌러 영상으로 변환하세요.
                </li>
                <li>
                  <strong>해상도:</strong> 유튜브 모바일 시청자는 <strong>720p</strong>로도 충분합니다. 1080p는 중요한 메인 컷에만 사용하세요.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Visual Styles */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-purple-600 font-semibold border-b border-purple-100 pb-2">
              <Palette className="w-5 h-5" />
              <h3>비주얼 스타일 & 무드 (Keywords)</h3>
            </div>
            <p className="text-sm text-slate-600">
              프롬프트 뒤에 아래 키워드를 붙이면 퀄리티가 급격히 상승합니다. (자동으로 일부 적용되지만, 강조하고 싶을 때 추가하세요)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded p-3 hover:bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-1">영화 같은 느낌 (Cinematic)</span>
                <code className="text-xs text-purple-700 bg-purple-50 px-1 py-0.5 rounded block">
                  cinematic lighting, dramatic shadows, 4k, depth of field, anamorphic lens
                </code>
              </div>
              <div className="border border-slate-200 rounded p-3 hover:bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-1">전문적/뉴스 (Professional)</span>
                <code className="text-xs text-blue-700 bg-blue-50 px-1 py-0.5 rounded block">
                  studio lighting, clean background, sharp focus, professional photography, bright
                </code>
              </div>
              <div className="border border-slate-200 rounded p-3 hover:bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-1">미니멀/그래픽 (Minimalist)</span>
                <code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded block">
                  minimalist, flat design, isometric, white background, simple shapes
                </code>
              </div>
               <div className="border border-slate-200 rounded p-3 hover:bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-1">사이버펑크/미래 (Futuristic)</span>
                <code className="text-xs text-pink-700 bg-pink-50 px-1 py-0.5 rounded block">
                  neon lights, cyberpunk, futuristic city, glowing, night time
                </code>
              </div>
            </div>
          </section>

          {/* Section 3: Text Handling */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-orange-600 font-semibold border-b border-orange-100 pb-2">
              <Type className="w-5 h-5" />
              <h3>텍스트 & 한글 (New)</h3>
            </div>
             <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-sm text-slate-700 space-y-2">
              <p className="font-medium text-orange-800">💡 텍스트를 이미지에 넣고 싶다면?</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>따옴표 사용:</strong> 넣고 싶은 글자를 <strong>"경제 위기"</strong> 처럼 따옴표로 감싸서 요청하세요.
                </li>
                <li>
                  <strong>명확한 지시:</strong> "간판에 '뉴스'라고 써줘" 처럼 구체적으로 지시하면 AI가 <strong>legible typography(읽기 쉬운 글자)</strong> 모드로 작동합니다.
                </li>
                <li>
                  <strong>기본 동작:</strong> 텍스트 언급이 없으면, 깨짐 방지를 위해 자동으로 글자가 없는 깔끔한 이미지(No Text)가 생성됩니다.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Example Prompts */}
          <section className="space-y-3">
             <div className="flex items-center gap-2 text-brand-600 font-semibold border-b border-brand-100 pb-2">
              <Zap className="w-5 h-5" />
              <h3>성공적인 프롬프트 예시</h3>
            </div>
            <div className="space-y-3">
                <div className="text-sm">
                    <p className="font-semibold text-slate-700 mb-1">❌ 나쁜 예:</p>
                    <p className="bg-red-50 text-red-700 p-2 rounded border border-red-100">
                        경제 그래프
                    </p>
                </div>
                <div className="text-sm">
                    <p className="font-semibold text-slate-700 mb-1">✅ 좋은 예 (구체적 묘사):</p>
                    <p className="bg-brand-50 text-brand-700 p-2 rounded border border-brand-100">
                        상승하는 빨간색 주식 차트 라인, 배경에는 희미한 월스트리트 건물, 영화 같은 조명, 4k 고화질
                    </p>
                </div>
                <div className="text-sm">
                    <p className="font-semibold text-slate-700 mb-1">✅ 텍스트 포함 예시:</p>
                    <p className="bg-orange-50 text-orange-700 p-2 rounded border border-orange-100">
                        나무 팻말에 "성공 투자"라고 적혀있는 이미지, 숲 배경, 선명한 글자
                    </p>
                </div>
            </div>
          </section>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};
