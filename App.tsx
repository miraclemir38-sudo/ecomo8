
import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
// Added FolderOpen to the lucide-react import list
import { Youtube, Megaphone, BookOpen, Search, Settings2, Sparkles, Loader2, ChevronRight, Video, TrendingUp, Key, AlertCircle, CheckCircle2, ShieldCheck, XCircle, Download, Info, Zap, Lightbulb, GraduationCap, Brain, FileText, FolderOpen, Edit3, History, Trash2 } from 'lucide-react';
import { set as idbSet, get as idbGet, del as idbDel } from 'idb-keyval';
import { Button } from './components/Button';
import { TopicModal } from './components/TopicModal';
import { ScriptViewer } from './components/ScriptViewer';
import { VideoProductionPanel } from './components/VideoProductionPanel';
import { MarketingPanel } from './components/MarketingPanel';
import { LandingPage } from './components/LandingPage';
import { EcoMoLogo, MindExodusLogo, EducationLogo } from './components/Logo';
import { suggestTopics, generateScript, extractShortsFromScript } from './services/geminiService';
import { ScriptFormData, TopicSuggestion, Source, VideoAsset, FactCheckReport, MarketingKit } from './types';
import { DEFAULT_AUDIENCE, DEFAULT_LENGTH, DEFAULT_AUDIENCE_ECONOMY, DEFAULT_AUDIENCE_EDUCATION, DEFAULT_AUDIENCE_PSYCHOLOGY } from './constants';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">앗, 오류가 발생했습니다</h1>
            <p className="text-slate-500 mb-6 text-sm">
              앱 실행 중 예기치 않은 문제가 발생했습니다. 메모리 부족이거나 일시적인 오류일 수 있습니다.
            </p>
            <div className="bg-slate-50 p-3 rounded text-left text-xs text-slate-600 font-mono overflow-auto max-h-32 mb-6">
              {this.state.error?.message || "알 수 없는 오류"}
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-brand-600 text-white font-medium py-2 rounded-lg hover:bg-brand-700 transition-colors">
              새로고침하여 다시 시작
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
          // Add a timeout to prevent hanging if the parent window connection is lost
          const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 2000));
          const hasKeyPromise = (window as any).aistudio.hasSelectedApiKey();
          const hasKey = await Promise.race([hasKeyPromise, timeoutPromise]);
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true);
        }
      } catch (error) {
        console.error("Failed to check API key:", error);
        setHasApiKey(true); // Fallback to allow app to load
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  // View State: 'landing' | 'studio'
  const [currentView, setCurrentView] = useState<'landing' | 'studio'>('landing');

  const [formData, setFormData] = useState<ScriptFormData>({
    topic: '',
    audience: DEFAULT_AUDIENCE,
    length: DEFAULT_LENGTH,
    materials: '',
    useAiResearch: false,
    scriptMode: 'critic', // Default to Critic
    channelTheme: 'economy', // Default to Economy
    isDialogue: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingShorts, setIsExtractingShorts] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [marketingKit, setMarketingKit] = useState<MarketingKit | null>(null);
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [scriptSources, setScriptSources] = useState<Source[]>([]);
  const [factCheckReport, setFactCheckReport] = useState<FactCheckReport | null>(null);
  const [activeTab, setActiveTab] = useState<'script' | 'video' | 'marketing'>('script');
  
  // Lifted assets state for backup/restore
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [globalSpeakerMap, setGlobalSpeakerMap] = useState<Record<string, string>>({});
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [hasRecoverableProject, setHasRecoverableProject] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);

  // Load used topics on start
  useEffect(() => {
    const saved = localStorage.getItem('moses-math-used-topics');
    if (saved) {
      try {
        setUsedTopics(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load used topics", e);
      }
    }
  }, []);

  // Save used topics when they change
  useEffect(() => {
    localStorage.setItem('moses-math-used-topics', JSON.stringify(usedTopics));
  }, [usedTopics]);

  // Auto-Save Logic: To prevent data loss on refresh/crash
  useEffect(() => {
    const saveProject = async () => {
      if (!generatedScript && assets.length === 0) return;
      
      try {
        const timestamp = new Date().toISOString();
        
        // Fetch blobs for valid blob URLs so they can be stored in IndexedDB
        const assetsWithBlobs = await Promise.all(assets.map(async (asset) => {
           const newAsset: any = { ...asset };
           const fetchBlob = async (url?: string) => {
              if (url && url.startsWith('blob:')) {
                 try {
                    const res = await fetch(url);
                    if (res.ok) return await res.blob();
                 } catch (e) {}
              }
              return undefined;
           };
           
           newAsset.blobData = await fetchBlob(newAsset.url);
           newAsset.audioBlobData = await fetchBlob(newAsset.audioUrl);
           newAsset.originalImageBlobData = await fetchBlob(newAsset.originalImageUrl);
           
           return newAsset;
        }));

        await idbSet('autosave-project', {
          formData,
          generatedScript,
          scriptSources,
          factCheckReport,
          assets: assetsWithBlobs,
          globalSpeakerMap,
          detectedSpeakers,
          timestamp
        });
        setLastSavedTime(timestamp);
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    };

    // Debounce auto-save to avoid excessive writes
    const timer = setTimeout(saveProject, 2000);
    return () => clearTimeout(timer);
  }, [formData, generatedScript, scriptSources, factCheckReport, assets]);

  // Check for recoverable project on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const saved = await idbGet('autosave-project');
      if (saved && (saved.generatedScript || saved.assets?.length > 0)) {
        setHasRecoverableProject(true);
      }
    };
    checkRecovery();
  }, []);

  const handleRestoreFromAutoSave = async () => {
    try {
      const saved = await idbGet('autosave-project');
      if (saved) {
        if (saved.formData) setFormData(saved.formData);
        if (saved.generatedScript) setGeneratedScript(saved.generatedScript);
        if (saved.scriptSources) setScriptSources(saved.scriptSources);
        if (saved.factCheckReport) setFactCheckReport(saved.factCheckReport);
        if (saved.globalSpeakerMap) setGlobalSpeakerMap(saved.globalSpeakerMap);
        if (saved.detectedSpeakers) setDetectedSpeakers(saved.detectedSpeakers);
        if (saved.assets) {
           const restoredAssets = saved.assets.map((asset: any) => {
              const newAsset = { ...asset };
              if (newAsset.blobData) {
                 newAsset.url = URL.createObjectURL(newAsset.blobData);
                 delete newAsset.blobData;
              }
              if (newAsset.audioBlobData) {
                 newAsset.audioUrl = URL.createObjectURL(newAsset.audioBlobData);
                 delete newAsset.audioBlobData;
              }
              if (newAsset.originalImageBlobData) {
                 newAsset.originalImageUrl = URL.createObjectURL(newAsset.originalImageBlobData);
                 delete newAsset.originalImageBlobData;
              }
              return newAsset;
           });
           setAssets(restoredAssets);
        }
        
        alert(`마지막 작업(${new Date(saved.timestamp).toLocaleTimeString()})을 성공적으로 복구했습니다!`);
        setHasRecoverableProject(false);
        setCurrentView('studio');
      }
    } catch (err) {
      alert("복구에 실패했습니다.");
    }
  };

  const handleClearAutoSave = async () => {
    if (window.confirm("자동 저장된 데이터를 삭제하시겠습니까?")) {
      await idbDel('autosave-project');
      setHasRecoverableProject(false);
    }
  };

  // Topic Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, checked } = e.target;
     setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSuggestTopics = async () => {
    setShowTopicModal(true);
    setTopicSuggestions([]); // Always clear old suggestions when opening new context
    
    setIsSuggesting(true);
    try {
      // Pass both theme AND selected persona mode for tailored suggestions
      const suggestions = await suggestTopics(formData.channelTheme, formData.scriptMode, usedTopics);
      setTopicSuggestions(suggestions);
    } catch (error) {
      alert("주제 제안 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setShowTopicModal(false);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleRefreshTopics = async () => {
    setIsSuggesting(true);
    setTopicSuggestions([]);
    try {
      // Pass both theme AND selected persona mode for tailored suggestions
      const suggestions = await suggestTopics(formData.channelTheme, formData.scriptMode, usedTopics);
      setTopicSuggestions(suggestions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      alert("영상 주제를 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    setGeneratedScript(null);
    setScriptSources([]);
    setFactCheckReport(null);
    setAssets([]); // Clear assets on new script generation
    setActiveTab('script'); // Reset to script view on new generation

    try {
      const { content, sources, factCheckReport: report } = await generateScript(
        formData.topic,
        formData.audience,
        formData.length,
        formData.materials,
        formData.useAiResearch,
        formData.scriptMode,
        formData.channelTheme, // Pass selected theme
        formData.isDialogue
      );
      setGeneratedScript(content);
      setScriptSources(sources);
      setFactCheckReport(report || null);
    } catch (error) {
      alert("대본 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateScriptManual = (newContent: string) => {
    setGeneratedScript(newContent);
    setAssets([]); // 대본이 수정되면 기존 에셋 구성을 초기화하여 새로 파싱하도록 유도
  };

  const handleStartManualScript = () => {
    setGeneratedScript(""); // 빈 값으로 초기화하여 편집기를 활성화
  };

  const handleExtractShorts = async () => {
      if (!generatedScript) return;
      
      setIsExtractingShorts(true);
      try {
          const shortsScript = await extractShortsFromScript(generatedScript, formData.scriptMode);
          setGeneratedScript(shortsScript);
          setAssets([]); // Reset assets as script changed
          
          // Update length to 1 minute for UI consistency
          setFormData(prev => ({ ...prev, length: 1 }));
          
          alert("롱폼 대본에서 핵심 하이라이트를 추출하여 쇼츠 대본을 생성했습니다! 이제 비디오 제작 탭에서 쇼츠용 영상을 만들어보세요.");
      } catch (error) {
          alert("쇼츠 추출 중 오류가 발생했습니다.");
      } finally {
          setIsExtractingShorts(false);
      }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            const projectFile = zip.file("project.json");
            if (!projectFile) throw new Error("No project.json inside zip");
            
            const jsonText = await projectFile.async("string");
            const json = JSON.parse(jsonText);
            
            // Restore High-level state
            if (json.formData) setFormData(json.formData);
            if (json.scriptContent) setGeneratedScript(json.scriptContent);
            if (json.scriptMode) setFormData(prev => ({ ...prev, scriptMode: json.scriptMode }));
            
            // Reattach blobs
            if (Array.isArray(json.assets)) {
                for (let asset of json.assets) {
                    if (asset.url && asset.url.startsWith('assets/')) {
                        const fileData = await zip.file(asset.url)?.async("blob");
                        if (fileData) asset.url = URL.createObjectURL(fileData);
                    }
                    if (asset.audioUrl && asset.audioUrl.startsWith('assets/')) {
                        const fileData = await zip.file(asset.audioUrl)?.async("blob");
                        if (fileData) asset.audioUrl = URL.createObjectURL(fileData);
                    }
                    if (asset.originalImageUrl && asset.originalImageUrl.startsWith('assets/')) {
                        const fileData = await zip.file(asset.originalImageUrl)?.async("blob");
                        if (fileData) asset.originalImageUrl = URL.createObjectURL(fileData);
                    }
                }
                setAssets(json.assets);
            }
            alert("프로젝트가 성공적으로 복구되었습니다!");
            setCurrentView('studio');
            setActiveTab('video');
        } catch (err) {
            console.error("ZIP Restore failed", err);
            alert("키 파일 형식이 잘못되었거나 복구에 실패했습니다.");
        }
    } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            
            // Restore High-level state
            if (json.formData) setFormData(json.formData);
            if (json.scriptContent) setGeneratedScript(json.scriptContent);
            if (json.scriptMode) setFormData(prev => ({ ...prev, scriptMode: json.scriptMode }));
            
            // Restore Assets
            if (Array.isArray(json.assets)) {
                setAssets(json.assets);
            }
            
            alert("프로젝트가 성공적으로 복구되었습니다!");
            setCurrentView('studio');
            setActiveTab('video');
          } catch (err) {
            console.error("Restore failed", err);
            alert("파일 형식이 잘못되었거나 복구에 실패했습니다.");
          }
        };
        reader.readAsText(file);
    }
    e.target.value = ''; // Reset input for repeated selections
  };

  const handleDownloadLogo = () => {
    const isPsychology = formData.channelTheme === 'psychology';
    const isEducation = formData.channelTheme === 'education';
    const logoName = isPsychology ? 'MindExodus' : (isEducation ? 'TheEquation' : 'EcoMo');
    
    let svgData = "";
    if (isPsychology) {
        svgData = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100" height="100" rx="24" fill="#7c3aed" /><path d="M35 75 V25 H65 V75" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" /><path d="M65 25 L82 18 V68 L65 75 Z" fill="white" fill-opacity="0.35" stroke="white" stroke-width="4" stroke-linejoin="round" /><path d="M40 85 L50 65" stroke="white" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6" opacity="0.5" /></svg>`;
    } else if (isEducation) {
        svgData = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100" height="100" rx="24" fill="#0f172a" /><path d="M20 25 L45 25 L50 60 L50 85 Q 35 90 20 80 Z" fill="#38bdf8" /><path d="M80 25 L55 25 L50 60 L50 85 Q 65 90 80 80 Z" fill="#0ea5e9" /><path d="M20 80 Q 35 90 50 85" stroke="white" stroke-width="2" stroke-opacity="0.2" fill="none" /><path d="M80 80 Q 65 90 50 85" stroke="white" stroke-width="2" stroke-opacity="0.2" fill="none" /><path d="M50 60 L50 85" stroke="#000" stroke-width="2" stroke-opacity="0.1" /></svg>`;
    } else {
        svgData = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100" height="100" rx="24" fill="#0284c7" /><path d="M30 65 L45 50 L55 60 L75 35" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M75 35 L75 50 M75 35 L60 35" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="30" cy="65" r="5" fill="white" /><circle cx="45" cy="50" r="5" fill="white" /><circle cx="55" cy="60" r="5" fill="white" /></svg>`;
    }

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${logoName}_Channel_Logo.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  const handleFullBackup = async () => {
    if (!generatedScript && assets.length === 0) {
      alert("백업할 데이터가 없습니다.");
      return;
    }

    try {
      const zip = new JSZip();
      const assetsFolder = zip.folder("assets");
      if (!assetsFolder) throw new Error("Failed to create assets folder in zip");

      const serializableAssets = await Promise.all(
        assets.map(async (asset) => {
          const newAsset = { ...asset };
          
          if (newAsset.url && newAsset.url.startsWith('blob:')) {
            try {
              const res = await fetch(newAsset.url);
              const blob = await res.blob();
              const ext = newAsset.assetType === 'video' ? 'mp4' : 'png';
              const filename = `${newAsset.id}_main.${ext}`;
              assetsFolder.file(filename, blob);
              newAsset.url = `assets/${filename}`;
            } catch(e) {
                console.warn("Failed to backup main asset for", newAsset.id);
            }
          }

          if (newAsset.audioUrl && newAsset.audioUrl.startsWith('blob:')) {
            try {
              const res = await fetch(newAsset.audioUrl);
              const blob = await res.blob();
              const filename = `${newAsset.id}_audio.mp3`;
              assetsFolder.file(filename, blob);
              newAsset.audioUrl = `assets/${filename}`;
            } catch(e) {
                console.warn("Failed to backup audio asset for", newAsset.id);
            }
          }

          if (newAsset.originalImageUrl && newAsset.originalImageUrl.startsWith('blob:')) {
            try {
              const res = await fetch(newAsset.originalImageUrl);
              const blob = await res.blob();
              const filename = `${newAsset.id}_original.jpg`;
              assetsFolder.file(filename, blob);
              newAsset.originalImageUrl = `assets/${filename}`;
            } catch(e) {
                console.warn("Failed to backup original image asset for", newAsset.id);
            }
          }

          return newAsset;
        })
      );

      const backupData = {
        formData,
        scriptContent: generatedScript,
        assets: serializableAssets,
        scriptMode: formData.scriptMode,
      };

      zip.file("project.json", JSON.stringify(backupData, null, 2));
      
      const content = await zip.generateAsync({ type: "blob" });
      const themeName = getThemeDisplayName().replace(/\s/g, '_');
      saveAs(content, `${themeName}_Project_Backup_${new Date().toISOString().slice(0, 10)}.zip`);
      
    } catch (error) {
      console.error("Backup failed", error);
      alert("백업 중 오류가 발생했습니다.");
    }
  };

  const getThemeColor = () => {
      if (formData.channelTheme === 'psychology') return 'text-violet-600';
      if (formData.channelTheme === 'education') return 'text-cyan-600';
      return 'text-brand-600';
  };

  const getThemeDisplayName = () => {
      if (formData.channelTheme === 'psychology') return 'Mind Exodus';
      if (formData.channelTheme === 'education') return 'The Equation';
      return 'EcoMo';
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <Key className="w-12 h-12 text-brand-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">API 키 설정 필요</h2>
          <p className="text-slate-600 mb-6">
            고품질 이미지(Gemini 3.1 Flash Image) 및 영상(Veo) 생성을 위해 유료 결제가 연결된 Google Cloud 프로젝트의 Gemini API 키가 필요합니다.
          </p>
          <Button onClick={handleSelectApiKey} className="w-full py-3 text-lg">
            API 키 선택하기
          </Button>
          <p className="text-xs text-slate-400 mt-4">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
              결제 설정 안내 문서 보기
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }

  if (currentView === 'landing') {
    return <LandingPage onEnter={() => setCurrentView('studio')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 animate-in fade-in duration-500 selection:bg-brand-100 selection:text-brand-900">
      {/* Refined Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="cursor-pointer transition-transform group-hover:scale-105" onClick={() => setCurrentView('landing')}>
              {formData.channelTheme === 'psychology' ? (
                <MindExodusLogo className="w-8 h-8 drop-shadow-sm" />
              ) : formData.channelTheme === 'education' ? (
                <EducationLogo className="w-8 h-8 drop-shadow-sm" />
              ) : (
                <EcoMoLogo className="w-8 h-8 text-brand-600 drop-shadow-sm" />
              )}
            </div>
            <div className="flex flex-col cursor-pointer" onClick={() => setCurrentView('landing')}>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none flex items-center gap-2">
                  {getThemeDisplayName()} <span className={`${getThemeColor()} font-normal`}>Studio</span>
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
                    {formData.channelTheme === 'education' ? 'Mathematical Logic Suite' : 'Intelligent Media Suite'}
                </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {hasRecoverableProject && (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRestoreFromAutoSave}
                    className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                 >
                    <History className="w-4 h-4 mr-1.5" />
                    자동 저장 복구
                 </Button>
                 <button 
                   onClick={handleClearAutoSave}
                   className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                   title="자동 저장 삭제"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             )}
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json,.zip" 
                className="hidden" />
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRestoreClick}
                className="text-xs border-slate-300 hover:bg-slate-50"
             >
                <FolderOpen className="w-4 h-4 mr-1.5" />
                프로젝트 복구
             </Button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-medium text-slate-600">
                  {lastSavedTime ? `자동 저장됨: ${new Date(lastSavedTime).toLocaleTimeString()}` : 'Gemini 3.0 Pro Active'}
                </span>
              </div>
             <button 
                onClick={handleDownloadLogo}
                className={`p-2 rounded-full transition-all ${formData.channelTheme === 'psychology' ? 'text-violet-400 hover:text-violet-600 hover:bg-violet-50' : (formData.channelTheme === 'education' ? 'text-cyan-400 hover:text-cyan-600 hover:bg-slate-900' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50')}`}
                title="Download Brand Asset"
              >
                <Download className="w-4 h-4" />
              </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full gap-6 flex flex-col lg:flex-row">
        
        {/* Left Column: Input Form (Cost-Efficient) */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <Settings2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-800">Production Control</h2>
            </div>

            <form onSubmit={handleGenerateScript} className="space-y-6">
              
              {/* NEW: Channel Theme Selector */}
              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Channel Theme <span className="text-red-500">*</span>
                 </label>
                 <div className="grid grid-cols-3 gap-2">
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, channelTheme: 'economy', audience: DEFAULT_AUDIENCE_ECONOMY }))}
                       className={`py-3 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.channelTheme === 'economy' 
                           ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                    >
                       <TrendingUp className="w-4 h-4" />
                       경제/시사
                    </button>
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, channelTheme: 'education', audience: DEFAULT_AUDIENCE_EDUCATION }))}
                       className={`py-3 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.channelTheme === 'education' 
                           ? 'bg-slate-900 border-slate-900 text-cyan-400 shadow-md' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                    >
                       <GraduationCap className="w-4 h-4" />
                       수학/입시
                    </button>
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, channelTheme: 'psychology', audience: DEFAULT_AUDIENCE_PSYCHOLOGY }))}
                       className={`py-3 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.channelTheme === 'psychology' 
                           ? 'bg-violet-600 border-violet-600 text-white shadow-md' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                    >
                       <Brain className="w-4 h-4" />
                       심리/멘탈
                    </button>
                 </div>
              </div>

              {/* Script Tone Selector */}
              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tone & Persona <span className="text-red-500">*</span>
                 </label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, scriptMode: "writers-room" }))}
                       className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.scriptMode === "writers-room"
                           ? "bg-purple-50 border-purple-500 text-purple-600 shadow-sm"
                           : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                       }`}
                       title="다중 페르소나 작가실 (팩트체크 및 퀄리티 극대화)"
                    >
                       <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                       👥 작가실(AI)
                    </button>

                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, scriptMode: 'critic' }))}
                       className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.scriptMode === 'critic' 
                           ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                       title="부정적 이슈, 정책 비판, 사회 문제"
                    >
                       <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                       🔥 비판/폭로
                    </button>
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, scriptMode: 'success' }))}
                       className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.scriptMode === 'success' 
                           ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                       title="성공 신화, 합격 수기, 국위 선양"
                    >
                       <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                       🇰🇷 성공/희망
                    </button>
                    <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, scriptMode: 'insight' }))}
                       className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center gap-1.5 border-2 ${
                           formData.scriptMode === 'insight' 
                           ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-sm' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                       title="숨겨진 비밀, 입시 전략, 구조적 원인 분석"
                    >
                       <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                       💡 통찰/전략
                    </button>
                 </div>
              </div>

              {/* Topic Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Video Topic <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <textarea
                    name="topic"
                    rows={4}
                    value={formData.topic}
                    onChange={handleInputChange}
                    placeholder={
                        formData.channelTheme === 'education'
                            ? "예: 미적분의 논리가 의대 합격률을 결정하는 이유"
                            : (formData.channelTheme === 'psychology' 
                                ? "예: '마인드 엑소더스' 나를 가두는 불안의 감옥에서 탈출하는 법" 
                                : "예: 삼성전자 반도체 위기, 금리 인하 수혜주, 자영업 폐업")
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400 resize-none text-sm leading-relaxed outline-none shadow-sm group-hover:border-slate-300"/>
                   <button
                    type="button"
                    onClick={handleSuggestTopics}
                    className="absolute bottom-3 right-3 text-xs bg-white text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 border border-slate-200 hover:border-brand-200 transition-all flex items-center gap-1 font-semibold shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    Ideas
                  </button>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Audience
                </label>
                <input
                  type="text"
                  name="audience"
                  value={formData.audience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-900 text-sm outline-none transition-all"
                  placeholder={
                      formData.channelTheme === 'education' 
                      ? "예: 상위권 도약을 꿈꾸는 학생과 학부모" 
                      : (formData.channelTheme === 'psychology' 
                          ? "예: 인생의 정체기에서 탈출하고 싶은 분들"
                          : "예: 3040 직장인 투자자, 은퇴 준비자")
                  }
                />
              </div>

              {/* Video Length (Elastic) */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-end">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Duration</label>
                   <span className={`text-xs font-mono font-medium ${formData.channelTheme === 'education' ? 'text-cyan-400 bg-slate-900' : 'text-brand-600 bg-brand-50'} px-2 py-1 rounded`}>
                      {formData.length} min
                   </span>
                </div>
                <input
                  type="range"
                  name="length"
                  min="1" 
                  max="20"
                  step="1"
                  value={formData.length}
                  onChange={handleInputChange}
                  className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${formData.channelTheme === 'education' ? 'accent-cyan-400' : 'accent-brand-600'} hover:opacity-80 transition-all`} />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                   <span className="flex items-center gap-1 text-red-500 font-bold"><Youtube size={10} /> Shorts (1m)</span>
                   <span>Long Form (20m)</span>
                </div>
              </div>

              {/* Research & Dialogue Toggles */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:border-brand-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        name="useAiResearch"
                        checked={formData.useAiResearch}
                        onChange={handleCheckboxChange}
                        className={`w-4 h-4 rounded border-slate-300 ${formData.channelTheme === 'education' ? 'text-cyan-600 focus:ring-cyan-500' : 'text-brand-600 focus:ring-brand-500'}`} />
     
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Search className={`w-3.5 h-3.5 ${formData.channelTheme === 'education' ? 'text-cyan-600' : 'text-brand-600'}`} />
                        <span className="font-bold text-slate-800 text-sm">Real-time Data</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                         Google 검색을 통해 {
                             formData.channelTheme === 'education' ? '최신 교육 정책 및 입시 통계' 
                             : (formData.channelTheme === 'psychology' ? '최신 심리학 연구 및 트렌드' : '최신 주가 및 경제 지표')
                         }를 반영합니다.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:border-brand-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        name="isDialogue"
                        checked={formData.isDialogue}
                        onChange={handleCheckboxChange}
                        className={`w-4 h-4 rounded border-slate-300 ${formData.channelTheme === 'education' ? 'text-cyan-600 focus:ring-cyan-500' : 'text-brand-600 focus:ring-brand-500'}`} />
     
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-3.5 h-3.5 ${formData.channelTheme === 'education' ? 'text-cyan-600' : 'text-brand-600'}`} />
                        <span className="font-bold text-slate-800 text-sm">Multi-Speaker Dialogue</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                         두 명 이상의 화자가 대화하는 형식으로 대본을 생성합니다. (전문가 vs 초보자 등)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className={`w-full py-4 text-base font-bold shadow-lg transition-all transform active:scale-[0.98] ${
                      formData.scriptMode === 'critic' 
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' 
                      : (formData.scriptMode === 'insight' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' : formData.scriptMode === 'writers-room' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20')
                  }`} 
                  isLoading={isGenerating}
                >
                  {isGenerating ? (formData.useAiResearch ? "Deep Research 조사 중... (수 분 소요)" : "생성 중...") : (
                      formData.scriptMode === 'critic' ? "🔥 독설/비판 대본 생성" : 
                      (formData.scriptMode === 'insight' ? "💡 통찰/전략 대본 생성" : formData.scriptMode === 'writers-room' ? "👥 다중 페르소나 작가실 대본 생성" : "🇰🇷 성공/희망 대본 생성")
                  )}
                  {!isGenerating && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="flex-1 min-w-0 min-h-[600px] flex flex-col">
           {/* Tab Navigation */}
           <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 w-fit mx-auto sm:mx-0">
             <button
               onClick={() => setActiveTab('script')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'script' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <FileText className="w-4 h-4" /> 대본 확인
             </button>
             <button
               onClick={() => setActiveTab('video')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'video' ? (formData.channelTheme === 'psychology' ? 'bg-violet-600' : (formData.channelTheme === 'education' ? 'bg-slate-900 border-2 border-cyan-400' : 'bg-brand-600')) + ' text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <Video className="w-4 h-4" /> 비디오 제작
             </button>
             <button
               onClick={() => setActiveTab('marketing')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'marketing' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <Megaphone className="w-4 h-4" /> 마케팅/SEO
             </button>
           </div>

           <div className="flex-1 min-h-0 flex flex-col">
              {activeTab === 'script' ? (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                   {generatedScript === null ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-slate-200" />
                         </div>
                         <h3 className="text-xl font-bold text-slate-700 mb-2">대본 준비 완료</h3>
                         <p className="max-w-xs text-sm mb-6">왼쪽 패널에서 주제를 설정하고 생성 버튼을 누르면 AI가 전문적인 유튜브 대본을 작성합니다. 또는 직접 대본을 작성하려면 아래 버튼을 누르세요.</p>
                         <Button variant="outline" onClick={handleStartManualScript} className="flex items-center gap-2">
                             <Edit3 className="w-4 h-4" /> 직접 대본 작성 시작
                         </Button>
                      </div>
                   ) : (
                      <ScriptViewer 
                        content={generatedScript} 
                        sources={scriptSources} 
                        factCheckReport={factCheckReport}
                        onExtractShorts={handleExtractShorts}
                        isExtractingShorts={isExtractingShorts}
                        onUpdateScript={handleUpdateScriptManual}
                        channelTheme={formData.channelTheme}
                        scriptMode={formData.scriptMode}
                      />
                   )}
                </div>
              ) : activeTab === 'video' ? (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                  <VideoProductionPanel 
                    scriptContent={generatedScript || ""}
                    apiKey={process.env.API_KEY || ""}
                    scriptMode={formData.scriptMode}
                    channelTheme={formData.channelTheme}
                    assets={assets}
                    setAssets={setAssets}
                    formData={formData}
                    onFullBackup={handleFullBackup}
                    globalSpeakerMap={globalSpeakerMap}
                    setGlobalSpeakerMap={setGlobalSpeakerMap}
                    detectedSpeakers={detectedSpeakers}
                    setDetectedSpeakers={setDetectedSpeakers}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                  <MarketingPanel 
                    scriptContent={generatedScript || ""}
                    marketingKit={marketingKit}
                    setMarketingKit={setMarketingKit}
                  />
                </div>
              )}
           </div>
        </div>
      </main>

      <TopicModal 
        isOpen={showTopicModal} 
        onClose={() => setShowTopicModal(false)}
        suggestions={topicSuggestions}
        onSelect={(topic, category, duration, suggestedMode) => {
            // Auto-switch Script Mode based on AI suggestion or Topic Category
            let newMode: 'critic' | 'success' | 'insight' = 'critic';

            // 1. Check AI suggested mode (and normalize to lowercase just in case)
            if (suggestedMode) {
                const normalized = suggestedMode.toLowerCase() as any;
                if (['critic', 'success', 'insight'].includes(normalized)) {
                    newMode = normalized;
                }
            } 
            
            // 2. Fallback to keyword matching if AI didn't provide a valid mode
            if (!suggestedMode || !['critic', 'success', 'insight'].includes(suggestedMode.toLowerCase())) {
                if (category.includes('성공') || category.includes('Success')) newMode = 'success';
                else if (category.includes('통찰') || category.includes('Insight')) newMode = 'insight';
                else if (category.includes('비판') || category.includes('Critic')) newMode = 'critic';
                
                // New Psychology / Education logic
                else if (category.includes('대처') || category.includes('Solution')) newMode = 'success'; // Empowerment/Winning
                else if (category.includes('테스트') || category.includes('Test')) newMode = 'insight'; // Self-knowledge
                else if (category.includes('분석') || category.includes('Analysis') || category.includes('Case Study')) newMode = 'critic'; // Analysis of problems
                else if (category.includes('공부법') || category.includes('Strategy')) newMode = 'insight'; // Strategy
                else if (category.includes('동기부여') || category.includes('Mindset')) newMode = 'success'; // Motivation
            }

            setFormData(prev => {
                let newAudience = prev.audience;
                
                // Adjust audience dynamically based on the category so that it fits the topic's intent, especially for math/education
                if (prev.channelTheme === 'education') {
                    if (category.includes('역사') || category.includes('History') || category.includes('실생활') || category.includes('Real Life')) {
                        newAudience = "수학적 교양과 지적 유희를 즐기는 일반 대중 및 호기심 많은 성인";
                    } else if (category.includes('통찰') || category.includes('Insight')) {
                        newAudience = "수학의 본질적 사고방식을 깨우치고 싶은 학생 및 지식인";
                    } else if (category.includes('입시') || category.includes('Strategy')) {
                        newAudience = "상위권 대학 진학을 목표로 하는 학생 및 열정적인 학부모";
                    }
                }

                return {
                    ...prev, 
                    topic, 
                    audience: newAudience,
                    length: duration || prev.length, 
                    scriptMode: newMode
                };
            });

            // Add to used topics to avoid duplicates in future suggestions
            if (!usedTopics.includes(topic)) {
              setUsedTopics(prev => [topic, ...prev].slice(0, 50)); // Keep last 50
            }
        }}
        isLoading={isSuggesting}
        onRefresh={handleRefreshTopics}
        usedTopics={usedTopics}
        onClearUsedTopics={() => setUsedTopics([])}
      />
    </div>
  );
};

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
