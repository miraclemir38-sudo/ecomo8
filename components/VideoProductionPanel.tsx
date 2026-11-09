
import React, { useState, useEffect, useRef } from 'react';
import { Video, Play, Loader2, AlertCircle, Film, RefreshCw, Download, Image as ImageIcon, Zap, Mic, Music, MonitorPlay, Wand2, HelpCircle, RotateCcw, Volume2, X, CheckCircle2, Type, Sparkles, Undo2, VolumeX, Link as LinkIcon, Settings, Upload, Youtube, Eye, Palette, AlertTriangle, Hourglass, Filter, Hammer, Volume1, Move, Star, FileUp, Pause, Captions, MessageSquare, Smartphone, RectangleHorizontal, Save, User, FileAudio, Square, ImagePlus, AlignLeft, AlignRight , Trash2, Gauge } from 'lucide-react';
import { Button } from './Button';
import { VideoAsset, YouTubeMetadata, ImageStyle, CameraMotion, AudioTone, AspectRatio, ChannelTheme, SubtitleStyle, GenerationMode, VideoResolution, ViewFilter, ScriptFormData, AvatarPosition } from '../types';
import { generateVeoVideo, generateImage, generateSpeech, generateOverlayTitle, recommendBGM, generateYouTubeMetadata, analyzeMotionNecessity, generateThumbnail } from '../services/geminiService';
import { PromptGuideModal } from './PromptGuideModal';
import { YouTubeUploadModal } from './YouTubeUploadModal';
import { ThumbnailModal } from './ThumbnailModal';

// --- Utility Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_BGM = {
  calm: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  corporate: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  tense: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
};

