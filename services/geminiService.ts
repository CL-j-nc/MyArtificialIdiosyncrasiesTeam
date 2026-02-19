import { LogEntry, ModelProvider, WorkflowType } from "../types";
import { MemoryService } from "./memoryService";
import { checkOllamaHealth, getOllamaVisionModel, ollamaChat } from "./ollamaClient";

const getMemory = () => MemoryService.getInstance();

const formatLog = (
  source: ModelProvider | 'System',
  message: string,
  type: LogEntry['type'] = 'info'
): LogEntry => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toLocaleTimeString(),
  source,
  message,
  type,
});

const buildMessages = (systemPrompt: string, userPrompt: string) => [
  {
    role: 'system' as const,
    content: `${systemPrompt}\n\n你正在通过 Ollama 本地模型协助用户，请保持中文、准确、可执行。`,
  },
  { role: 'user' as const, content: userPrompt },
];

const runTextWorkflow = async (
  userPrompt: string,
  workflow: WorkflowType,
  addLog: (log: LogEntry) => void,
  thinkingMessage: string,
  options?: { numCtx?: number; temperature?: number }
): Promise<string> => {
  const memory = getMemory();
  addLog(formatLog(ModelProvider.OLLAMA, thinkingMessage, "thinking"));

  const responseText = await ollamaChat(
    buildMessages(memory.compileSystemPrompt(), userPrompt),
    { numCtx: options?.numCtx, temperature: options?.temperature }
  );

  const res = responseText || "模型未返回结果。";
  await memory.consolidateMemory(userPrompt, res, workflow, addLog);
  return res;
};

export const checkApiHealth = async (): Promise<boolean> => {
  const ollamaHealthy = await checkOllamaHealth();
  if (ollamaHealthy) return true;

  try {
    const resp = await fetch('/api/chat', { method: 'OPTIONS' });
    return resp.ok;
  } catch {
    return false;
  }
};

export const runThinkingWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(
    `请进行更深层推理，明确列出关键假设、风险与最终建议。\n\n任务：${prompt}`,
    WorkflowType.THINKING,
    addLog,
    "正在使用 Ollama 深度推理模式...",
    { numCtx: 32768, temperature: 0.4 }
  );

export const runTranscriptionWorkflow = async (
  _audioBase64: string,
  _mimeType: string,
  addLog: (log: LogEntry) => void
): Promise<string> => {
  addLog(formatLog(ModelProvider.OLLAMA, "当前 Ollama 接入未启用音频转写模型。", "error"));
  return "当前 Ollama 接入仅支持文本与图片推理，暂不支持音频转写。";
};

export const runVisionWorkflow = async (
  mediaBase64: string,
  mimeType: string,
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> => {
  const memory = getMemory();
  addLog(
    formatLog(
      ModelProvider.OLLAMA,
      `正在通过 Ollama 视觉模型分析 ${mimeType.startsWith('video') ? '视频' : '图像'}...`,
      "thinking"
    )
  );

  if (mimeType.startsWith('video')) {
    return "当前 Ollama 视觉接入仅支持静态图片。请先截取关键帧后再上传分析。";
  }
  if (!mimeType.startsWith('image/')) {
    return "暂不支持该媒体类型，请上传图片。";
  }

  const userPrompt = prompt || "分析此图片中的关键技术信息、异常点和建议。请用中文回答。";
  const responseText = await ollamaChat(
    [
      {
        role: 'system',
        content: `${memory.compileSystemPrompt()}\n\n你是图片分析助手，需基于图像给出结构化结论。`,
      },
      {
        role: 'user',
        content: userPrompt,
        images: [mediaBase64],
      },
    ],
    { model: getOllamaVisionModel(), numCtx: 12288 }
  );

  const res = responseText || "视觉分析失败。";
  await memory.consolidateMemory("媒体分析", res, WorkflowType.VISION, addLog);
  return res;
};

export const runDiagnoseWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.DIAGNOSE, addLog, "正在运行系统诊断...");

export const runCodeGenWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.CODE_GEN, addLog, "正在生成技术实现方案...");

export const runSmartRoute = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.SMART_ROUTE, addLog, "正在通过智能引擎路由请求...");

export const runGithubWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.GITHUB_PR, addLog, "正在分析仓库状态和 PR 增量...");

export const runCloudflareWorkflow = async (
  env: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(
    `规划 Cloudflare Workers/Pages 部署方案，目标环境: ${env}。请给出最小可执行步骤。`,
    WorkflowType.DEPLOY_CF,
    addLog,
    `正在准备部署环境: ${env}...`
  );

export const runSkillLearningWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.LEARN_SKILL, addLog, "正在将知识模式摄入向量空间...");

export const runSelfDiagnoseWorkflow = async (
  prompt: string,
  addLog: (log: LogEntry) => void
): Promise<string> =>
  runTextWorkflow(prompt, WorkflowType.SELF_DIAGNOSE, addLog, "正在运行核心完整性自检...");

export const runTTSWorkflow = async (
  _text: string,
  addLog: (log: LogEntry) => void
): Promise<Uint8Array> => {
  addLog(formatLog(ModelProvider.OLLAMA, "当前 Ollama 接入未启用 TTS 模型。", "error"));
  throw new Error("Ollama 当前不支持内置 TTS 音频输出，请接入独立 TTS 服务。");
};
