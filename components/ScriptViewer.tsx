
import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, Download, FileText, Clock, ExternalLink, BookOpen, Zap, 
  Loader2, Edit3, Save, X, Info, Sparkles, ShieldCheck, CheckCircle2, 
  ChevronDown, ChevronUp, Globe
} from 'lucide-react';
import { Button } from './Button';
import { Source, ChannelTheme, FactCheckReport } from '../types';
import { reformatToAppScript } from '../services/geminiService';

interface ScriptViewerProps {
  content: string;
  sources?: Source[];
  factCheckReport?: FactCheckReport | null;
  onExtractShorts?: () => void;
  isExtractingShorts?: boolean;
  onUpdateScript?: (newContent: string) => void;
  channelTheme?: ChannelTheme;
  scriptMode?: 'critic' | 'success' | 'insight' | 'writers-room';
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ 
  content, 
  sources, 
  factCheckReport,
  onExtractShorts, 
  isExtractingShorts = false,
  onUpdateScript,
  channelTheme = 'economy',
  scriptMode = 'insight'
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isReformatting, setIsReformatting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(true);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editContent : content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([isEditing ? editContent : content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = "youtube_script.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleApplyChanges = () => {
    if (onUpdateScript) {
      onUpdateScript(editContent);
      setIsEditing(false);
      alert("대본이 성공적으로 업데이트되었습니다. 비디오 제작 탭에서 확인하세요!");
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleReformat = async () => {
    if (!editContent.trim()) {
      alert("변환할 텍스트를 먼저 입력해주세요.");
      return;
    }
    
    setIsReformatting(true);
    try {
      // Fix: Explicitly cast channelTheme and scriptMode to satisfy type checker for narrowed optional props
      const reformatted = await reformatToAppScript(editContent, channelTheme as ChannelTheme, scriptMode as 'critic' | 'success' | 'insight');
      setEditContent(reformatted);
    } catch (error) {
      alert("형식 변환 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsReformatting(false);
    }
  };

  const estimatedTime = useMemo(() => {
    const targetContent = isEditing ? editContent : content;
    const narrationMatches = targetContent.match(/(?:\[(?:나레이션|Narration)(?:\s*:\s*|\]\s*))([\s\S]*?)(?:\]|(?=\[)|$)/gi);
    let cleanText = "";
    if (narrationMatches && narrationMatches.length > 0) {
        cleanText = narrationMatches.map(m => m.replace(/\[(?:나레이션|Narration)(?:\s*:\s*|\]\s*)/i, '').replace(/\]$/, '')).join(" ");
    } else {
        cleanText = targetContent.replace(/\[(?:이미지|Image|비디오|Video).*?\]/gi, '').replace(/\[\[.*?\]\]/g, '').replace(/[#*`_]/g, '');
    }
    const charCount = cleanText.replace(/\s/g, '').length;
    const SPEAKING_RATE_CPM = 330; 
    const totalSeconds = (charCount / SPEAKING_RATE_CPM) * 60;
    const minutes = Math.floor(totalSeconds / 60); 
    const seconds = Math.round(totalSeconds % 60);
    if (charCount < 10) return "작성 중...";
    return `${minutes}분 ${seconds}초`;
  }, [content, editContent, isEditing]);

  const canExtractShorts = useMemo(() => {
    const isLongform = estimatedTime.includes('분') && parseInt(estimatedTime.split('분')[0]) >= 3;
    return isLongform && !isEditing;
  }, [estimatedTime, isEditing]);

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0 relative">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <FileText className="w-5 h-5 text-brand-600" />
                <span>{isEditing ? '대본 직접 입력/수정' : '생성된 대본'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                <Clock className="w-3 h-3" />
                <span>예상 소요 시간: <span className="text-brand-600 font-bold">{estimatedTime}</span></span>
            </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              {canExtractShorts && onExtractShorts && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onExtractShorts} 
                    isLoading={isExtractingShorts}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hidden sm:flex"
                >
                    {!isExtractingShorts && <Zap className="w-4 h-4 mr-1.5" />}
                    쇼츠 추출
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-slate-600 hover:text-brand-600">
                <Edit3 className="w-4 h-4 mr-1.5" />
                수정/입력
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="text-sm px-3 py-1.5">
                <Download className="w-4 h-4 mr-1.5" />
                저장
              </Button>
              <Button variant="primary" size="sm" onClick={handleCopy} className="text-sm px-3 py-1.5">
                {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? "복사됨" : "복사"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-1.5" />
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyChanges}>
                <Save className="w-4 h-4 mr-1.5" />
                변경사항 적용
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {isEditing && (
            <div className="w-64 border-r border-slate-100 bg-slate-50 p-4 overflow-y-auto hidden lg:block text-xs">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 mb-4">
                    <Info className="w-3.5 h-3.5 text-brand-600" />
                    작성 가이드
                </h4>
                <div className="space-y-4 text-slate-500 leading-relaxed">
                    <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 mb-4">
                        <p className="font-bold text-brand-800 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI 포맷터 활용
                        </p>
                        <p>블로그 글이나 뉴스를 그대로 붙여넣고 하단의 <strong>[AI 형식 변환]</strong> 버튼을 눌러보세요!</p>
                    </div>
                    <p>직접 작성 시 엔진이 인식할 수 있도록 아래 형식을 지켜주세요.</p>
                    <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[10px] space-y-2">
                        <div className="text-brand-600">[[Scene 1]]</div>
                        <div>[이미지: 상승하는 차트]</div>
                        <div>[비디오: 차트가 상승하는 애니메이션]</div>
                        <div>[텍스트: 경제 위기 탈출]</div>
                        <div>[나레이션: 안녕하세요, 여러분...]</div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 relative flex flex-col">
            {(isExtractingShorts || isReformatting) && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">
                      {isReformatting ? 'AI가 앱 형식으로 대본을 재구성 중입니다...' : '쇼츠 하이라이트 추출 중...'}
                    </h3>
                </div>
            )}

            {isEditing ? (
                <div className="flex-1 flex flex-col">
                  <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="블로그 글이나 뉴스를 여기에 붙여넣은 후, 아래 [AI 형식으로 자동 변환] 버튼을 누르세요..."
                      className="flex-1 w-full min-h-[400px] resize-none border-none outline-none font-mono text-sm leading-relaxed text-slate-700 placeholder:text-slate-300"
                  />
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <Button 
                      variant="secondary" 
                      onClick={handleReformat}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 group"
                      disabled={isReformatting}
                    >
                      <Sparkles className="w-4 h-4 text-brand-400 group-hover:scale-125 transition-transform" />
                      ✨ 입력한 글을 AI 형식으로 자동 변환하기
                    </Button>
                  </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* 작가실 2단계: 팩트체커 & 교열 에이전트 검증 리포트 카드 */}
                    {factCheckReport && (
                        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-slate-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm text-slate-800 transition-all">
                            <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                                작가실 2단계: 팩트체커 & 교열 에디터 검증 보고서
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                검증 완료
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Google Search 실시간 팩트체크 기반 정책/입시 사실관계 교열 완료 {factCheckReport.checkedAt && `(${factCheckReport.checkedAt})`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportOpen(!isReportOpen)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100/50 transition-colors"
                                    title={isReportOpen ? "리포트 접기" : "리포트 펼치기"}
                                >
                                    {isReportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>

                            {isReportOpen && (
                                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                    {/* 에디터 종합 총평 */}
                                    <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-100/80 text-xs text-slate-700 leading-relaxed shadow-xs">
                                        <p className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                            수석 에디터 교열 총평
                                        </p>
                                        <p className="text-slate-600 pl-5 font-medium">
                                            {factCheckReport.editorCritique}
                                        </p>
                                    </div>

                                    {/* 2열 그리드: 검증된 사실 vs 초안 대비 수정 정제 내역 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        {/* 검증된 핵심 팩트 */}
                                        <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                                            <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                검증 확인된 사실 (Verified Facts)
                                            </h4>
                                            <ul className="space-y-1.5 pl-1">
                                                {factCheckReport.verifiedFacts.map((fact, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-slate-700 leading-snug">
                                                        <span className="text-emerald-500 font-bold shrink-0">•</span>
                                                        <span>{fact}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* 수정 및 정제 내역 */}
                                        <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                                            <h4 className="font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                                                <Sparkles className="w-4 h-4 text-amber-600" />
                                                초안 대비 수정/정제 내역 (Corrected)
                                            </h4>
                                            <ul className="space-y-1.5 pl-1">
                                                {factCheckReport.correctedPoints.map((point, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-slate-700 leading-snug">
                                                        <span className="text-amber-500 font-bold shrink-0">•</span>
                                                        <span>{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="prose prose-slate max-w-none prose-headings:text-brand-900 prose-a:text-brand-600">
                        <ReactMarkdown
                        components={{
                            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-6 pb-2 border-b border-slate-200" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 text-brand-800" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-6 mb-3 text-slate-800" {...props} />,
                            p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-700" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                            li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
                            blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-brand-500 pl-4 py-2 italic bg-brand-50 rounded-r my-4" {...props} />
                            ),
                            code: ({node, ...props}) => (
                            <code className="bg-slate-100 text-brand-600 px-1.5 py-0.5 rounded text-sm font-medium font-mono border border-slate-200" {...props} />
                            )
                        }}
                        >
                        {content || "대본이 비어있습니다. [수정/입력] 버튼을 눌러 대본을 직접 입력해보세요."}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {!isEditing && sources && sources.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-brand-600" />
                            공식 검증 및 참고 자료
                        </h3>
                        <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            신뢰 출처 {sources.length}건
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {sources.map((source, index) => {
                            let domain = "";
                            try {
                                domain = new URL(source.uri).hostname.replace(/^www\./, '');
                            } catch (e) {
                                domain = "공식 링크";
                            }
                            return (
                                <a 
                                    key={index}
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50 hover:border-brand-400 transition-all group bg-white shadow-xs"
                                >
                                    <div className="bg-brand-50 p-2 rounded-lg border border-brand-100/50 text-brand-600 group-hover:scale-105 transition-transform shrink-0">
                                        <ExternalLink className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-700">
                                            {source.title}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                                            {domain}
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
