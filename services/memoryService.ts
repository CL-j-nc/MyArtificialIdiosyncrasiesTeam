
import { GoogleGenAI } from "@google/genai";
import { MemoryStore, UserPersona, Interaction } from "../types";

const STORAGE_KEY = 'core_orchestrator_memory_v4.0_cn';

const DEFAULT_PERSONA: UserPersona = {
  languageStyle: "精确、注重代理能动性、年轻化的数字精神。请始终使用中文回复。",
  codingPreferences: ["TypeScript", "React", "Rust", "TailwindCSS"],
  industryContext: "通用人工智能与系统编排",
  knownTools: ["git", "docker", "npm", "telegram-api", "gemini-api"],
  longTermGoals: ["统一智能", "自主问题解决", "系统弹性"]
};

const DEFAULT_MEMORY: MemoryStore = {
  persona: DEFAULT_PERSONA,
  interactionCount: 0,
  lastUpdate: new Date().toISOString(),
  learnedFacts: [
    "系统 Root 已初始化为 CORE AI 编排器。",
    "Telegram Bot 上行链路能力已上线。",
    "多智能体团队当前包含 5 位拟人化成员：Finisher、Edge Lord、Narrator、Haiku、Rabbit Hole。"
  ],
  history: []
};

export class MemoryService {
  private static instance: MemoryService;
  private memory: MemoryStore;
  private ai: GoogleGenAI;

  private constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.memory = this.loadMemory();
  }

  public static getInstance(apiKey?: string): MemoryService {
    if (!MemoryService.instance) {
      if (!apiKey) {
        apiKey = process.env.API_KEY || "";
      }
      MemoryService.instance = new MemoryService(apiKey);
    }
    return MemoryService.instance;
  }

  private loadMemory(): MemoryStore {
    if (typeof window === 'undefined') return DEFAULT_MEMORY;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_MEMORY,
          ...parsed,
          persona: { ...DEFAULT_PERSONA, ...parsed.persona },
          history: parsed.history || []
        };
      } catch (e) {
        console.error("记忆读取错误，重置为默认值。", e);
        return DEFAULT_MEMORY;
      }
    }
    return DEFAULT_MEMORY;
  }

  public saveMemory(): void {
    if (typeof window === 'undefined') return;
    this.memory.lastUpdate = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
  }

  public compileSystemPrompt(): string {
    const p = this.memory.persona;
    // Get last 10 interactions for deeper context
    const historySummary = this.memory.history
      .slice(-10)
      .map(h => `[${h.timestamp}] 工作流: ${h.workflow} | 输入: ${h.input.slice(0, 50)}... | 输出: ${h.output.slice(0, 150)}...`)
      .join('\n');

    return `
[上下文注入]
你是 AI 编排团队中的专业代理。请始终使用**中文**进行交流。
人物设定: ${p.languageStyle}
当前焦点: ${p.industryContext}
技术栈: ${p.codingPreferences.join(', ')}

[已获取知识]
${this.memory.learnedFacts.map(f => `- ${f}`).join('\n')}

[结果账本]
${historySummary || "账本目前为空。请初始化第一个任务。"}

当前交互计数: ${this.memory.interactionCount}
保持高能的技术精确度。参考“结果账本”以查看你或其他代理之前所做的工作，以保持完美的连续性。
    `.trim();
  }

  public getMemoryStats(): string {
    return `${this.memory.learnedFacts.length} 节点 / ${this.memory.interactionCount} 次交互 / ${this.memory.history.length} 条账本记录`;
  }

  public getPersona(): UserPersona {
    return this.memory.persona;
  }

  public async consolidateMemory(userPrompt: string, aiResponse: string, workflowName: string = "Manual", addLog?: any): Promise<void> {
    try {
      this.memory.interactionCount++;
      
      const interaction: Interaction = {
        timestamp: new Date().toLocaleTimeString(),
        workflow: workflowName,
        input: userPrompt,
        output: aiResponse
      };
      
      this.memory.history.push(interaction);
      if (this.memory.history.length > 50) this.memory.history.shift();

      // Extract new facts using Gemini
      const analysisPrompt = `
        分析此交互:
        工作流: "${workflowName}"
        用户输入: "${userPrompt.slice(0, 500)}"
        AI 响应: "${aiResponse.slice(0, 800)}"
        
        提取 1-3 个新建立的关键事实或系统状态。
        如果焦点已转移，请更新 industryContext。
        仅返回有效的 JSON: {"newFacts": ["string"], "personaUpdates": {"industryContext": "string"}}
      `;

      const result = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: analysisPrompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(result.text || "{}");

      if (data.newFacts && Array.isArray(data.newFacts)) {
        data.newFacts.forEach((f: string) => {
          if (!this.memory.learnedFacts.includes(f) && f.length > 5) {
            this.memory.learnedFacts.push(f);
            if (addLog) addLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'System', message: `知识已同步: ${f}`, type: 'success' });
          }
        });
      }

      if (data.personaUpdates?.industryContext) {
        this.memory.persona.industryContext = data.personaUpdates.industryContext;
      }

      this.saveMemory();
    } catch (e) {
      console.warn("记忆整合跳过。", e);
      this.saveMemory();
    }
  }
}
