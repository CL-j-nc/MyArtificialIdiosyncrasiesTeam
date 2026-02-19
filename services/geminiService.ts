
import { GoogleGenAI, Modality } from "@google/genai";
import { LogEntry, ModelProvider, WorkflowType } from "../types";
import { MemoryService } from "./memoryService";

const getApiKey = (): string => {
  const key = process?.env?.API_KEY;
  if (!key) {
    console.error("Critical: API_KEY is missing in process.env.");
  }
  return key || "";
};

const getMemory = () => MemoryService.getInstance(getApiKey());

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("未配置 API Key。系统无法初始化。");
  return new GoogleGenAI({ apiKey });
};

const formatLog = (source: ModelProvider | 'System', message: string, type: LogEntry['type'] = 'info'): LogEntry => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toLocaleTimeString(),
  source,
  message,
  type,
});

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const ai = getAiClient();
    // Use the fastest/cheapest model for a simple heartbeat check
    await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: 'ping',
    });
    return true;
  } catch (error) {
    console.warn("API 健康检查失败:", error);
    return false;
  }
};

export const runThinkingWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  const systemPrompt = memory.compileSystemPrompt();

  addLog(formatLog(ModelProvider.GEMINI, "正在分配 32k 思考预算进行复杂推理...", "thinking"));
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingBudget: 32768 },
    },
  });

  const res = response.text || "思考过程未产生结果。";
  await memory.consolidateMemory(prompt, res, WorkflowType.THINKING, addLog);
  return res;
};

export const runTranscriptionWorkflow = async (
  audioBase64: string,
  mimeType: string,
  addLog: (log: LogEntry) => void
): Promise<string> => {
  const ai = getAiClient();
  addLog(formatLog(ModelProvider.GEMINI, "正在使用 Gemini 3 Flash 处理音频流...", "thinking"));
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: "精准转录此音频。仅返回转录文本（中文优先）。" }
        ]
      }
    ]
  });

  return response.text || "转录失败。";
};

export const runVisionWorkflow = async (
  mediaBase64: string,
  mimeType: string,
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, `正在分析 ${mimeType.startsWith('video') ? '视频' : '图像'} 数据...`, "thinking"));
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: mediaBase64, mimeType } },
          { text: prompt || "分析此媒体的关键技术信息和状态细节。请用中文回答。" }
        ]
      }
    ],
    config: { systemInstruction: memory.compileSystemPrompt() }
  });

  const res = response.text || "视觉分析失败。";
  await memory.consolidateMemory("媒体分析", res, WorkflowType.VISION, addLog);
  return res;
};

export const runDiagnoseWorkflow = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在运行系统诊断...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "诊断失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.DIAGNOSE, addLog);
  return res;
};

export const runCodeGenWorkflow = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在生成技术实现方案...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "代码生成失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.CODE_GEN, addLog);
  return res;
};

export const runSmartRoute = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在通过智能引擎路由请求...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "路由失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.SMART_ROUTE, addLog);
  return res;
};

export const runGithubWorkflow = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在分析仓库状态和 PR 增量...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "GitHub 工作流失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.GITHUB_PR, addLog);
  return res;
};

export const runCloudflareWorkflow = async (env: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, `正在准备部署环境: ${env}...`, "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `规划 Cloudflare Workers 部署方案，目标环境: ${env}。请用中文回答。`,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "部署模拟失败。";
  await memory.consolidateMemory(`部署至 ${env}`, res, WorkflowType.DEPLOY_CF, addLog);
  return res;
};

export const runSkillLearningWorkflow = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在将知识模式摄入向量空间...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "技能摄入失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.LEARN_SKILL, addLog);
  return res;
};

export const runSelfDiagnoseWorkflow = async (prompt: string, addLog: (log: LogEntry) => void): Promise<string> => {
  const ai = getAiClient();
  const memory = getMemory();
  addLog(formatLog(ModelProvider.GEMINI, "正在运行核心完整性自检...", "thinking"));
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: memory.compileSystemPrompt() }
  });
  const res = response.text || "自检失败。";
  await memory.consolidateMemory(prompt, res, WorkflowType.SELF_DIAGNOSE, addLog);
  return res;
};

export const runTTSWorkflow = async (
  text: string,
  addLog: (log: LogEntry) => void
): Promise<Uint8Array> => {
  const ai = getAiClient();
  addLog(formatLog(ModelProvider.GEMINI, "正在合成语音响应 (Gemini TTS)...", "thinking"));
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `请清晰地用中文朗读: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS 生成失败");
  
  return decodeBase64(base64Audio);
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
