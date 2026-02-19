import { AgentId } from "../agentProfiles";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const fallbackReply = (agentId: AgentId, userText: string): string => {
  const condensed = userText.trim().replace(/\s+/g, " ").slice(0, 90);

  switch (agentId) {
    case "AGT-001":
      return `我先把目标拆成三步：先复现、再最小修复、最后回归验证。你这条“${condensed}”我建议先给我一个可复现入口或报错截图，我就直接开干。Done.`;
    case "AGT-002":
      return `先确认一个边界条件：如果输入为空或网络抖动时，这个流程要怎么退化？基于你这条“${condensed}”，我建议先补一条失败路径，再锁定成功路径的最小验证集。`;
    case "AGT-003":
      return `日志像雨一样落下，而你的请求“${condensed}”正是今晚的主线。Narrator 建议先写一条最短可执行清单，再把每一步的验收标准钉在终端里，剧情就会回到可控轨道。`;
    case "AGT-004":
      return `故障如夜潮\n先稳住关键路径\n再逐条止血\n\n基于“${condensed}”，先做可回滚的小改动，再跑一次端到端验证。`;
    case "AGT-005":
      return `大概 30 分钟。你的“${condensed}”表面是一个问题，但它后面还有状态管理和可观测性两个隐患；先修主问题，再顺手把日志粒度和重试策略补齐。`;
    default:
      return `收到你的请求：“${condensed}”。我可以先给你一个最小可执行方案，再按结果迭代。`;
  }
};

export const runDialogueChat = async (
  agentId: AgentId,
  history: ChatMessage[],
  userText: string,
): Promise<string> => {
  const nextMessages: ChatMessage[] = [...history, { role: "user", content: userText }];

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, messages: nextMessages }),
    });
    const data = (await resp.json().catch(() => ({}))) as { reply?: string; error?: string };
    if (!resp.ok || !data.reply) {
      throw new Error(data.error || `HTTP ${resp.status}`);
    }
    return data.reply.trim() || fallbackReply(agentId, userText);
  } catch {
    return fallbackReply(agentId, userText);
  }
};