const createSilentAudioUrl = (durationSeconds: number, sampleRate: number = 24000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataLength = durationSeconds * sampleRate * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF'); 
  view.setUint32(4, 36 + dataLength, true); 
  writeString(view, 8, 'WAVE'); 
  writeString(view, 12, 'fmt '); 
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data'); 
  view.setUint32(40, dataLength, true); 
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const removeWhiteBackground = (img: HTMLImageElement): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const { data, width, height } = imgData;
    
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    const visited = new Uint8Array(width * height);
    const stack: number[] = [];
    
    const isBackground = (idx: number) => {
        const r = data[idx * 4];
        const g = data[idx * 4 + 1];
        const b = data[idx * 4 + 2];
        const y = Math.floor(idx / width);
        const dist = Math.sqrt(Math.pow(bgR - r, 2) + Math.pow(bgG - g, 2) + Math.pow(bgB - b, 2));
        const heightProgress = y / height;
        const threshold = 15 + (Math.pow(heightProgress, 2) * 90); 
        return dist < threshold;
    };

    for(let x = 0; x < width; x += 10) {
        const p = x;
        if (isBackground(p)) { stack.push(p); visited[p] = 1; }
    }
    
    const corners = [0, width - 1, (height - 1) * width, (height - 1) * width + width - 1];
    corners.forEach(p => {
        if (p >= 0 && p < width * height && isBackground(p) && visited[p] === 0) {
            stack.push(p);
            visited[p] = 1;
        }
    });

    while (stack.length > 0) {
        const pixelIndex = stack.pop()!;
        const dataIndex = pixelIndex * 4;
        data[dataIndex + 3] = 0;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const neighbors = [{ nIdx: pixelIndex + 1, valid: x < width - 1 }, { nIdx: pixelIndex - 1, valid: x > 0 }, { nIdx: pixelIndex + width, valid: y < height - 1 }, { nIdx: pixelIndex - width, valid: y > 0 }];
        for (const { nIdx, valid } of neighbors) {
            if (valid && visited[nIdx] === 0) {
                if (isBackground(nIdx)) {
                    visited[nIdx] = 1;
                    stack.push(nIdx);
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
};

// Tightened scene padding for faster cuts (1.5s -> 0.2s)
const SCENE_PADDING_MS = 200;

const VOICE_OPTIONS = [
  { name: 'Puck', description: '유쾌한 입담꾼 (기본 추천)' },
  { name: 'Kore', description: '친절한 멘토 (차분함)' },
  { name: 'Zephyr', description: '속사포 분석가 (빠름)' },
  { name: 'Fenrir', description: '열혈 투자자 (파워풀)' },
  { name: 'Charon', description: '무게 잡는 형님 (중저음)' },
];

const TONE_OPTIONS: { value: AudioTone; label: string }[] = [
    { value: 'neutral', label: '😐 기본 (Neutral)' },
    { value: 'excited', label: '🤩 흥분/열정 (Excited)' },
    { value: 'serious', label: '🤔 진지/엄근진 (Serious)' },
    { value: 'concerned', label: '😟 우려/걱정 (Concerned)' },
    { value: 'calm', label: '😌 차분/설명 (Calm)' },
    { value: 'dramatic', label: '🎭 드라마틱 (Dramatic)' },
];

const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  // --- Do NOT Touch ---
  { value: 'math-blackboard', label: '📐 수학 칠판 (Math Blackboard)' },
  
  // --- New Trendy Styles (2026/2027) ---
  { value: 'hyper-realism-3d', label: '✨ 하이퍼 리얼리즘 3D (Trendy 3D)' },
  { value: 'modern-abstract-gradient', label: '🌈 모던 추상 그라데이션 (Apple Style)' },
  { value: 'minimal-glassmorphism', label: '🧊 미니멀 글래스모피즘 (UI/UX Look)' },
  { value: 'y2k-retro-pop', label: '💿 Y2K 레트로 팝 (Kitsch & Hip)' },
  { value: 'dark-academia', label: '📚 다크 아카데미아 (Dark Academia)' },
  { value: 'lofi-anime', label: '🎧 로파이 감성 애니 (Lo-Fi Anime)' },
  { value: 'surreal-collage', label: '📰 초현실 힙스터 콜라주 (Surreal Collage)' },
  
  // --- Essentials ---
  { value: 'cinematic-realism', label: '🎬 시네마틱 실사 (Cinematic Realism)' },
  { value: 'flat-vector', label: '🔷 모던 플랫 벡터 (Corporate)' },
];

const MOTION_OPTIONS: { value: CameraMotion; label: string }[] = [
    { value: 'auto', label: '자동 (Auto Loop)' },
    { value: 'zoom-in', label: '줌 인 (집중)' },
    { value: 'zoom-out', label: '줌 아웃 (배경)' },
    { value: 'pan-left', label: '팬 좌측 (흐름)' },
    { value: 'pan-right', label: '팬 우측 (흐름)' },
    { value: 'static', label: '고정 (차트/텍스트)' },
];

const SUBTITLE_STYLES: Record<SubtitleStyle, {
  label: string;
  font: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor?: string;
  bgPadding?: number;
  shadow: boolean;
  yOffset: number;
  isLetterbox?: boolean;
}> = {
  // Updated standard style: 72px font, 12px stroke
  standard: { label: '기본 (Standard)', font: '"GmarketSansBold", sans-serif', fontSize: 72, color: 'white', strokeColor: 'black', strokeWidth: 12, shadow: true, yOffset: 10 },
  highlight: { label: '강조 (Highlight)', font: '"GmarketSansBold", sans-serif', fontSize: 72, color: '#facc15', strokeColor: 'black', strokeWidth: 8, bgColor: 'rgba(0,0,0,0.7)', bgPadding: 10, shadow: false, yOffset: 12 },
  cinematic: { label: '영화 (Cinematic)', font: '"Merriweather", serif', fontSize: 55, color: '#f1f5f9', strokeColor: 'transparent', strokeWidth: 0, shadow: true, yOffset: 15, isLetterbox: true },
  clean: { label: '깔끔 (Clean)', font: '"GmarketSansMedium", sans-serif', fontSize: 60, color: '#1e293b', strokeColor: 'white', strokeWidth: 6, bgColor: 'rgba(255,255,255,0.9)', bgPadding: 15, shadow: false, yOffset: 10 },
  handwritten: { label: '손글씨 (Handwritten)', font: '"Jua", sans-serif', fontSize: 80, color: 'white', strokeColor: 'black', strokeWidth: 7, shadow: true, yOffset: 10 }
};

const getDefaultVoiceForMode = (mode: 'critic' | 'success' | 'insight' | 'writers-room') => {
    switch (mode) {
        case 'critic': return 'Fenrir';
        case 'success': return 'Puck';
        case 'insight': return 'Charon';
        case 'writers-room': return 'Charon';
        default: return 'Puck';
    }
};

const getDefaultToneForMode = (mode: 'critic' | 'success' | 'insight' | 'writers-room'): AudioTone => {
    switch (mode) {
        case 'critic': return 'serious';
        case 'success': return 'excited';
        case 'insight': return 'neutral';
        case 'writers-room': return 'serious';
        default: return 'neutral';
    }
};

interface VideoProductionPanelProps {
  scriptContent: string;
  apiKey?: string;
  scriptMode: 'critic' | 'success' | 'insight' | 'writers-room';
  channelTheme: ChannelTheme;
  assets: VideoAsset[];
  setAssets: React.Dispatch<React.SetStateAction<VideoAsset[]>>;
  formData: ScriptFormData;
  onFullBackup?: () => void;
  globalSpeakerMap: Record<string, string>;
  setGlobalSpeakerMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  detectedSpeakers: string[];
  setDetectedSpeakers: React.Dispatch<React.SetStateAction<string[]>>;
}

export const VideoProductionPanel: React.FC<VideoProductionPanelProps> = ({ 
  scriptContent, 
  apiKey, 
  scriptMode, 
  channelTheme, 
  assets, 
  setAssets, 
  formData, 
  onFullBackup,
  globalSpeakerMap,
  setGlobalSpeakerMap,
  detectedSpeakers,
  setDetectedSpeakers
}) => {
  const [mode, setMode] = useState<GenerationMode>('image');
  // Default to math blackboard if education theme
  const [globalStyle, setGlobalStyle] = useState<ImageStyle>(channelTheme === 'education' ? 'math-blackboard' : 'stick-figure'); 
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [renderSpeed, setRenderSpeed] = useState<number>(1.0);
  const [isRendering, setIsRendering] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generatingTextFor, setGeneratingTextFor] = useState<string | null>(null);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [renderType, setRenderType] = useState<'full' | 'single'>('full');
  const [renderProgress, setRenderProgress] = useState(0); 
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>('standard');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState("");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [isAnalyzingMotion, setIsAnalyzingMotion] = useState(false);
  const [selectedBgmId, setSelectedBgmId] = useState<string>('none'); 
  const [bgmVolume, setBgmVolume] = useState<number>(0.15); 
  const [isPlayingBgmPreview, setIsPlayingBgmPreview] = useState(false);
  const [isRecommendingBgm, setIsRecommendingBgm] = useState(false);
  const [bgmSources, setBgmSources] = useState({
      calm: DEFAULT_BGM.calm,
      corporate: DEFAULT_BGM.corporate,
      tense: DEFAULT_BGM.tense,
      custom: '' 
  });
  const [bgmFileNames, setBgmFileNames] = useState({
      calm: '기본값 (Default)',
      corporate: '기본값 (Default)',
      tense: '기본값 (Default)'
  });
  const [showBgmConfig, setShowBgmConfig] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [ytMetadata, setYtMetadata] = useState<YouTubeMetadata | null>(null);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isGeneratingAllTitles, setIsGeneratingAllTitles] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>(aspectRatio === '9:16' ? 'left' : 'right');  const [logoPosition, setLogoPosition] = useState<'left' | 'right' | 'none'>('right');
  const [styleReferenceUrl, setStyleReferenceUrl] = useState<string | null>(null);
  
  // Audio Recording States
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const errorCount = assets.filter(a => a.status === 'error' || a.audioStatus === 'error').length;
  const missingOverlayCount = assets.filter(a => !a.overlayText || a.overlayText.trim() === "").length;
  const missingNarrationCount = assets.filter(a => !a.narration || a.narration.trim() === "").length;
  const displayedAssets = viewFilter === 'error' 
      ? assets.filter(a => a.status === 'error' || a.audioStatus === 'error') 
      : assets;

  const bgmPreviewRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aspectRatio === '9:16') {
      setAvatarPosition('left');
    }
  }, [aspectRatio]);

  useEffect(() => {
    if (channelTheme === 'education') {
        setGlobalStyle('math-blackboard');
    } else if (channelTheme === 'psychology') {
        setGlobalStyle('mind-exodus');
    } else {
        setGlobalStyle('stick-figure');
    }
  }, [channelTheme]);

  useEffect(() => {
    if (!scriptContent) return;
    const speakerRegex = /\[(?:나레이션|Narration)?\s*:?\s*\[?(?!(?:비주얼|Visual|이미지|Image|비디오|Video|텍스트|Text|Scene|나레이션|Narration|효과음|BGM|음악|자막))([^\]]+?)\]?\]\s*:/gi;
    const speakerMatches = Array.from(scriptContent.matchAll(speakerRegex));
    if (speakerMatches.length > 0) {
        const knownTags = ['비주얼', 'Visual', '이미지', 'Image', '비디오', 'Video', '텍스트', 'Text', 'Scene', '나레이션', 'Narration', '효과음', 'BGM', '음악', '자막'];
        const uniqueSpeakers = Array.from(new Set(speakerMatches.map(m => m[1].trim())))
            .filter(tag => !knownTags.includes(tag) && !tag.toLowerCase().includes('scene'));
            
        setDetectedSpeakers(uniqueSpeakers);
        
        setGlobalSpeakerMap(prevMap => {
            const newMap = { ...prevMap };
            uniqueSpeakers.forEach((speaker, index) => {
                if (!newMap[speaker]) {
                    newMap[speaker] = VOICE_OPTIONS[index % VOICE_OPTIONS.length].name;
                }
            });
            return newMap;
        });
    } else {
        setDetectedSpeakers([]);
    }
  }, [scriptContent, setDetectedSpeakers, setGlobalSpeakerMap]);

  useEffect(() => {
    if (!scriptContent) return;
    // Skip if assets are already loaded (e.g. from restore)
    if (assets.length > 0) return;

    if (scriptContent.includes("Shorts") && scriptContent.includes("15초 안에 승부")) {
        setAspectRatio('9:16');
    }
    const defaultVoice = getDefaultVoiceForMode(scriptMode);
    const defaultTone = getDefaultToneForMode(scriptMode);
    
    const newAssets: VideoAsset[] = [];
    const seenSignatures = new Set<string>();
    const cleanScript = scriptContent.replace(/\*\*/g, '');
    const hasStrictScenes = cleanScript.includes('[[Scene') || cleanScript.includes('[[ Scene');
    let sceneChunks: string[] = [];
    
    // [비주얼:], [이미지:] 또는 [비디오:]로 씬을 나눕니다.
    if (hasStrictScenes) { 
        sceneChunks = cleanScript.split(/\[\[\s*Scene.*?\]\]/i); 
    } else { 
        sceneChunks = cleanScript.split(/\[(?:비주얼|Visual|이미지|Image|비디오|Video):/i); 
    }
    
    for (let i = 1; i < sceneChunks.length; i++) {
        const chunk = sceneChunks[i]; if (!chunk.trim()) continue;
        let visualPrompt = ""; let finalNarration = ""; let finalText = "";
        
        // 비주얼 프롬프트 추출 (통합 필드 우선)
        const viMatch = chunk.match(/\[(?:비주얼|Visual)(?:\s*:\s*|\]\s*)([\s\S]*?)(?:\](?=\n)|(?=\n\s*\[)|$)/i);
        if (viMatch) {
            visualPrompt = viMatch[1].trim();
            if (visualPrompt.endsWith(']')) {
                const openBrackets = (visualPrompt.match(/\[/g) || []).length;
                const closeBrackets = (visualPrompt.match(/\]/g) || []).length;
                if (closeBrackets > openBrackets) {
                    visualPrompt = visualPrompt.slice(0, -1).trim();
                }
            }
        } else {
            // 레거시 이미지/비디오 프롬프트 호환성 유지
            const iMatch = chunk.match(/\[(?:이미지|Image)(?:\s*:\s*|\]\s*)([\s\S]*?)(?:\]|(?=\[)|$)/i);
            const vMatch = chunk.match(/\[(?:비디오|Video)(?:\s*:\s*|\]\s*)([\s\S]*?)(?:\]|(?=\[)|$)/i);
            visualPrompt = (iMatch ? iMatch[1].trim() : "") || (vMatch ? vMatch[1].trim() : "");
            
            if (!visualPrompt && !hasStrictScenes) {
                const firstLine = chunk.split('\n')[0];
                if (firstLine && !firstLine.includes('[')) visualPrompt = firstLine.trim();
            }
        }
        
        // 나레이션 추출 (멀티라인 및 [나레이션: 내용] 형식 지원 강화)
        const nMatch = chunk.match(/\[(?:나레이션|Narration)(?:\s*:\s*|\]\s*)([\s\S]*?)(?:\](?=\n)|(?=\n\s*\[)|$)/i);
        if (nMatch) { 
            finalNarration = nMatch[1].trim(); 
            // [나레이션: 내용] 형식에서 마지막 닫는 대괄호가 포함된 경우 제거
            if (finalNarration.endsWith(']')) {
                const openBrackets = (finalNarration.match(/\[/g) || []).length;
                const closeBrackets = (finalNarration.match(/\]/g) || []).length;
                if (closeBrackets > openBrackets) {
                    finalNarration = finalNarration.slice(0, -1).trim();
                }
            }
        } else { 
            // 대괄호가 없는 경우: "나레이션: ..." 부터 다음 대괄호나 씬 구분 전까지
            const nNoBracket = chunk.match(/(?:^|\n)(?:나레이션|Narration):\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (nNoBracket) finalNarration = nNoBracket[1].trim(); 
        }
        
        // 멀티 스피커 다이얼로그 추출 (알려진 태그 제외)
        if (!finalNarration) {
            const speakerRegex = /\[(?:나레이션|Narration)?\s*:?\s*\[?(?!(?:비주얼|Visual|이미지|Image|비디오|Video|텍스트|Text|Scene|나레이션|Narration|효과음|BGM|음악|자막))([^\]]+?)\]?\]\s*:\s*([\s\S]*?)(?=\n\[|$)/gi;
            let match;
            const dialogues = [];
            while ((match = speakerRegex.exec(chunk)) !== null) {
                dialogues.push(`[${match[1].trim()}]: ${match[2].trim()}`);
            }
            if (dialogues.length > 0) {
                finalNarration = dialogues.join('\n');
            }
        }
        
        finalNarration = finalNarration.replace(/^["']|["']$/g, '').replace(/[*_]/g, '');
        if (finalNarration.toLowerCase().includes("silence") || finalNarration.toLowerCase().includes("no narration")) { finalNarration = ""; }
        
        // 텍스트 추출
        const tMatch = chunk.match(/\[(?:텍스트|Text)(?:\s*:\s*|\]\s*)([\s\S]*?)(?:\](?=\n)|(?=\n\s*\[)|$)/i);
        if (tMatch) { 
            finalText = tMatch[1].trim(); 
            if (finalText.endsWith(']')) {
                const openBrackets = (finalText.match(/\[/g) || []).length;
                const closeBrackets = (finalText.match(/\]/g) || []).length;
                if (closeBrackets > openBrackets) {
                    finalText = finalText.slice(0, -1).trim();
                }
            }
        } else { 
            const tNoBracket = chunk.match(/(?:^|\n)(?:텍스트|Text):\s*([\s\S]*?)(?=\n\[|$)/i);
            if (tNoBracket) finalText = tNoBracket[1].trim(); 
        }
        finalText = finalText.replace(/^["']|["']$/g, '');
        
        if (visualPrompt || finalNarration) {
            const signature = `${visualPrompt.replace(/\s+/g, ' ').trim()}|${finalNarration.replace(/\s+/g, ' ').trim()}`;
            if (seenSignatures.has(signature)) continue; seenSignatures.add(signature);
            const assetId = `scene-${newAssets.length}`;
            newAssets.push({
                id: assetId,
                visualPrompt: visualPrompt || "Scene visualization",
                prompt: visualPrompt || "Scene visualization",
                narration: finalNarration,
                overlayText: finalText,
                status: 'idle',
                assetType: 'image',
                imageStyle: channelTheme === 'education' ? 'math-blackboard' : 'stick-figure', 
                cameraMotion: 'auto',
                audioStatus: 'idle',
                voiceName: defaultVoice,
                audioTone: defaultTone
            });
        }
    }
    setAssets(newAssets);
  }, [scriptContent, scriptMode, assets.length]);

  useEffect(() => { if (!scriptContent) setAssets([]); setFinalVideoUrl(null); setShowPreviewModal(false); setThumbnailUrl(null); }, [scriptContent]);
  useEffect(() => { if (bgmPreviewRef.current) { bgmPreviewRef.current.pause(); bgmPreviewRef.current.currentTime = 0; setIsPlayingBgmPreview(false); } }, [selectedBgmId, bgmSources]);
  useEffect(() => { if (bgmPreviewRef.current) { bgmPreviewRef.current.volume = bgmVolume; } }, [bgmVolume]);

  const handleVisualPromptChange = (assetId: string, newPrompt: string) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, visualPrompt: newPrompt, prompt: newPrompt } : a)); };
  const handleNarrationChange = (assetId: string, newText: string) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, narration: newText } : a)); };
  const handleOverlayTextChange = (assetId: string, newText: string) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, overlayText: newText } : a)); };
  const handleCameraMotionChange = (assetId: string, motion: CameraMotion) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, cameraMotion: motion } : a)); };
  const handleVoiceChange = (assetId: string, voiceName: string) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, voiceName } : a)); };
  const handleToneChange = (assetId: string, tone: AudioTone) => { setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioTone: tone } : a)); };
  const handleAssetUpload = (assetId: string, file: File) => { if (!file) return; const objectUrl = URL.createObjectURL(file); const isVideo = file.type.startsWith('video'); setAssets(prev => prev.map(a => { if (a.id === assetId) { if (a.url && a.url.startsWith('blob:')) URL.revokeObjectURL(a.url); return { ...a, url: objectUrl, assetType: isVideo ? 'video' : 'image', status: 'completed', error: undefined }; } return a; })); };
  const handleAudioUpload = (assetId: string, file: File) => { if (!file) return; const objectUrl = URL.createObjectURL(file); setAssets(prev => prev.map(a => { if (a.id === assetId) { if (a.audioUrl && a.audioUrl.startsWith('blob:')) URL.revokeObjectURL(a.audioUrl); return { ...a, audioUrl: objectUrl, audioStatus: 'completed', error: undefined }; } return a; })); };
  const handleAvatarUpload = (file: File) => { if (!file) return; const objectUrl = URL.createObjectURL(file); if (avatarUrl && avatarUrl.startsWith('blob:')) URL.revokeObjectURL(avatarUrl); setAvatarUrl(objectUrl); };
  
  const handleStyleReferenceUpload = (file: File) => { 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onloadend = () => {
        const base64 = reader.result as string;
        setStyleReferenceUrl(base64); 
    }; 
    reader.readAsDataURL(file); 
  };

  // --- RECORDING LOGIC ---
  const startRecording = async (assetId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioUrl, audioStatus: 'completed', error: undefined } : a));
        setRecordingId(null);
        setRecordingTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingId(assetId);
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording failed", err);
      alert("마이크 접근 권한이 없거나 오류가 발생했습니다.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  // -------------------------


  const handleToggleMuteVideo = (id: string) => {
    setAssets(prev => prev.map(a => 
      a.id === id ? { ...a, muteVideo: a.muteVideo === undefined ? false : !a.muteVideo } : a
    ));
  };
  const handleGenerateOverlayTitle = async (assetId: string, narration: string) => { if (!narration.trim()) return; setGeneratingTextFor(assetId); try { const title = await generateOverlayTitle(narration); if (title) handleOverlayTextChange(assetId, title); } catch (error) { console.error("Failed to generate title", error); } finally { setGeneratingTextFor(null); } };
  const handleGenerateAllTitles = async () => { if (isGeneratingAllTitles) return; setIsGeneratingAllTitles(true); const emptyAssets = assets.filter(a => !a.overlayText || a.overlayText.trim() === ""); try { for (const asset of emptyAssets) { if (asset.narration) { const title = await generateOverlayTitle(asset.narration); if (title) { setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, overlayText: title } : a)); await delay(500); } } } } catch (e) { console.error("Batch title generation failed", e); } finally { setIsGeneratingAllTitles(false); } };
  const handleDownloadAsset = (url: string, filename: string) => { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  const handleGenerateThumbnail = async (text: string) => { if (!scriptContent) return; setIsGeneratingThumb(true); try { const url = await generateThumbnail(scriptContent, text); setThumbnailUrl(url); } catch (error) { console.error("Thumbnail gen failed", error); alert("썸네일 생성 실패. API 할당량이나 연결을 확인해주세요."); } finally { setIsGeneratingThumb(false); } };
  
  const handleEmergencyBackupWrapper = () => {
      if (onFullBackup) onFullBackup();
  };

  const performGeneration = async (assetId: string, targetMode: GenerationMode, targetStyle: ImageStyle) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const promptToUse = asset.visualPrompt || asset.imagePrompt || asset.prompt;
    
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'generating', assetType: targetMode, imageStyle: targetStyle, error: undefined } : a));
    const narration = asset?.narration || "";
    try {
      let url: string; if (targetMode === 'video') { url = await generateVeoVideo(promptToUse, narration, resolution, undefined, targetStyle, aspectRatio); } else { url = await generateImage(promptToUse, narration, targetStyle, aspectRatio, styleReferenceUrl || undefined, globalSpeakerMap); }
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'completed', url, assetType: targetMode } : a));
    } catch (error: any) { 
        let errorMsg = error.message || "Failed to generate";
        if (errorMsg === "QUOTA_LIMIT_ZERO" || errorMsg.includes("limit: 0")) {
            errorMsg = "Quota Limit is 0 (Billing Required)";
        } else if (errorMsg.includes("429")) {
            errorMsg = "Quota Exceeded (429)";
        } else if (errorMsg.includes("500") || errorMsg.includes("503")) {
            errorMsg = "Google AI Studio Server Error";
        }
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'error', error: errorMsg } : a)); 
        throw error; 
    }
  };

  const handleGenerateVisual = async (assetId: string, forcedMode?: GenerationMode) => { try { await performGeneration(assetId, forcedMode || mode, globalStyle); } catch(e) { } };
  const handleAnimateImage = async (assetId: string, prompt: string, imageUrl: string) => { 
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'generating', error: undefined } : a)); 
    const asset = assets.find(a => a.id === assetId); 
    const narration = asset?.narration || ""; 
    const style = asset?.imageStyle || globalStyle; 
    const visualPrompt = asset?.visualPrompt || prompt;
    try { 
      const url = await generateVeoVideo(visualPrompt, narration, resolution, imageUrl, style, aspectRatio); 
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'completed', url, assetType: 'video', originalImageUrl: imageUrl } : a)); 
    } catch (error: any) { 
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'error', error: error.message || "Animation Failed" } : a)); 
      alert(`영상 변환 실패: ${error.message}`); 
    } 
  };
  const handleRevertToImage = (assetId: string) => { setAssets(prev => prev.map(a => { if (a.id === assetId && a.originalImageUrl) { return { ...a, status: 'completed', url: a.originalImageUrl, assetType: 'image' }; } return a; })); };
  const handleGenerateAudio = async (assetId: string, text: string) => { 
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'generating' } : a)); 
    if (!text || !text.trim()) { 
        try { 
            const url = createSilentAudioUrl(4); 
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'completed', audioUrl: url } : a)); 
            return; 
        } catch (e) { 
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'error', error: "Silent audio gen failed" } : a)); 
            return; 
        } 
    } 
    const asset = assets.find(a => a.id === assetId); 
    const voice = asset?.voiceName || getDefaultVoiceForMode(scriptMode); 
    const tone = detectedSpeakers.length > 0 ? 'neutral' : (asset?.audioTone || getDefaultToneForMode(scriptMode)); 
    try { 
        const url = await generateSpeech(text, voice, tone, globalSpeakerMap); 
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'completed', audioUrl: url } : a)); 
    } catch (error: any) { 
        let errorMsg = "Audio Generation Failed"; 
        if (error.message === "QUOTA_LIMIT_ZERO" || error.message?.includes("limit: 0")) { 
            errorMsg = "TTS Quota Limit is 0 (Billing Required)"; 
        } else if (error.message?.includes("429")) { 
            errorMsg = "Quota Exceeded (429)"; 
        } 
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'error', error: errorMsg } : a)); 
        throw error; 
    } 
  };
  const handleGenerateSilentAudio = (assetId: string, duration: number = 4) => { try { const url = createSilentAudioUrl(duration); setAssets(prev => prev.map(a => a.id === assetId ? { ...a, audioStatus: 'completed', audioUrl: url } : a)); } catch (e) { console.error("Silent generation failed", e); } };
  const handlePreviewVoice = async (assetId: string, voiceName: string) => { if (previewingVoice) return; setPreviewingVoice(assetId); const tone = assets.find(a => a.id === assetId)?.audioTone || 'neutral'; try { const sampleText = "안녕하세요, EcoScript 음성 테스트입니다."; const url = await generateSpeech(sampleText, voiceName, tone); const audio = new Audio(url); await audio.play(); } catch (error) { alert("미리듣기 실패 (할당량 부족일 수 있습니다)"); } finally { setPreviewingVoice(null); } };
  const handleSmartBatchFill = async () => {
    if (isBatchProcessing || isRendering) return;
    const visualTargets = assets.filter(a => a.status === 'idle' || a.status === 'error');
    const audioTargets = assets.filter(a => a.audioStatus === 'idle' || a.audioStatus === 'error');
    const totalOps = visualTargets.length + audioTargets.length;
    
    if (totalOps === 0) {
      alert("모든 씬이 이미 완성되었습니다!");
      return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: totalOps });
    setViewFilter('all');
    let completedOps = 0;
    let failedCount = 0;

    // 1. Process Visuals
    for (let i = 0; i < visualTargets.length; i++) {
        const asset = visualTargets[i];
        const targetMode = asset.recommendedType || mode;
        try {
            setBatchStatusMessage(`[${completedOps + 1}/${totalOps}] 비주얼 생성 중: Scene ${asset.id}...`);
            await performGeneration(asset.id, targetMode, globalStyle);
            completedOps++;
            setBatchProgress(prev => ({ ...prev, current: completedOps }));
            // Small gap between different scenes to avoid hitting rate limits too fast
            await delay(1000);
        } catch (error: any) {
            console.error(`Failed to generate visual for ${asset.id}`, error);
            setBatchStatusMessage(`❌ 씬 ${asset.id} 생성 실패. 다음으로 건너뜁니다.`);
            await delay(1000);
            completedOps++;
            failedCount++;
            setBatchProgress(prev => ({ ...prev, current: completedOps }));
        }
    }

    // 2. Process Audio
    for (let i = 0; i < audioTargets.length; i++) {
        const asset = audioTargets[i];
        try {
            setBatchStatusMessage(`[${completedOps + 1}/${totalOps}] 오디오 생성 중: Scene ${asset.id}...`);
            await handleGenerateAudio(asset.id, asset.narration);
            completedOps++;
            setBatchProgress(prev => ({ ...prev, current: completedOps }));
            await delay(1000);
        } catch (error: any) {
            console.error(`Failed to generate audio for ${asset.id}`, error);
            if (error.message === "QUOTA_LIMIT_ZERO" || error.message?.includes("limit: 0")) {
                setBatchStatusMessage(`⛔ TTS 할당량 없음(0). 작업을 중단합니다.`);
                await delay(2000);
                failedCount += (audioTargets.length - i);
                setIsBatchProcessing(false);
                alert("TTS 모델 사용 권한이 없거나 할당량이 0입니다. (Billing 확인 필요)\n\n나머지 오디오는 '무음(Silent)' 모드를 사용해주세요.");
                setViewFilter('error');
                return;
            }
            setBatchStatusMessage(`❌ 오디오 ${asset.id} 생성 실패. 다음으로 건너뜁니다.`);
            await delay(1000);
            completedOps++;
            failedCount++;
            setBatchProgress(prev => ({ ...prev, current: completedOps }));
        }
    }

    setIsBatchProcessing(false);
    setBatchStatusMessage("");
    
    if (failedCount > 0) {
        alert(`일괄 작업이 완료되었으나 ${failedCount}개의 오류가 있습니다.\n\n'결함 리스트' 모드로 자동 전환됩니다.\n해당 씬들을 수정한 후 다시 시도해주세요.`);
        setViewFilter('error');
    } else {
        alert("모든 씬이 성공적으로 생성되었습니다! 최종 렌더링을 진행하세요.");
    }
  };
  const handleRecommendBgm = async () => { if (!scriptContent) return; setIsRecommendingBgm(true); try { const recommendedId = await recommendBGM(scriptContent); setSelectedBgmId(recommendedId); } catch (error) { console.error("Auto BGM recommendation failed", error); } finally { setIsRecommendingBgm(false); } };
  const handleAnalyzeMotion = async () => { if (assets.length === 0) return; setIsAnalyzingMotion(true); try { const prompts = assets.map(a => a.prompt); const recommendations = await analyzeMotionNecessity(prompts); setAssets(prev => prev.map((asset, index) => ({ ...asset, recommendedType: recommendations[index] as GenerationMode }))); } catch (error) { console.error("Analysis failed", error); alert("분석 중 오류가 발생했습니다."); } finally { setIsAnalyzingMotion(false); } };
  const handleCancelAnalysis = () => {
    // iframe 샌드박스 이슈로 confirm 생략하고 바로 취소
    setAssets(prev => prev.map(asset => ({
        ...asset,
        recommendedType: undefined
    })));
  };
  const handleBgmUpload = (category: 'calm' | 'corporate' | 'tense', file: File) => { if (!file) return; const objectUrl = URL.createObjectURL(file); setBgmSources(prev => { if (prev[category] && prev[category].startsWith('blob:')) URL.revokeObjectURL(prev[category]); return { ...prev, [category]: objectUrl }; }); setBgmFileNames(prev => ({ ...prev, [category]: file.name })); };
  const toggleBgmPreview = async () => { let url = ""; if (selectedBgmId === 'none') return; if (selectedBgmId === 'custom') { url = bgmSources.custom; } else { url = bgmSources[selectedBgmId as keyof typeof bgmSources]; } if (!url) { alert("재생할 BGM 소스가 없습니다."); return; } try { if (isPlayingBgmPreview && bgmPreviewRef.current) { bgmPreviewRef.current.pause(); setIsPlayingBgmPreview(false); } else { if (!bgmPreviewRef.current) { bgmPreviewRef.current = new Audio(url); bgmPreviewRef.current.loop = true; if (!url.startsWith('blob:')) { bgmPreviewRef.current.crossOrigin = "anonymous"; } } else if (bgmPreviewRef.current.src !== url) { bgmPreviewRef.current.src = url; } bgmPreviewRef.current.volume = bgmVolume; await bgmPreviewRef.current.play(); setIsPlayingBgmPreview(true); } } catch (e) { setIsPlayingBgmPreview(false); } };
  const handleOpenYouTubeUpload = async () => { setShowUploadModal(true); if (!ytMetadata && scriptContent) { setIsGeneratingMetadata(true); try { const meta = await generateYouTubeMetadata(scriptContent); setYtMetadata(meta); } catch (error) { console.error("Meta generation failed", error); } finally { setIsGeneratingMetadata(false); } } };
  const handleAddEmptyScene = () => {
    const newAsset: VideoAsset = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: "",
      visualPrompt: "",
      narration: "",
      status: 'idle',
      assetType: 'image',
      imageStyle: 'realistic',
      cameraMotion: 'auto',
      audioStatus: 'idle',
    };
    setAssets(prev => [...prev, newAsset]);
  };

  const handleDeleteScene = (id: string) => {
    // iframe 샌드박스에서 confirm이 차단될 수 있으므로 직접 삭제
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const drawSceneVisuals = (targetCtx: CanvasRenderingContext2D, visual: HTMLImageElement | HTMLVideoElement | null, isVideo: boolean, cameraMotion: CameraMotion, progress: number, width: number, height: number, assetIndex: number) => { targetCtx.save(); if (!visual) { const gradient = targetCtx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, '#1a1a1a'); gradient.addColorStop(1, '#0f0f0f'); targetCtx.fillStyle = gradient; targetCtx.fillRect(0, 0, width, height); targetCtx.strokeStyle = '#333'; targetCtx.lineWidth = 2; targetCtx.beginPath(); for(let x=0; x<width; x+=100) { targetCtx.moveTo(x,0); targetCtx.lineTo(x,height); } for(let y=0; y<height; y+=100) { targetCtx.moveTo(0,y); targetCtx.lineTo(width,y); } targetCtx.stroke(); targetCtx.save(); const cx = width / 2; const cy = height / 2; targetCtx.translate(cx, cy - 60); targetCtx.scale(2, 2); targetCtx.fillStyle = '#ef4444'; targetCtx.fillRect(-20, -20, 40, 40); targetCtx.strokeStyle = 'white'; targetCtx.lineWidth = 3; targetCtx.lineCap = 'round'; targetCtx.lineJoin = 'round'; targetCtx.beginPath(); targetCtx.moveTo(-10, -10); targetCtx.lineTo(10, 10); targetCtx.moveTo(10, -10); targetCtx.lineTo(-10, 10); targetCtx.stroke(); targetCtx.restore(); targetCtx.fillStyle = '#888'; targetCtx.font = 'bold 80px sans-serif'; targetCtx.textAlign = 'center'; targetCtx.textBaseline = 'middle'; targetCtx.fillText(`SCENE ${assetIndex + 1}`, width / 2, height / 2 + 60); targetCtx.font = '30px sans-serif'; targetCtx.fillStyle = '#555'; targetCtx.fillText('Visual Missing', width / 2, height / 2 + 120); targetCtx.restore(); return; } const drawCover = (ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, offsetX: number = 0.5, offsetY: number = 0.5) => { if (offsetX < 0) offsetX = 0; if (offsetY < 0) offsetY = 0; if (offsetX > 1) offsetX = 1; if (offsetY > 1) offsetY = 1; let iw = 0, ih = 0; if (img instanceof HTMLVideoElement) { iw = img.videoWidth; ih = img.videoHeight; } else if (img instanceof HTMLImageElement) { iw = img.naturalWidth; ih = img.naturalHeight; } else { return; } const r = Math.min(w / iw, h / ih); let nw = iw * r; let nh = ih * r; let cx, cy, cw, ch, ar = 1; if (nw < w) ar = w / nw; if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; nw *= ar; nh *= ar; cw = iw / (nw / w); ch = ih / (nh / h); cx = (iw - cw) * offsetX; cy = (ih - ch) * offsetY; if (cx < 0) cx = 0; if (cy < 0) cy = 0; if (cw > iw) cw = iw; if (ch > ih) ch = ih; ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h); }; if (!isVideo) { let motionType = 0; if (cameraMotion === 'auto') { motionType = assetIndex % 4; } else if (cameraMotion === 'zoom-in') { motionType = 0; } else if (cameraMotion === 'zoom-out') { motionType = 1; } else if (cameraMotion === 'pan-left') { motionType = 2; } else if (cameraMotion === 'pan-right') { motionType = 3; } else { motionType = 4; } const scaleFactor = 0.15; let scale = 1.0; let tx = 0, ty = 0; if (motionType === 0) { scale = 1.0 + (scaleFactor * progress); tx = -((width * scale) - width) / 2; ty = -((height * scale) - height) / 2; } else if (motionType === 1) { scale = (1.0 + scaleFactor) - (scaleFactor * progress); tx = -((width * scale) - width) / 2; ty = -((height * scale) - height) / 2; } else if (motionType === 2) { scale = 1.15; const maxTrans = (width * scale) - width; tx = -(maxTrans * progress); ty = -((height * scale) - height) / 2; } else if (motionType === 3) { scale = 1.15; const maxTrans = (width * scale) - width; tx = -maxTrans + (maxTrans * progress); ty = -((height * scale) - height) / 2; } else { scale = 1.0; tx = 0; ty = 0; } targetCtx.translate(tx, ty); targetCtx.scale(scale, scale); drawCover(targetCtx, visual, 0, 0, width, height); } else { drawCover(targetCtx, visual, 0, 0, width, height); } targetCtx.restore(); };

  const renderVideo = async (targetAssets: VideoAsset[]) => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (targetAssets.length === 0) return; setIsRendering(true); setRenderProgress(0); if (targetAssets.length === assets.length) { setFinalVideoUrl(null); }
    if (bgmPreviewRef.current) { bgmPreviewRef.current.pause(); setIsPlayingBgmPreview(false); }
    
    let audioCtx: AudioContext | null = null;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext; 
      audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const audioDest = audioCtx.createMediaStreamDestination();
      let bgmSource: AudioBufferSourceNode | null = null; let bgmGain: GainNode | null = null;
      let bgmUrl = ""; if (selectedBgmId === 'custom') { bgmUrl = bgmSources.custom; } else if (selectedBgmId !== 'none') { bgmUrl = bgmSources[selectedBgmId as keyof typeof bgmSources]; }
      if (bgmUrl) { try { const bgmResp = await fetch(bgmUrl); if (bgmResp.ok) { const bgmArrayBuffer = await bgmResp.arrayBuffer(); const bgmAudioBuffer = await audioCtx.decodeAudioData(bgmArrayBuffer); bgmSource = audioCtx.createBufferSource(); bgmSource.buffer = bgmAudioBuffer; bgmSource.loop = true; bgmGain = audioCtx.createGain(); bgmGain.gain.value = bgmVolume; bgmSource.connect(bgmGain); bgmGain.connect(audioDest); bgmSource.start(0); } } catch (e) {} }
      const canvasStream = canvas.captureStream(60); const combinedStream = new MediaStream([ ...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks() ]);
      const supportedMimeTypes = [
        'video/webm;codecs=vp9',
        'video/mp4;codecs=avc1',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const chosenMimeType = supportedMimeTypes.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: chosenMimeType, videoBitsPerSecond: 12000000 });
      const chunks: Blob[] = []; mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); }; mediaRecorder.start();
      const snapshotCanvas = document.createElement('canvas'); snapshotCanvas.width = canvas.width; snapshotCanvas.height = canvas.height; const snapshotCtx = snapshotCanvas.getContext('2d');
      const activeStyle = SUBTITLE_STYLES[subtitleStyle];

      let avatarCanvas: HTMLCanvasElement | null = null;
      if (avatarUrl) { const img = new Image(); img.crossOrigin = "anonymous"; await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; img.src = avatarUrl; }); if (img.complete && img.naturalWidth > 0) { avatarCanvas = removeWhiteBackground(img); } }

      for (let i = 0; i < targetAssets.length; i++) {
        setRenderProgress(Math.round(((i) / targetAssets.length) * 100));
        const asset = targetAssets[i]; const isTransitioning = i > 0;
        let visualElement: HTMLImageElement | HTMLVideoElement | null = null; const isVideo = asset.assetType === 'video';
        if (asset.url) { try { if (isVideo) { visualElement = document.createElement('video'); visualElement.src = asset.url; visualElement.crossOrigin = "anonymous"; visualElement.muted = true; visualElement.loop = false; visualElement.playsInline = true; visualElement.autoplay = true; visualElement.width = canvas.width; visualElement.height = canvas.height; if (hiddenVideoContainerRef.current) hiddenVideoContainerRef.current.appendChild(visualElement); await new Promise((resolve) => { (visualElement as HTMLVideoElement).oncanplaythrough = resolve; (visualElement as HTMLVideoElement).onerror = () => { visualElement = null; resolve(null); }; setTimeout(() => resolve(null), 3000); }); try { if (visualElement) await (visualElement as HTMLVideoElement).play(); } catch(e) {} } else { visualElement = new Image(); visualElement.crossOrigin = "anonymous"; await new Promise((resolve) => { (visualElement as HTMLImageElement).onload = () => resolve(null); (visualElement as HTMLImageElement).onerror = () => { console.warn("Image load failed for render", asset.url); visualElement = null; resolve(null); }; (visualElement as HTMLImageElement).src = asset.url!; }); } } catch (e) { visualElement = null; } } else { visualElement = null; }
        let audioBuffer: AudioBuffer | null = null;
        if (asset.audioUrl) {
            try {
                const response = await fetch(asset.audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error("Failed to load audioUrl", e);
            }
        }

        let videoAudioBuffer: AudioBuffer | null = null;
        if (asset.assetType === 'video' && asset.url && asset.muteVideo === false) {
            try {
                const response = await fetch(asset.url);
                const arrayBuffer = await response.arrayBuffer();
                videoAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.log("No audio track in video or failed to decode");
            }
        }

        let audioDuration = 4;
        if (audioBuffer) audioDuration = audioBuffer.duration;
        else if (videoAudioBuffer) audioDuration = videoAudioBuffer.duration;
        else if (asset.narration) audioDuration = Math.max(2, asset.narration.length * 0.2);

        let sceneDuration = audioDuration;
        if (isVideo && visualElement) {
            const vDur = (visualElement as HTMLVideoElement).duration;
            if (vDur && isFinite(vDur)) {
                sceneDuration = vDur;
            }
        }

        const speed = renderSpeed || 1.0;
        const effectiveAudioDuration = audioDuration / speed;
        const effectiveSceneDuration = sceneDuration / speed;

        let mainAudioBuffer = audioBuffer;
        if (!mainAudioBuffer || mainAudioBuffer.duration < sceneDuration) {
            const sr = audioBuffer ? audioBuffer.sampleRate : 24000;
            const ch = audioBuffer ? audioBuffer.numberOfChannels : 1;
            const paddedBuffer = audioCtx.createBuffer(ch, Math.ceil(sr * sceneDuration), sr);
            if (audioBuffer) {
                for (let c = 0; c < ch; c++) {
                    paddedBuffer.getChannelData(c).set(audioBuffer.getChannelData(c));
                }
            }
            mainAudioBuffer = paddedBuffer;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = mainAudioBuffer;
        source.playbackRate.value = speed;
        source.connect(audioDest);
        let videoSource: AudioBufferSourceNode | null = null;
        if (videoAudioBuffer) {
            videoSource = audioCtx.createBufferSource();
            videoSource.buffer = videoAudioBuffer;
            videoSource.playbackRate.value = speed;
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = audioBuffer ? 0.3 : 1.0;
            videoSource.connect(gainNode);
            gainNode.connect(audioDest);
        }
        const originalIndex = assets.findIndex(a => a.id === asset.id); const cameraMotion = asset.cameraMotion || 'auto'; const transitionDuration = 800; const text = asset.narration || "";
        const isShorts = aspectRatio === '9:16';
        const sideMargin = isShorts ? 40 : 250; const maxTextWidth = canvas.width - (sideMargin * 2);
        
        // Dynamic font size scaling for Shorts (Fixed to 82px for shorts, activeStyle.fontSize for long)
        const subFontSize = isShorts ? 82 : activeStyle.fontSize;
        
        ctx.font = `${subFontSize}px ${activeStyle.font}`; const words = text.split(' '); let visualChunks: string[] = []; let currentChunk = words[0] || "";
        for (let w = 1; w < words.length; words) { const word = words[w]; const measure = ctx.measureText(currentChunk + " " + word); if (measure.width < maxTextWidth) { currentChunk += " " + word; w++; } else { visualChunks.push(currentChunk); currentChunk = word; w++; } } if (currentChunk) visualChunks.push(currentChunk);
        const getChunkWeight = (chunk: string) => {
            let weight = chunk.length;
            const commas = (chunk.match(/[,，]/g) || []).length;
            const periods = (chunk.match(/[\.\?\!。？！]/g) || []).length;
            const ellipsis = (chunk.match(/[…~]/g) || []).length;
            weight += commas * 3; // Increased weight for commas
            weight += periods * 6; // Increased weight for periods
            weight += ellipsis * 8; // Increased weight for ellipsis
            return weight;
        };
        
        const timeSegments: { text: string, start: number, end: number }[] = []; 
        const totalCharLength = visualChunks.reduce((sum, chunk) => sum + getChunkWeight(chunk), 0) || 1;
        
        // Sync Logic Improvement: Relaxed timing
        const startOffset = 0.2; // Slightly more start buffer
        const endBuffer = 0.4;    // More end buffer to prevent abrupt cut
        const validTextDuration = Math.max(0.1, effectiveAudioDuration - startOffset - endBuffer);
        
        let cursorTime = startOffset; 
        visualChunks.forEach((chunk) => { 
            const weight = getChunkWeight(chunk); 
            const segmentDuration = (weight / totalCharLength) * validTextDuration; 
            timeSegments.push({ text: chunk, start: cursorTime, end: cursorTime + segmentDuration }); 
            cursorTime += segmentDuration; 
        });
        
        // Ensure last segment stays on screen until scene end
        if (timeSegments.length > 0) {
            timeSegments[timeSegments.length - 1].end = effectiveSceneDuration + (SCENE_PADDING_MS / 1000); 
        }

        await new Promise<void>((resolve) => {
            let isSceneActive = true; 
            let audioStartTime = audioCtx.currentTime;
            
            // Delay audio start slightly to allow visual transition to begin
            const AUDIO_DELAY_SEC = 0.25;
            
            // Universal neutral black base for all video genres (animations, lectures, admissions, etc.)
            const defaultBgColor = '#000000';

            source.onended = () => { setTimeout(() => { isSceneActive = false; if(isVideo && visualElement) { (visualElement as HTMLVideoElement).pause(); if (visualElement.parentNode) visualElement.parentNode.removeChild(visualElement); } if (snapshotCtx) { snapshotCtx.fillStyle = defaultBgColor; snapshotCtx.fillRect(0, 0, canvas.width, canvas.height); drawSceneVisuals(snapshotCtx, visualElement, isVideo, cameraMotion, 1.0, canvas.width, canvas.height, originalIndex); } resolve(); if (videoSource) { try { videoSource.stop(); } catch(e) {} } }, SCENE_PADDING_MS); };
            
            // Start audio with a slight delay
            source.start(audioCtx.currentTime + AUDIO_DELAY_SEC);
            if (videoSource) videoSource.start(audioCtx.currentTime + AUDIO_DELAY_SEC);
            
            // Enforce strict scene duration limit so videos don't stay too long if audio is longer
            setTimeout(() => {
                if (isSceneActive) {
                    try { source.stop(); } catch(e) {}
                }
            }, (effectiveSceneDuration + AUDIO_DELAY_SEC) * 1000); 
            
            if (isVideo && visualElement) {
                (visualElement as HTMLVideoElement).playbackRate = speed;
                (visualElement as HTMLVideoElement).play().catch(() => {});
            }
            const renderFrame = () => {
                if (!isSceneActive) return; 
                
                // Calculate elapsed time relative to when the visual scene started (which is now)
                const visualElapsed = audioCtx.currentTime - audioStartTime;
                
                // Calculate elapsed time relative to when audio actually started
                const audioElapsed = Math.max(0, audioCtx.currentTime - (audioStartTime + AUDIO_DELAY_SEC));
                
                const progress = Math.min(visualElapsed / (effectiveSceneDuration + AUDIO_DELAY_SEC), 1.0); 
                const width = canvas.width; const height = canvas.height;
                
                ctx.fillStyle = defaultBgColor;
                ctx.fillRect(0, 0, width, height);
                if (isTransitioning && visualElapsed * 1000 < transitionDuration && snapshotCanvas) { ctx.drawImage(snapshotCanvas, 0, 0); ctx.globalAlpha = (visualElapsed * 1000) / transitionDuration; } else { ctx.globalAlpha = 1.0; }
                drawSceneVisuals(ctx, visualElement, isVideo, cameraMotion, progress, width, height, originalIndex); ctx.globalAlpha = 1.0;
                
                if (avatarCanvas) { 
                    ctx.save(); 
                    const breathing = Math.sin(visualElapsed * 2.5) * 0.02; 
                    const baseScale = isShorts ? 0.35 : 0.35; 
                    const avScale = baseScale + (baseScale * breathing * 0.5); 
                    const avW = avatarCanvas.width * avScale; 
                    const avH = avatarCanvas.height * avScale; 
                    
                    const avX = avatarPosition === 'left' 
                        ? (isShorts ? 60 : 60) 
                        : width - avW - (isShorts ? 60 : 20);
                        
                    const shortsBottomOffset = isShorts ? height * 0.20 : 0; 
                    const breatheY = breathing * 10; 
                    const avY = height - avH - shortsBottomOffset + breatheY; 
                    let openAmount = 0; 
                    let squashY = 0; 
                    if (audioElapsed > 0.1 && audioElapsed < effectiveAudioDuration - 0.2) { 
                        const wave = Math.sin(audioElapsed * 11); 
                        openAmount = Math.abs(wave) * 6; 
                        squashY = Math.max(0, wave * 2); 
                    } 
                    ctx.drawImage(avatarCanvas, avX, avY + squashY, avW, avH - squashY); 
                    if (openAmount > 0.5) { 
                        const mouthWidthRatio = 0.11; 
                        const safeZoneStart = 0.5 - (mouthWidthRatio / 2); 
                        const safeW = avatarCanvas.width * mouthWidthRatio; 
                        const safeX = avX + (avatarCanvas.width * safeZoneStart * avScale); 
                        const splitRatio = 0.45; 
                        const splitY = avatarCanvas.height * splitRatio; 
                        const destSplitY = avY + (splitY * avScale) + squashY; 
                        const chinHeightRatio = 0.15; 
                        const sH = Math.min(avatarCanvas.height - splitY, avatarCanvas.height * chinHeightRatio); 
                        
                        // Mouth fine-tuning: Shift right by 1% of avatar width
                        const mouthOffsetX = avW * 0.01; 

                        ctx.fillStyle = '#1a0505'; 
                        ctx.beginPath(); 
                        ctx.ellipse(avX + (avW / 2) + mouthOffsetX, destSplitY + (openAmount * 0.3), avW * 0.04, openAmount * 0.5, 0, 0, Math.PI * 2); 
                        ctx.fill(); 
                        
                        const sX = avatarCanvas.width * safeZoneStart; 
                        const sY = splitY; 
                        const sW = safeW; 
                        const dX = safeX + mouthOffsetX; 
                        const dY = destSplitY + openAmount; 
                        const dW = avW * mouthWidthRatio; 
                        const dH = (sH * avScale) - squashY; 
                        ctx.drawImage(avatarCanvas, sX, sY, sW, sH, dX, dY, dW, dH); 
                    } 
                    ctx.restore(); 
                }
                
                if (activeStyle.isLetterbox) { ctx.fillStyle = 'black'; ctx.fillRect(0, height - 160, width, 160); ctx.fillRect(0, 0, width, 160); }
                
                if (asset.overlayText) { ctx.save(); const titleFontSize = isShorts ? 90 : 110; ctx.font = `900 ${titleFontSize}px "GmarketSansBold", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const x = width / 2; const y = isShorts ? height * 0.3 : height / 2; 
                const titleWidth = ctx.measureText(asset.overlayText).width; const maxWidth = width * 0.9; if (titleWidth > maxWidth) { const titleScale = maxWidth / titleWidth; ctx.translate(x, y); ctx.scale(titleScale, titleScale); ctx.translate(-x, -y); }
                ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 20; ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 8; ctx.lineWidth = 15; ctx.strokeStyle = '#000000'; ctx.lineJoin = 'round'; ctx.strokeText(asset.overlayText, x, y); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; const gradient = ctx.createLinearGradient(0, y - 50, 0, y + 50); gradient.addColorStop(0, '#FFFFFF'); gradient.addColorStop(1, '#FFF5C2'); ctx.fillStyle = gradient; ctx.fillText(asset.overlayText, x, y); ctx.restore(); }
                
                const activeSegment = timeSegments.find(s => audioElapsed >= s.start && audioElapsed < s.end);
                if (activeSegment) { 
                    ctx.save(); 
                    ctx.font = `${subFontSize}px ${activeStyle.font}`; 
                    const textStr = activeSegment.text; 
                    const textMetrics = ctx.measureText(textStr); 
                    const textWidth = textMetrics.width; 
                    const xPos = width / 2; 
                    const yPos = isShorts ? height - (height * 0.19) : height - (height * activeStyle.yOffset / 100); 
                    
                    if (activeStyle.bgColor) { 
                        const padding = activeStyle.bgPadding || 20; 
                        ctx.fillStyle = activeStyle.bgColor; 
                        ctx.fillRect( xPos - (textWidth / 2) - padding, yPos - subFontSize, textWidth + (padding * 2), subFontSize + (padding * 0.5) ); 
                    } 
                    
                    ctx.textAlign = 'center'; 
                    ctx.textBaseline = 'alphabetic'; 
                    
                    if (activeStyle.strokeWidth > 0) { 
                        // Use activeStyle.strokeWidth directly (which is now 12px for standard) or override for Shorts if needed
                        ctx.lineWidth = isShorts ? 12 : activeStyle.strokeWidth; 
                        ctx.lineJoin = 'round'; 
                        ctx.strokeStyle = activeStyle.strokeColor; 
                        ctx.strokeText(textStr, xPos, yPos); 
                    } 
                    
                    ctx.fillStyle = activeStyle.color; 
                    if (activeStyle.shadow) { 
                        ctx.shadowColor = 'rgba(0,0,0,0.9)'; 
                        ctx.shadowBlur = 4; 
                        ctx.shadowOffsetX = 3; 
                        ctx.shadowOffsetY = 3; 
                    } 
                    ctx.fillText(textStr, xPos, yPos); 
                    ctx.restore(); 
                }
                
                const isPsychology = channelTheme === 'psychology' || formData.channelTheme === 'psychology';
                const isEducation = channelTheme === 'education' || formData.channelTheme === 'education';
                const brandColor = isPsychology ? '#7c3aed' : (isEducation ? '#0f172a' : '#059669');
                const brandName = isPsychology ? 'Mind Exodus' : (isEducation ? 'The Equation' : 'EcoMo');
                
                if (logoPosition !== 'none') {
                    ctx.save(); const logoSize = 50; const wmMargin = 50; const wmX = logoPosition === 'left' ? wmMargin : width - wmMargin - logoSize; const wmY = wmMargin; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; ctx.translate(wmX, wmY); ctx.fillStyle = brandColor; if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, logoSize, logoSize, 12); ctx.fill(); } else { ctx.fillRect(0, 0, logoSize, logoSize); } ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; 
                    if (isPsychology) { 
                        ctx.beginPath(); ctx.moveTo(15, 38); ctx.lineTo(15, 12); ctx.lineTo(32, 12); ctx.lineTo(32, 38); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(44, 8); ctx.lineTo(44, 34); ctx.lineTo(32, 38); ctx.closePath(); ctx.fill(); ctx.stroke(); 
                    } else if (isEducation) {
                        // Education Logo (Simplified Book)
                        ctx.fillStyle = '#38bdf8';
                        ctx.beginPath();
                        ctx.moveTo(10, 12); ctx.lineTo(25, 12); ctx.lineTo(25, 42); ctx.lineTo(10, 38); ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = '#0ea5e9';
                        ctx.beginPath();
                        ctx.moveTo(40, 12); ctx.lineTo(25, 12); ctx.lineTo(25, 42); ctx.lineTo(40, 38); ctx.closePath();
                        ctx.fill();
                    } else { 
                        ctx.beginPath(); ctx.moveTo(15, 32); ctx.lineTo(22, 25); ctx.lineTo(28, 30); ctx.lineTo(38, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(38, 18); ctx.lineTo(38, 25); ctx.moveTo(38, 18); ctx.lineTo(30, 18); ctx.stroke(); 
                    } 
                    ctx.fillStyle = 'white'; ctx.font = `bold ${isPsychology ? 30 : (isEducation ? 30 : 36)}px "GmarketSansBold", sans-serif`; ctx.textAlign = logoPosition === 'left' ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.fillText(brandName, logoPosition === 'left' ? logoSize + 15 : -15, logoSize/2); ctx.restore();
                }
                
                requestAnimationFrame(renderFrame);
            };
            renderFrame();
        });
        await new Promise(r => setTimeout(r, 100)); 
      }
      if (bgmSource && bgmGain) { const currentTime = audioCtx.currentTime; bgmGain.gain.setValueAtTime(bgmGain.gain.value, currentTime); bgmGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 1.5); bgmSource.stop(currentTime + 1.5); }
      setRenderProgress(100); await new Promise(r => setTimeout(r, 1500));
      mediaRecorder.stop(); mediaRecorder.onstop = () => { const blob = new Blob(chunks, { type: 'video/webm' }); const url = URL.createObjectURL(blob); setFinalVideoUrl(url); setShowPreviewModal(true); setIsRendering(false); audioCtx?.close(); };
    } catch (error) { 
      console.error("Rendering failed:", error); 
      alert("렌더링 중 오류가 발생했습니다."); 
      setIsRendering(false); 
      if (audioCtx) {
        audioCtx.close().catch(console.error);
      }
    }
  };

  const handleDownloadVideo = () => { if (finalVideoUrl) { const a = document.createElement('a'); a.href = finalVideoUrl; a.download = `ecomo_video_${Date.now()}.webm`; document.body.appendChild(a); a.click(); document.body.removeChild(a); } };
  const handleRenderScene = async (asset: VideoAsset) => { if (isRendering) return; setRenderType('single'); await renderVideo([asset]); };
  const handleRenderAll = async () => { if (isRendering || assets.length === 0) return; setRenderType('full'); await renderVideo(assets); };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0 relative">
      <PromptGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ThumbnailModal isOpen={showThumbnailModal} onClose={() => setShowThumbnailModal(false)} thumbnailUrl={thumbnailUrl} isGenerating={isGeneratingThumb} onGenerate={handleGenerateThumbnail} />
      <YouTubeUploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} metadata={ytMetadata} videoBlobUrl={finalVideoUrl} scriptContent={scriptContent} />
      {showBgmConfig && ( <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"> <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"> <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"> <div className="flex items-center gap-2 text-slate-800"> <Music className="w-5 h-5 text-brand-600" /> <h2 className="text-lg font-bold">BGM 라이브러리 설정</h2> </div> <button onClick={() => setShowBgmConfig(false)} className="text-slate-400 hover:text-slate-600"> <X className="w-5 h-5" /> </button> </div> <div className="p-6 space-y-6"> <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100"> 유튜브 뮤직 등에서 다운로드한 MP3 파일을 분위기별로 등록해두면, <strong>'AI 추천'</strong> 기능 사용 시 대본 분위기에 맞춰 자동으로 선택됩니다. </p> <div className="space-y-2"> <label className="text-sm font-semibold text-slate-700 flex items-center justify-between"> <span>1. 차분한 분석 (Calm)</span> <span className="text-xs font-normal text-slate-400 truncate max-w-[150px]">{bgmFileNames.calm}</span> </label> <div className="flex gap-2"> <label className="flex-1 flex items-center justify-center gap-2 border border-slate-300 border-dashed rounded-lg p-3 cursor-pointer hover:bg-slate-50 hover:border-brand-300 transition-all group"> <Upload className="w-4 h-4 text-slate-400 group-hover:text-brand-500" /> <span className="text-sm text-slate-500 group-hover:text-brand-600">파일 선택...</span> <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBgmUpload('calm', e.target.files[0])} /> </label> </div> </div> <div className="space-y-2"> <label className="text-sm font-semibold text-slate-700 flex items-center justify-between"> <span>2. 신뢰와 성장 (Corporate)</span> <span className="text-xs font-normal text-slate-400 truncate max-w-[150px]">{bgmFileNames.corporate}</span> </label> <div className="flex gap-2"> <label className="flex-1 flex items-center justify-center gap-2 border border-slate-300 border-dashed rounded-lg p-3 cursor-pointer hover:bg-slate-50 hover:border-brand-300 transition-all group"> <Upload className="w-4 h-4 text-slate-400 group-hover:text-brand-500" /> <span className="text-sm text-slate-500 group-hover:text-brand-600">파일 선택...</span> <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBgmUpload('corporate', e.target.files[0])} /> </label> </div> </div> <div className="space-y-2"> <label className="text-sm font-semibold text-slate-700 flex items-center justify-between"> <span>3. 위기와 긴장 (Tense)</span> <span className="text-xs font-normal text-slate-400 truncate max-w-[150px]">{bgmFileNames.tense}</span> </label> <div className="flex gap-2"> <label className="flex-1 flex items-center justify-center gap-2 border border-slate-300 border-dashed rounded-lg p-3 cursor-pointer hover:bg-slate-50 hover:border-brand-300 transition-all group"> <Upload className="w-4 h-4 text-slate-400 group-hover:text-brand-500" /> <span className="text-sm text-slate-500 group-hover:text-brand-600">파일 선택...</span> <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBgmUpload('tense', e.target.files[0])} /> </label> </div> </div> </div> <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end"> <Button onClick={() => setShowBgmConfig(false)}>확인 및 닫기</Button> </div> </div> </div> )}
      <canvas ref={canvasRef} width={aspectRatio === '16:9' ? 1920 : 1080} height={aspectRatio === '16:9' ? 1080 : 1920} className="hidden" />
      <div ref={hiddenVideoContainerRef} className="fixed -top-[9999px] -left-[9999px] w-[1920px] h-[1080px] opacity-0 pointer-events-none" />
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            {mode === 'video' ? <Video className="w-5 h-5 text-purple-600" /> : <ImageIcon className="w-5 h-5 text-brand-600" />}
            <span>스튜디오 (편집 및 렌더링)</span>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={handleEmergencyBackupWrapper} className="text-xs flex items-center gap-1 text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-full transition-colors font-bold shadow-sm hover:shadow animate-pulse" title="모든 대본/프롬프트/미디어 파일 백업"> <Save className="w-3 h-3" /> 프로젝트 비상 백업 </button>
              <div className="h-4 w-px bg-slate-300 mx-1"></div>
              <button onClick={() => setShowThumbnailModal(true)} className="text-xs flex items-center gap-1 text-slate-600 hover:text-brand-600 bg-white border border-slate-200 px-2 py-1 rounded-full transition-colors font-medium shadow-sm hover:shadow" title="AI로 고효율 썸네일 생성 (한글 지원)"> <ImageIcon className="w-3 h-3" /> 썸네일 (Hybrid) </button>
              <button onClick={() => setShowGuide(true)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-brand-600 bg-white border border-slate-200 px-2 py-1 rounded-full transition-colors" title="프롬프트 가이드 보기"> <HelpCircle className="w-3 h-3" /> 가이드 </button>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-medium"> {assets.length} Scenes </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="flex bg-slate-200 p-1 rounded-lg col-span-2 sm:col-span-1"> <button onClick={() => setMode('image')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'image' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`} > <ImageIcon className="w-3 h-3" /> 이미지 (저비용) </button> <button onClick={() => setMode('video')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'video' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`} > <Video className="w-3 h-3" /> Veo (권한 필요) </button> </div>
            {mode === 'image' && ( <div className="col-span-2 sm:col-span-1 relative animate-in fade-in zoom-in-95 duration-200"> <select value={globalStyle} onChange={(e) => setGlobalStyle(e.target.value as ImageStyle)} className="w-full h-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none appearance-none" > {STYLE_OPTIONS.map(opt => ( <option key={opt.value} value={opt.value}>{opt.label}</option> ))} </select> <Palette className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /> </div> )}
            
            {/* Multi-Speaker Config UI */}
            {detectedSpeakers.length > 0 && (
                <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                        <MessageSquare className="w-4 h-4 text-brand-600" />
                        <span>화자별 음성 설정 (Multi-Speaker Mapping)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detectedSpeakers.map(speaker => (
                            <div key={speaker} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-xs font-bold text-slate-600">[{speaker}]</span>
                                <select 
                                    value={globalSpeakerMap[speaker] || 'Puck'} 
                                    onChange={(e) => setGlobalSpeakerMap(prev => ({ ...prev, [speaker]: e.target.value }))}
                                    className="text-xs border-none bg-slate-50 rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                                >
                                    {VOICE_OPTIONS.map(v => (
                                        <option key={v.name} value={v.name}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="col-span-2"> <Button variant="secondary" size="sm" onClick={handleSmartBatchFill} className="w-full text-xs py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md border-0" disabled={isBatchProcessing || isRendering} > {isBatchProcessing ? ( <Loader2 className="w-3 h-3 animate-spin mr-1" /> ) : ( <Zap className="w-3 h-3 mr-1" /> )} {isBatchProcessing ? "스마트 생성 중 (대기열 작동)" : (errorCount > 0 ? "오류 씬 다시 시도 (Smart Retry)" : "스마트 일괄 생성 (오류 시 자동 복구)")} </Button> {isBatchProcessing && ( <div className="mt-2 bg-slate-800 text-white text-xs rounded-lg p-2.5 flex flex-col gap-1 shadow-lg animate-in fade-in slide-in-from-top-2"> <div className="flex justify-between items-center mb-1"> <span className="font-bold text-emerald-400">Smart Batch Processing...</span> <span className="text-slate-400">{batchProgress.current} / {batchProgress.total}</span> </div> <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1"> <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div> </div> <p className="text-slate-300 flex items-center gap-1.5"> {batchStatusMessage.includes("대기") ? <Hourglass className="w-3 h-3 animate-spin" /> : <Loader2 className="w-3 h-3 animate-spin" />} {batchStatusMessage} </p> </div> )} </div>
            <div className="col-span-2 flex gap-2"> 
              <Button variant="outline" size="sm" onClick={handleAnalyzeMotion} className="flex-1 text-xs py-1.5 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" disabled={isAnalyzingMotion || assets.length === 0} isLoading={isAnalyzingMotion} > <Sparkles className="w-3 h-3 mr-1.5" /> {isAnalyzingMotion ? '분석 중...' : '이미지 vs 동영상 추천 받기'} </Button> 
              {assets.some(a => a.recommendedType) && (
                  <Button variant="outline" size="sm" onClick={handleCancelAnalysis} className="text-xs py-1.5 border-slate-300 text-slate-600 hover:bg-slate-100" title="추천 결과 취소"> <RotateCcw className="w-3 h-3 mr-1" /> 취소 </Button>
              )}
            </div>
            <div className="col-span-2 mt-2">
              <Button variant="outline" size="sm" onClick={handleAddEmptyScene} className="w-full text-xs py-1.5 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50">
                + 빈 씬 추가 (수동 작업용)
              </Button>
            </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100/80 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-sm"> <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${viewFilter === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`} > <Filter className="w-3 h-3" /> 전체 씬 ({assets.length}) </button> <button onClick={() => setViewFilter('error')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${viewFilter === 'error' ? 'bg-red-50 text-red-600 shadow-sm border border-red-200' : 'text-slate-500 hover:text-red-600'}`} > <AlertCircle className="w-3 h-3" /> 결함 목록 ({errorCount}) </button> {errorCount > 0 && viewFilter === 'all' && ( <span className="text-[10px] text-red-500 animate-pulse ml-auto font-medium flex items-center gap-1"> <AlertCircle className="w-3 h-3" /> {errorCount}개의 씬 생성 실패 </span> )} </div>
      {showPreviewModal && finalVideoUrl && ( <div className="absolute inset-0 z-40 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300"> <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-h-full flex flex-col ${aspectRatio === '9:16' ? 'max-w-md' : 'max-w-4xl'}`}> <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"> <div className="flex items-center gap-2 text-brand-700"> <CheckCircle2 className="w-5 h-5 text-emerald-500" /> <h3 className="font-bold text-lg"> {renderType === 'full' ? '최종 영상 미리보기 (Final Preview)' : '씬 미리보기 (Scene Preview)'} </h3> </div> <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors" > <X className="w-6 h-6 text-slate-400" /> </button> </div> <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative group"> <video src={finalVideoUrl} controls autoPlay className="w-full h-full object-contain" /> </div> <div className="p-4 border-t border-slate-100 bg-white flex gap-3 justify-end items-center flex-wrap"> <div className="flex-1 text-xs text-slate-400 hidden sm:block"> {renderType === 'full' ? "* 영상이 마음에 들면 다운로드하거나 유튜브에 바로 업로드하세요." : "* 단일 씬 미리보기 모드입니다. 전체 영상을 렌더링하려면 '최종 영상 만들기'를 클릭하세요."} </div> <Button variant="ghost" onClick={() => setShowPreviewModal(false)} > 닫기 </Button> <Button variant="secondary" onClick={handleDownloadVideo} > <Download className="w-5 h-5 mr-2" /> 다운로드 </Button> {renderType === 'full' && ( <Button onClick={handleOpenYouTubeUpload} className="bg-[#FF0000] hover:bg-red-700 text-white" > {isGeneratingMetadata ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Youtube className="w-5 h-5 mr-2" />} 유튜브 업로드 </Button> )} </div> </div> </div> )}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-100/50">
        {missingNarrationCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{missingNarrationCount}개의 씬에 '나레이션(Narration)'이 비어 있습니다. 대본을 확인해 주세요.</span>
            </div>
          </div>
        )}
        {missingOverlayCount > 0 && ( <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"> <div className="flex items-center gap-2 text-orange-800 text-xs font-bold"> <AlertCircle className="w-4 h-4 text-orange-600" /> <span>{missingOverlayCount}개의 씬에 '강조 텍스트(Overlay Text)'가 비어 있습니다.</span> </div> <Button size="sm" onClick={handleGenerateAllTitles} isLoading={isGeneratingAllTitles} className="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 h-8 text-xs w-full sm:w-auto" > <Sparkles className="w-3 h-3 mr-1.5" /> ⚡ 모든 타이틀 자동 생성 </Button> </div> )}
        {displayedAssets.length === 0 && viewFilter === 'error' ? ( <div className="flex flex-col items-center justify-center h-40 text-slate-400"> <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" /> <p>모든 결함이 해결되었습니다!</p> <button onClick={() => setViewFilter('all')} className="text-brand-600 underline text-sm mt-1">전체 목록 보기</button> </div> ) : (
            displayedAssets.map((asset) => {
              const originalIndex = assets.findIndex(a => a.id === asset.id);
              const isRecordingThis = recordingId === asset.id;
              return (
              <div key={asset.id} className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${asset.status === 'error' || asset.audioStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100"> <div className="flex items-center gap-2"> <span className={`text-xs font-bold px-2 py-1 rounded ${asset.status === 'error' || asset.audioStatus === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}> Scene {originalIndex + 1} </span> <button onClick={() => handleRenderScene(asset)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors border ${(asset.status === 'completed' && asset.audioStatus === 'completed') ? 'text-brand-600 hover:text-brand-700 bg-brand-50 border-brand-200' : 'text-slate-500 hover:text-slate-700 bg-slate-50 border-slate-200'}`} disabled={isRendering || isBatchProcessing || asset.status === 'generating' || asset.audioStatus === 'generating'} title={ (asset.status === 'completed' && asset.audioStatus === 'completed') ? "씬 미리보기" : "미완성 씬 미리보기 (대체 화면/무음)" } > <Play className="w-3 h-3" /> 씬 미리보기 </button> </div> <div className="flex items-center gap-3"> {asset.assetType === 'image' && asset.imageStyle && ( <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"> Style: {STYLE_OPTIONS.find(s => s.value === asset.imageStyle)?.label || asset.imageStyle} </span> )} <div className="text-xs text-slate-400 font-mono">ID: {asset.id}</div> <button onClick={() => handleDeleteScene(asset.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="이 씬 삭제하기" disabled={isBatchProcessing || isRendering}><Trash2 className="w-4 h-4" /></button> </div> </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"> <div className="flex items-center gap-2"> <p className="text-xs font-bold text-slate-500 uppercase">Visual</p> {asset.recommendedType && ( <button onClick={() => handleGenerateVisual(asset.id, asset.recommendedType as GenerationMode)} className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-all hover:opacity-80 border ${asset.recommendedType === 'video' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`} title={`AI가 이 씬을 ${asset.recommendedType === 'video' ? '동영상' : '이미지'}로 추천합니다. 클릭하여 적용.`} > {asset.recommendedType === 'video' ? <Video size={10} /> : <ImageIcon size={10} />} AI 추천: {asset.recommendedType === 'video' ? 'Veo (Motion)' : '이미지 (Static)'} </button> )} </div> <div className="flex items-center gap-2"> <label className="cursor-pointer text-xs flex items-center gap-1 text-slate-600 hover:text-brand-600 bg-white border border-slate-200 px-2 py-0.5 rounded transition-all shadow-sm h-6"> <FileUp className="w-3 h-3" /> <span>업로드</span> <input type="file" className="hidden" accept="video/mp4,video/webm,image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && handleAssetUpload(asset.id, e.target.files[0])} /> </label> <div className="relative group"> <Move className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" /> <select value={asset.cameraMotion || 'auto'} onChange={(e) => handleCameraMotionChange(asset.id, e.target.value as CameraMotion)} className="pl-6 pr-2 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-600 focus:ring-brand-500 outline-none hover:bg-slate-50 cursor-pointer appearance-none h-6" title="카메라 무빙 설정 (Camera Motion)" disabled={asset.assetType === 'video'} > {MOTION_OPTIONS.map(opt => ( <option key={opt.value} value={opt.value}>{opt.label}</option> ))} </select> </div> {asset.status === 'completed' && asset.url && ( <button onClick={() => handleDownloadAsset(asset.url!, `scene_${originalIndex + 1}_visual.${asset.assetType === 'video' ? 'mp4' : 'png'}`)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded transition-all h-6" title="소스 다운로드 (원본 저장)" > <Download className="w-3 h-3" /> </button> )} {(asset.status === 'completed' || asset.status === 'error') && ( <button onClick={() => handleGenerateVisual(asset.id)} className={`text-xs flex items-center gap-1 ${asset.status === 'error' ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' : 'text-slate-500 hover:text-brand-600 bg-white border border-slate-200'} border px-2 py-0.5 rounded transition-all h-6`} title={asset.status === 'error' ? "오류가 발생했습니다. 다시 시도하려면 클릭하세요." : "다시 생성 (Regenerate)"} > <RotateCcw className="w-3 h-3" /> {asset.status === 'error' ? '재시도' : '재생성'} </button> )} {asset.status === 'completed' && asset.assetType === 'video' && asset.originalImageUrl && ( <button onClick={() => handleRevertToImage(asset.id)} className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-all h-6" title="원본 이미지로 되돌리기" > <Undo2 className="w-3 h-3" /> 이미지로 복구 </button> )} {asset.status === 'completed' && asset.assetType === 'image' && asset.url && ( <button onClick={() => handleAnimateImage(asset.id, asset.prompt, asset.url!)} className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded border border-purple-100 hover:border-purple-200 transition-all shadow-sm active:translate-y-0.5 h-6" title="이미지를 움직이는 비디오로 변환 (Veo)" > <Wand2 className="w-3 h-3" /> Veo로 변환 </button> )} </div> </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visual Prompt (Scene Description)</label>
                            <textarea 
                                className="w-full text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none outline-none shadow-inner" 
                                rows={3} 
                                value={asset.visualPrompt || asset.imagePrompt || asset.prompt} 
                                onChange={(e) => handleVisualPromptChange(asset.id, e.target.value)} 
                                placeholder="장면의 시각적 묘사를 입력하세요 (이미지/비디오 공통)..." 
                            />
                        </div>
                        <div className="flex items-center gap-2"> <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-1.5 focus-within:ring-1 focus-within:ring-brand-500"> <Type className="w-4 h-4 text-slate-400" /> <input type="text" value={asset.overlayText || ''} onChange={(e) => handleOverlayTextChange(asset.id, e.target.value)} placeholder="화면 강조 텍스트 (Title / Key Concept)" className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none" /> </div> <button onClick={() => handleGenerateOverlayTitle(asset.id, asset.narration)} disabled={generatingTextFor === asset.id} className="bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200 rounded p-1.5 transition-colors" title="AI 타이틀 생성 (나레이션 기반)" > {generatingTextFor === asset.id ? ( <Loader2 className="w-4 h-4 animate-spin" /> ) : ( <Sparkles className="w-4 h-4" /> )} </button> </div>
                        {asset.status === 'idle' && ( <Button onClick={() => handleGenerateVisual(asset.id, asset.recommendedType as GenerationMode)} className="w-full text-xs py-2" variant="outline" disabled={isBatchProcessing} > {asset.recommendedType === 'video' ? <Video className="w-3 h-3 mr-1.5 text-purple-600" /> : <ImageIcon className="w-3 h-3 mr-1.5" />} 생성하기 ({asset.recommendedType === 'video' ? '추천: 비디오' : (asset.recommendedType === 'image' ? '추천: 이미지' : (mode === 'image' ? '이미지' : '비디오'))}) </Button> )}
                        {asset.status === 'generating' && ( <div className={`bg-slate-50 rounded flex items-center justify-center border border-slate-200 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}> <div className="text-center"> <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-2" /> <p className="text-[10px] text-slate-500"> {asset.assetType === 'video' ? 'Veo 영상 생성 중...' : '이미지 생성 중...'} </p> </div> </div> )}
                        {asset.status === 'error' && ( <div className={`bg-red-50 rounded flex flex-col items-center justify-center border border-red-200 text-center p-2 relative ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}> <AlertCircle className="w-6 h-6 text-red-500 mb-1" /> <p className="text-xs text-red-600 font-medium mb-1">생성 실패</p> <p className="text-[10px] text-red-400 line-clamp-2">{asset.error}</p> {asset.assetType === 'video' && ( <button onClick={() => handleGenerateVisual(asset.id, 'image')} className="absolute bottom-2 text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded-full shadow-sm hover:bg-red-50" > → 이미지로 대체 (빠른 수정) </button> )} </div> )}
                        {asset.status === 'completed' && asset.url && ( <div className={`relative rounded overflow-hidden bg-black group ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}> {asset.assetType === 'video' ? ( <>
                              <video src={asset.url} className="w-full h-full object-cover" controls muted={asset.muteVideo !== false} loop onVolumeChange={(e) => {
                                const isMuted = (e.target as HTMLVideoElement).muted;
                                if (asset.muteVideo !== isMuted) {
                                  setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, muteVideo: isMuted } : a));
                                }
                              }} />
                              
                            </> ) : ( <img src={asset.url} className="w-full h-full object-cover" /> )} {asset.overlayText && ( <div className="absolute inset-0 flex items-center justify-center pointer-events-none"> <span className="text-white font-serif font-black text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] stroke-black text-stroke px-2 text-center" style={{ textShadow: '0px 0px 4px rgba(0,0,0,0.9)' }}> {asset.overlayText} </span> </div> )} </div> )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"> <p className="text-xs font-bold text-slate-500 uppercase">Narration</p> <div className="flex items-center gap-1"> {asset.audioStatus === 'completed' && asset.audioUrl && ( <button onClick={() => handleDownloadAsset(asset.audioUrl!, `scene_${originalIndex + 1}_audio.wav`)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded transition-all mr-1" title="음성 다운로드 (WAV)" > <Download className="w-3 h-3" /> </button> )} <div className="flex items-center gap-1"> {isRecordingThis ? ( <button onClick={stopRecording} className="text-xs flex items-center gap-1 text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition-all animate-pulse" title="녹음 중지"> <Square className="w-3 h-3 fill-current" /> <span className="font-mono">{formatTime(recordingTime)}</span> </button> ) : ( <button onClick={() => startRecording(asset.id)} className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded transition-all" title="내 목소리로 직접 녹음하기" disabled={recordingId !== null} > <Mic className="w-3 h-3" /> <span>녹음</span> </button> )} <label className="cursor-pointer text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded transition-all mr-1" title="직접 녹음 또는 보정된 음성 업로드"> <FileAudio className="w-3 h-3" /> <span>보이스 업로드</span> <input type="file" className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleAudioUpload(asset.id, e.target.files[0])} /> </label> </div> {(asset.audioStatus === 'completed' || asset.audioStatus === 'error') && ( <button onClick={() => handleGenerateAudio(asset.id, asset.narration)} className={`text-xs flex items-center gap-1 ${asset.audioStatus === 'error' ? 'text-red-600 hover:text-red-700 bg-red-50 border-red-200' : 'text-slate-500 hover:text-brand-600 bg-white border border-slate-200'} bg-white border px-2 py-0.5 rounded transition-all mr-1`} title="TTS로 다시 생성 (Regenerate)" disabled={isBatchProcessing} > <RotateCcw className="w-3 h-3" /> {asset.audioStatus === 'error' ? '재시도' : 'TTS 재생성'} </button> )} 
                        {detectedSpeakers.length === 0 && (
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5"> <select value={asset.voiceName} onChange={(e) => handleVoiceChange(asset.id, e.target.value)} className="text-xs border-r border-slate-100 px-1 py-0.5 bg-transparent text-slate-700 focus:outline-none max-w-[80px] sm:max-w-[100px]" disabled={asset.audioStatus === 'generating' || isBatchProcessing} title="성우 선택" > {VOICE_OPTIONS.map(v => ( <option key={v.name} value={v.name}>{v.name}</option> ))} </select> <select value={asset.audioTone || 'neutral'} onChange={(e) => handleToneChange(asset.id, e.target.value as AudioTone)} className="text-xs px-1 py-0.5 bg-transparent text-slate-700 focus:outline-none max-w-[80px] sm:max-w-[100px]" disabled={asset.audioStatus === 'generating' || isBatchProcessing} title="감정/톤 선택" > {TONE_OPTIONS.map(t => ( <option key={t.value} value={t.value}>{t.label.split(' ')[0]} {t.label.split('(')[1].replace(')', '')}</option> ))} </select> </div> 
                        )}
                        {detectedSpeakers.length === 0 && (
                            <button onClick={() => handlePreviewVoice(asset.id, asset.voiceName || 'Puck')} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title="목소리 미리듣기 (Sample)" disabled={previewingVoice === asset.id} > {previewingVoice === asset.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />} </button> 
                        )}
                        {detectedSpeakers.length > 0 && (
                            <span className="text-[10px] text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-100 font-medium flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> 멀티 스피커 모드 적용됨
                            </span>
                        )}
                        </div> </div>
                        <textarea className="w-full text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-shadow resize-none outline-none" rows={3} value={asset.narration} onChange={(e) => handleNarrationChange(asset.id, e.target.value)} placeholder="나레이션 대본을 입력하세요..." />
                        {asset.audioStatus === 'idle' && ( <Button onClick={() => handleGenerateAudio(asset.id, asset.narration)} className="w-full text-xs py-2" variant="outline" disabled={isBatchProcessing} > <Mic className="w-3 h-3 mr-1.5" /> TTS 음성 생성 </Button> )}
                        {asset.audioStatus === 'generating' && ( <div className="h-10 bg-slate-50 rounded flex items-center justify-center border border-slate-200 text-xs text-slate-500"> <Loader2 className="w-3 h-3 animate-spin mr-2" /> 성우 녹음 중... </div> )}
                        {asset.audioStatus === 'completed' && asset.audioUrl && ( <div className="flex items-center gap-2"> <div className="bg-brand-50 rounded p-2 border border-brand-100 flex-1 flex items-center gap-2"> <audio src={asset.audioUrl} controls className="w-full h-8" /> </div> </div> )}
                        {asset.audioStatus === 'error' && ( <div className="flex flex-col gap-2 bg-red-50 p-2 rounded border border-red-200"> <div className="flex items-start gap-2 text-red-600 text-xs"> <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{asset.error || "생성 실패"}</span> </div> <div className="flex justify-end gap-2"> {(asset.error?.includes("Quota") || asset.error?.includes("429")) && ( <Button onClick={() => handleGenerateSilentAudio(asset.id)} variant="secondary" size="sm" className="text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 h-auto py-1 px-2 text-[10px]" disabled={isBatchProcessing} title="음성 없이 진행" > <Volume1 className="w-3 h-3 mr-1" /> 무음(Silent) 대체 </Button> )} <Button onClick={() => handleGenerateAudio(asset.id, asset.narration)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100 h-auto py-1 px-2 text-[10px]" disabled={isBatchProcessing} > <RefreshCw className="w-3 h-3 mr-1" /> 다시 시도 </Button> </div> </div> )}
                    </div>
                </div>
              </div>
              );
            })
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all duration-300 space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4"> <div className="flex items-center gap-2 min-w-fit"> <Settings className="w-4 h-4 text-slate-500" /> <span className="text-sm font-semibold text-slate-700">전체 설정 (Global Settings)</span> </div> <div className="flex-1 w-full flex flex-wrap gap-4 items-center"> <div className="flex items-center gap-2 min-w-[200px]"> <Music className="w-4 h-4 text-slate-400" /> <div className="flex-1 relative"> <select value={selectedBgmId} onChange={(e) => setSelectedBgmId(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none appearance-none pr-8" disabled={isRendering || isBatchProcessing} > <option value="none">배경음악 없음 (None)</option> <option value="calm">차분한 분석 (Calm)</option> <option value="corporate">신뢰와 성장 (Corporate)</option> <option value="tense">위기와 긴장 (Tense)</option> <option value="custom">직접 입력 (URL)</option> </select> <Settings className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /> </div> {selectedBgmId !== 'none' && ( <button onClick={toggleBgmPreview} className={`p-1.5 rounded transition-all ${isPlayingBgmPreview ? 'bg-brand-100 text-brand-600 animate-pulse' : 'bg-white border border-slate-200 text-slate-500 hover:text-brand-600'}`} title="BGM 미리듣기" disabled={isRendering || isBatchProcessing || (selectedBgmId === 'custom' && !bgmSources.custom)} > {isPlayingBgmPreview ? <VolumeX className="w-3 h-3" /> : <Play className="w-3 h-3" />} </button> )} <button onClick={() => setShowBgmConfig(true)} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-brand-600 hover:bg-slate-50 transition-colors" title="BGM 파일 업로드 (라이브러리 설정)" disabled={isRendering || isBatchProcessing} > <Upload className="w-3 h-3" /> </button> </div> <div className="flex items-center gap-2 min-w-[200px]"> <Captions className="w-4 h-4 text-slate-400" /> <div className="flex-1 relative"> <select value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value as SubtitleStyle)} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none appearance-none pr-8" disabled={isRendering || isBatchProcessing} > {Object.entries(SUBTITLE_STYLES).map(([key, style]) => ( <option key={key} value={key}>{style.label}</option> ))} </select> <Palette className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /> </div> </div> <div className="flex items-center gap-2"> <label className={`flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 cursor-pointer transition-all ${avatarUrl ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}> {avatarUrl ? ( <img src={avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover border border-slate-300" /> ) : ( <User className="w-4 h-4" /> )} <span className="text-xs font-medium">{avatarUrl ? '아바타 변경' : '아바타 (말하는 효과)'}</span> <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} /> </label> {avatarUrl && ( <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1"> <button onClick={() => setAvatarPosition('left')} className={`p-1 rounded transition-all ${avatarPosition === 'left' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-brand-600'}`} title="아바타 왼쪽 배치 (Shorts 추천)" > <AlignLeft className="w-3 h-3" /> </button> <button onClick={() => setAvatarPosition('right')} className={`p-1 rounded transition-all ${avatarPosition === 'right' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-brand-600'}`} title="아바타 오른쪽 배치" > <AlignRight className="w-3 h-3" /> </button> </div> )} {avatarUrl && ( <button onClick={() => setAvatarUrl(null)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="아바타 삭제" > <X className="w-3 h-3" /> </button> )} </div> <div className="flex items-center gap-2"> <label className={`flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 cursor-pointer transition-all ${styleReferenceUrl ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse' : 'bg-white text-slate-600 hover:bg-slate-50'}`} title="원하는 그림체 예시를 업로드하여 전체 씬의 화풍을 고정합니다 (Style Reference)"> {styleReferenceUrl ? ( <img src={styleReferenceUrl} alt="Style Reference" className="w-4 h-4 rounded object-cover border border-amber-400" /> ) : ( <ImagePlus className="w-4 h-4" /> )} <span className="text-xs font-bold">{styleReferenceUrl ? '화풍 고정됨' : '화풍 고정 (이미지 참조)'}</span> <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleStyleReferenceUpload(e.target.files[0])} /> </label> {styleReferenceUrl && ( <button onClick={() => setStyleReferenceUrl(null)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="화풍 고정 해제" > <X className="w-3 h-3" /> </button> )} </div> <div className="flex items-center gap-2"> <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1"> <span className="text-[10px] font-bold text-slate-500 px-1">로고 위치</span> <button onClick={() => setLogoPosition('left')} className={`p-1 rounded transition-all ${logoPosition === 'left' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`} title="로고 왼쪽 상단" > <AlignLeft className="w-3 h-3" /> </button> <button onClick={() => setLogoPosition('right')} className={`p-1 rounded transition-all ${logoPosition === 'right' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`} title="로고 우측 상단" > <AlignRight className="w-3 h-3" /> </button> <button onClick={() => setLogoPosition('none')} className={`p-1 rounded transition-all ${logoPosition === 'none' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`} title="로고 숨김" > <X className="w-3 h-3" /> </button> </div> </div> <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1"> <button onClick={() => setAspectRatio('16:9')} className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${aspectRatio === '16:9' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} > <RectangleHorizontal className="w-3 h-3" /> 16:9 (가로) </button> <button onClick={() => setAspectRatio('9:16')} className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${aspectRatio === '9:16' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} > <Smartphone className="w-3 h-3" /> 9:16 (세로) </button> </div> <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 px-2.5 shadow-sm"> <Gauge className="w-3.5 h-3.5 text-brand-600 shrink-0" /> <span className="text-[11px] font-bold text-slate-600 shrink-0">렌더링 배속:</span> <select value={renderSpeed} onChange={(e) => setRenderSpeed(parseFloat(e.target.value))} className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1" disabled={isRendering || isBatchProcessing} title="렌더링 배속 설정 (3분 초과 시 1.09x~1.1x 배속으로 쇼츠 3분 제한 통과)" > <option value="1">1.0x (표준 속도)</option> <option value="1.05">1.05x (+5% 미세 단축)</option> <option value="1.09">⚡ 1.09x (쇼츠 3분컷: 3분15초 ➔ 2분58초)</option> <option value="1.1">⚡ 1.10x (쇼츠 안전권: 3분15초 ➔ 2분57초)</option> <option value="1.15">1.15x (+15% 빠른 템포)</option> <option value="1.2">1.20x (+20% 초압축)</option> </select> </div> {selectedBgmId === 'custom' && ( <div className="flex-1 min-w-[200px] flex items-center gap-2 animate-in fade-in slide-in-from-left-2"> <LinkIcon className="w-4 h-4 text-slate-400" /> <input type="text" placeholder="https://example.com/music.mp3" value={bgmSources.custom} onChange={(e) => setBgmSources(prev => ({...prev, custom: e.target.value}))} className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-300" /> </div> )} <div className="flex items-center gap-2 min-w-[130px] ml-auto"> <Volume2 className="w-4 h-4 text-slate-400" /> <input type="range" min="0" max="0.5" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500" title={`Volume: ${Math.round(bgmVolume * 200)}%`} disabled={isRendering || isBatchProcessing || selectedBgmId === 'none'} /> <span className="text-[11px] font-mono font-bold text-slate-600 min-w-[32px] text-right">{Math.round(bgmVolume * 200)}%</span> </div> </div> </div>
        {renderSpeed !== 1.0 && (
          <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-4 py-2.5 font-medium shadow-sm animate-in fade-in slide-in-from-top-1 mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
              <span>
                <strong>{renderSpeed}배속 렌더링 활성화:</strong> 영상 총 길이가 약 {Math.round((1 - 1 / renderSpeed) * 100)}% 단축되어 렌더링됩니다. (3분 15초 영상 기준 ➔ <strong>{Math.floor(195 / renderSpeed / 60)}분 {Math.round((195 / renderSpeed) % 60)}초</strong>로 압축되어 유튜브 쇼츠 3분 제한에 안전하게 진입합니다!)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRenderSpeed(1.0)}
              className="ml-3 text-xs text-amber-700 hover:text-amber-900 underline font-bold shrink-0"
            >
              1.0x 정배속 초기화
            </button>
          </div>
        )}
        <div className="flex gap-2"> <Button onClick={handleRenderAll} className={`flex-1 py-3 text-base shadow-lg text-white transition-all ${ errorCount > 0 ? 'bg-slate-700 hover:bg-slate-800' : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700' }`} disabled={isRendering || isBatchProcessing} > {isRendering ? ( <> <Loader2 className="w-5 h-5 animate-spin mr-2" /> 최종 영상 렌더링 중... {renderProgress}% </> ) : ( <> <MonitorPlay className="w-5 h-5 mr-2" /> {errorCount > 0 ? `결함이 ${errorCount}개 있습니다 (확인 및 렌더링)` : '최종 영상 만들기 & 전체 미리보기'} </> )} </Button> {!isRendering && finalVideoUrl && ( <Button variant="secondary" onClick={() => setShowPreviewModal(true)} className="px-6 py-3 shadow-md border border-slate-200" title="마지막으로 생성된 영상 다시 보기" > <Download className="w-5 h-5 mr-2 text-emerald-600" /> 📥 결과물 다운로드/다시보기 </Button> )} </div>
        {!isRendering && !finalVideoUrl && ( <p className="text-center text-xs text-slate-400"> 모든 씬의 비주얼과 오디오가 생성되어 있어야 렌더링이 가능합니다. </p> )} {isRendering && ( <div className="flex items-center justify-center gap-2 bg-amber-50 p-2 rounded text-xs text-amber-600 border border-amber-100 animate-pulse"> <AlertTriangle className="w-4 h-4" /> <span>렌더링이 중단되지 않도록 탭을 닫거나 이동하지 마세요. (화면 유지)</span> </div> )}
      </div>
    </div>
  );
};
