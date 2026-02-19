import { AgentStyle, ModelProvider } from './types';

export type AgentId = 'AGT-001' | 'AGT-002' | 'AGT-003' | 'AGT-004' | 'AGT-005';

export interface AgentProfile {
  id: AgentId;
  codename: string;
  displayName: string;
  role: string;
  quirk: string;
  modelHint?: ModelProvider;
  scenePosition: [number, number, number];
  scale: number;
  delayIndex: number;
  defaultStyle: Omit<AgentStyle, 'id'>;
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'AGT-001',
    codename: 'Finisher',
    displayName: '林终',
    role: '任务执行负责人',
    quirk: '无论任务多复杂都先说“Done.”，然后再补细节。',
    modelHint: ModelProvider.GEMINI,
    scenePosition: [0, 0.45, 1.8],
    scale: 1.18,
    delayIndex: 1,
    defaultStyle: {
      color: '#3b82f6',
      shape: 'sphere',
      hasBody: true,
      hasArms: true,
      faceType: 'human',
      skinTone: '#f1c7a8',
      hairColor: '#1f2937'
    }
  },
  {
    id: 'AGT-002',
    codename: 'Edge Lord',
    displayName: '岑界',
    role: '质量与边界条件专家',
    quirk: '习惯追问“如果输入是极端情况呢？”',
    modelHint: ModelProvider.GROQ,
    scenePosition: [-3.0, 0.36, 0.0],
    scale: 1.02,
    delayIndex: 0,
    defaultStyle: {
      color: '#f59e0b',
      shape: 'box',
      hasBody: true,
      hasArms: true,
      faceType: 'human',
      skinTone: '#f4ccaf',
      hairColor: '#4b5563'
    }
  },
  {
    id: 'AGT-003',
    codename: 'Narrator',
    displayName: '黎述',
    role: '文档与沟通负责人',
    quirk: '把普通日志写得像电影旁白。',
    modelHint: ModelProvider.OLLAMA,
    scenePosition: [3.0, 0.36, 0.0],
    scale: 1.02,
    delayIndex: 2,
    defaultStyle: {
      color: '#ec4899',
      shape: 'dodecahedron',
      hasBody: true,
      hasArms: true,
      faceType: 'human',
      skinTone: '#f0c9a6',
      hairColor: '#111827'
    }
  },
  {
    id: 'AGT-004',
    codename: 'Haiku',
    displayName: '穗诗',
    role: '事故响应专员',
    quirk: '系统压力高时会切换成三行短诗总结风险。',
    modelHint: ModelProvider.GPT4O,
    scenePosition: [-1.2, 0.28, -1.6],
    scale: 0.9,
    delayIndex: 3,
    defaultStyle: {
      color: '#10b981',
      shape: 'octahedron',
      hasBody: true,
      hasArms: true,
      faceType: 'human',
      skinTone: '#eec09d',
      hairColor: '#2f2b5f'
    }
  },
  {
    id: 'AGT-005',
    codename: 'Rabbit Hole',
    displayName: '沈井',
    role: '研究与架构设计师',
    quirk: '估时永远“30分钟”，实际跨度很大。',
    scenePosition: [1.2, 0.28, -1.6],
    scale: 0.92,
    delayIndex: 4,
    defaultStyle: {
      color: '#8b5cf6',
      shape: 'sphere',
      hasBody: true,
      hasArms: true,
      faceType: 'human',
      skinTone: '#e9bc99',
      hairColor: '#312e81'
    }
  }
];

export const DEFAULT_AGENT_ID: AgentId = 'AGT-001';

export const MODEL_TO_AGENT_ID: Record<ModelProvider, AgentId> = {
  [ModelProvider.GEMINI]: 'AGT-001',
  [ModelProvider.GROQ]: 'AGT-002',
  [ModelProvider.OLLAMA]: 'AGT-003',
  [ModelProvider.GPT4O]: 'AGT-004'
};

export const AGENT_PROFILE_BY_ID: Record<AgentId, AgentProfile> = AGENT_PROFILES.reduce(
  (acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  },
  {} as Record<AgentId, AgentProfile>
);

export const isAgentId = (value?: string): value is AgentId =>
  !!value && AGENT_PROFILES.some(profile => profile.id === value);
