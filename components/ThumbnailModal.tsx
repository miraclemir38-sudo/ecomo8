
import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw, Image as ImageIcon, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from './Button';

interface ThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailUrl: string | null;
  isGenerating: boolean;
  onGenerate: (text: string) => void;
}

export const ThumbnailModal: React.FC<ThumbnailModalProps> = ({ 
  isOpen, 
  onClose, 
  thumbnailUrl, 
  isGenerating, 
  onGenerate 
}) => {
  const [textOverlay, setTextOverlay] = useState("");

  // Reset text when opening modal
  useEffect(() => {
     if (isOpen && !textOverlay) {
         setTextOverlay("충격적인 진실"); // Default placeholder suggestion
     }
  }, [isOpen]);

  const handleDownload = () => {
      if (!thumbnailUrl) return;
      const link = document.createElement('a');
      link.download = `ecomo_thumbnail_${new Date().getTime()}.png`;
      link.href = thumbnailUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-brand-700">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-bold">AI 썸네일 생성기 (Gemini 3.0 Pro)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Preview Area */}
            <div className="flex-1 bg-slate-900 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
                {isGenerating ? (
                    <div className="text-center space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                            <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl animate-pulse opacity-50"></div>
                            <Loader2 className="w-16 h-16 text-white animate-spin relative z-10" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-white">
                                AI가 썸네일을 디자인 중입니다...
                            </p>
                            <p className="text-sm text-slate-400">
                                텍스트 렌더링 및 구도 최적화 (Gemini 3.0 Pro)
                            </p>
                        </div>
                    </div>
                ) : thumbnailUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative w-full aspect-video shadow-2xl rounded-lg overflow-hidden border border-slate-700 group">
                            <img 
                                src={thumbnailUrl} 
                                alt="Generated Thumbnail" 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 text-slate-500">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700">
                            <ImageIcon className="w-10 h-10 text-slate-600" />
                        </div>
                        <p className="text-sm">
                            우측 패널에서 문구를 입력하고<br/>
                            <span className="font-bold text-slate-400">'생성하기'</span> 버튼을 눌러주세요.
                        </p>
                    </div>
                )}
            </div>

            {/* Right: Simple Controls */}
            <div className="w-full md:w-80 bg-white border-l border-slate-100 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-brand-600" /> 
                            썸네일 문구 입력
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            이미지 안에 자연스럽게 들어갈 핵심 문구를 입력하세요. 
                            (짧을수록 임팩트가 강합니다)
                        </p>
                        
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Copy</label>
                            <input 
                                type="text" 
                                value={textOverlay}
                                onChange={(e) => setTextOverlay(e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:font-normal"
                                placeholder="예: 삼성전자 위기, 5만전자 붕괴"
                                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && onGenerate(textOverlay)}
                            />
                            <p className="text-[11px] text-slate-400">
                                * Gemini 3.0 Pro 모델이 텍스트를 이미지의 일부(간판, 네온, 3D 타이포그래피 등)로 직접 그려냅니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mt-6">
                    <Button 
                        variant="primary" 
                        onClick={() => onGenerate(textOverlay)} 
                        disabled={isGenerating || !textOverlay.trim()}
                        className="w-full py-4 text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                디자인 중...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5 mr-2" />
                                {thumbnailUrl ? '다른 디자인으로 재생성' : 'AI 썸네일 생성'}
                            </>
                        )}
                    </Button>
                    
                    <Button 
                        variant="secondary" 
                        onClick={handleDownload}
                        disabled={!thumbnailUrl || isGenerating}
                        className="w-full"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        이미지 다운로드
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
