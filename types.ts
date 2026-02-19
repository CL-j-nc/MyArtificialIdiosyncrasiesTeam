
export enum WorkflowType {
  DIAGNOSE = 'DIAGNOSE',
  CODE_GEN = 'CODE_GEN',
  FIX_BUG = 'FIX_BUG',
  FULL_CHECK = 'FULL_CHECK',
  SMART_ROUTE = 'SMART_ROUTE',
  GITHUB_PR = 'GITHUB_PR',
  DEPLOY_CF = 'DEPLOY_CF',
  LEARN_SKILL = 'LEARN_SKILL',
  SELF_DIAGNOSE = 'SELF_DIAGNOSE',
  CHAT = 'CHAT',
  LIVE_VOICE = 'LIVE_VOICE',
  TRANSCRIPTION = 'TRANSCRIPTION',
  VISION = 'VISION',
  THINKING = 'THINKING',
  TTS = 'TTS'
}

export enum ModelProvider {
  GEMINI = 'Gemini',
  GROQ = 'Groq',
  OLLAMA = 'Ollama',
  GPT4O = 'GPT-4o'
}

export enum AppTheme {
  CYBERPUNK = 'CYBERPUNK',
  CLASSIC = 'CLASSIC',
  RENAISSANCE = 'RENAISSANCE',
  OIL_PAINTING = 'OIL_PAINTING',
  REALISTIC = 'REALISTIC'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: ModelProvider | 'System';
  message: string;
  type: 'info' | 'success' | 'error' | 'thinking';
}

export interface WorkflowState {
  isRunning: boolean;
  currentStage: string;
  logs: LogEntry[];
  result: string | null;
  isGlitched?: boolean;
}

export interface BotProfile {
  id: string;
  name: string;
  platform: 'telegram' | 'whatsapp' | 'wechat';
  botToken: string;
  chatId: string;
  isActive: boolean;
  isPolling: boolean;
  lastError?: string;
}

export interface Interaction {
  timestamp: string;
  workflow: string;
  input: string;
  output: string;
}

export interface UserPersona {
  languageStyle: string;
  codingPreferences: string[];
  industryContext: string;
  knownTools: string[];
  longTermGoals: string[];
}

export interface MemoryStore {
  persona: UserPersona;
  interactionCount: number;
  lastUpdate: string;
  learnedFacts: string[];
  history: Interaction[];
}

export interface AgentStyle {
  id: string;
  color: string;
  shape: 'sphere' | 'box' | 'octahedron' | 'dodecahedron';
  hasBody: boolean;
  hasArms: boolean;
  faceType: 'visor' | 'monitor' | 'texture' | 'human';
  skinTone?: string;
  hairColor?: string;
  textureUrl?: string; 
}

export interface TelegramEvent {
  id: string;
  type: 'message' | 'log';
  botId: string;
  payload: any;
}
