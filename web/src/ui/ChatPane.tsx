import { useState, useCallback, useRef, useEffect } from "react";
import type { GraphIR, TaxonomyTemplate, ConceptMapData } from "../types/graph-ir";
import type { LLMConfig, ChatMessage } from "../types/llm";
import { useLLM } from "../llm/LLMContext";
import { sendLLMMessage, makeRequestId } from "../llm/provider";
import { buildChatSystemPrompt } from "../llm/prompts";
import { dataFromGraphIR } from "../migration";

interface Props {
  graphData: GraphIR;
  template: TaxonomyTemplate;
  isNativeApp: boolean;
  sendToSwift: (handler: string, payload?: unknown) => void;
}

export function ChatPane({ graphData, template, isNativeApp, sendToSwift }: Props) {
  const { config } = useLLM();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !config?.llm || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const cmData: ConceptMapData = dataFromGraphIR(graphData, "");
      const systemPrompt = buildChatSystemPrompt(cmData, template);

      const response = await sendLLMMessage(
        config.llm as LLMConfig,
        {
          messages: updatedMessages,
          systemPrompt,
          requestId: makeRequestId(),
        },
        { isNativeApp, sendToSwift },
      );

      const assistantMsg: ChatMessage = { role: "assistant", content: response, timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, config, messages, graphData, template, isNativeApp, sendToSwift, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-pane">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            Ask questions about your concept map. The LLM has full context of your nodes and relationships.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-loading">Thinking...</div>
          </div>
        )}
      </div>
      <div className="chat-input-area">
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your concept map..."
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
    </div>
  );
}
