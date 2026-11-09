
export type ChannelTheme = 'economy' | 'education' | 'psychology';

export interface ScriptFormData {
  topic: string;
  audience: string;
  length: number; // in minutes
  materials: string;
  useAiResearch: boolean;
  scriptMode: 'critic' | 'success' | 'insight' | 'writers-room'; 
  channelTheme: ChannelTheme; // New field
  isDialogue?: boolean; // New: Toggle for multi-speaker dialogue
}

export interface Source {
  title: string;
  uri: string;
}

export interface FactCheckReport {
  status: 'verified' | 'improved';
  editorCritique: string;
  verifiedFacts: string[];
  correctedPoints: string[];
  checkedAt?: string;
  groundedSources?: Source[];
}

export interface GeneratedScript {
  title: string;
  content: string; // Markdown content
}

export interface TopicItem {
  title: string;
  duration: number; // Recommended duration in minutes
  reason?: string; // Short reason for the duration/topic
  mode?: 'critic' | 'success' | 'insight' | 'writers-room'; // Recommended script mode
}

export interface TopicSuggestion {
  category: string;
  topics: TopicItem[];
}

export type ImageStyle = 
  | 'math-blackboard'
  | 'hyper-realism-3d'
  | 'modern-abstract-gradient'
  | 'minimal-glassmorphism'
  | 'y2k-retro-pop'
  | 'dark-academia'
  | 'lofi-anime'
  | 'surreal-collage'
  | 'cinematic-realism'
  | 'flat-vector'
  | 'stick-figure'
  | 'mind-exodus'
  | 'realistic';

export type CameraMotion = 'auto' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';

export type AudioTone = 'neutral' | 'excited' | 'serious' | 'concerned' | 'calm' | 'dramatic';

export type AspectRatio = '16:9' | '9:16';

export type AvatarPosition = 'left' | 'right';

/* Subtitle style keys for rendering */
export type SubtitleStyle = 'standard' | 'highlight' | 'cinematic' | 'clean' | 'handwritten';

/* Mode for generating visuals */
export type GenerationMode = 'image' | 'video';

/* Target video resolution */
export type VideoResolution = '720p' | '1080p';

/* Filter for assets view */
export type ViewFilter = 'all' | 'error';

export interface VideoAsset {
  id: string;
  visualPrompt: string; // New: Unified visual prompt for both image and video
  imagePrompt?: string; // Legacy: Image generation prompt
  videoPrompt?: string; // Legacy: Video generation prompt
  prompt: string; // Legacy: Visual prompt (legacy)
  narration: string; // Narration text
  overlayText?: string; // Text burned into the video/image (Title/Emphasis)
  status: 'idle' | 'generating' | 'completed' | 'error';
  assetType: 'video' | 'image';
  imageStyle?: ImageStyle; // Style used for generation
  cameraMotion?: CameraMotion; // Camera movement for static images
  recommendedType?: 'video' | 'image'; // New field for AI recommendation
  url?: string; // Visual URL
  originalImageUrl?: string; // Backup of the original image if converted to video
  audioUrl?: string; // TTS Audio URL
  audioStatus?: 'idle' | 'generating' | 'completed' | 'error';
  voiceName?: string; // Selected voice name
  audioTone?: AudioTone; // Selected emotion/tone for TTS
  error?: string;
  muteVideo?: boolean;
}

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  pinnedComment?: string; // New: Engagement booster
}

export interface ThumbnailConcept {
  id: string;
  concept: 'aggro' | 'info' | 'emotion'; // 어그로형, 정보형, 감성형
  titleText: string;
  subtitleText: string;
  visualPrompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export interface MarketingKit {
  titles: string[]; // 5 titles
  description: string;
  tags: string[];
  pinnedComment: string;
  thumbnails: ThumbnailConcept[];
}
