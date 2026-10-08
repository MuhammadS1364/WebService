import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  ChevronDown,
  Layers,
} from "lucide-react";
import { sendDeepSeekQuery, type ChatMessage } from "../lib/deepseekService";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "Category Bonding", query: "How does category bonding work for students in Anjuman e Huda?" },
  { label: "Content Submission", query: "How do I upload .docx, .tsx, or .pdf files, or paste content for a programme?" },
  { label: "Points System", query: "What are the points awarded for 1st, 2nd, 3rd positions, and Grades?" },
  { label: "Squad Teams", query: "How can students form a squad for group programmes?" },
];

export default function AISupportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<UIMessage[]>(() => {
    return [
      {
        id: "welcome-1",
        role: "assistant",
        content: `👋 **Welcome to Anjuman e Huda AI Support!**\n\nI am your intelligent assistant powered by DeepSeek AI. Ask me anything about:\n• **Category Bonding** (Bidaya, Ula, Thaniya, Aliya)\n• **Content Submissions** (uploading files or pasting text in Content_Table)\n• **Points & Results**\n• **Squad Registrations**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: UIMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== "welcome-1")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendDeepSeekQuery(userMsg.content, history);

      const assistantMsg: UIMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Sorry, I encountered an issue reaching the AI service. Please try asking again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: `Conversation restarted! How can I assist you with Anjuman e Huda portals or rules today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });

  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
      hasMoved: false,
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragRef.current.hasMoved = true;
    }
    const newX = Math.max(8, Math.min(window.innerWidth - 68, dragRef.current.initialX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - 85, dragRef.current.initialY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    if (!dragRef.current.hasMoved) {
      setIsOpen(true);
      setIsMinimized(false);
    }
    setTimeout(() => {
      dragRef.current.hasMoved = false;
    }, 100);
  };

  return (
    <>
      {/* Floating Trigger Button: Circle & Moveable on Small Devices */}
      {!isOpen && (
        <button
          type="button"
          style={{
            touchAction: "none",
            ...(position
              ? { left: `${position.x}px`, top: `${position.y}px`, right: "auto", bottom: "auto" }
              : undefined),
          }}
          onTouchStart={(e) => {
            if (e.touches[0]) {
              handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY, e.currentTarget)}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleDragMove(e.clientX, e.clientY);
          }}
          onMouseUp={handleDragEnd}
          onClick={(e) => {
            if (dragRef.current.hasMoved) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`fixed z-50 transition-shadow duration-200 cursor-grab active:cursor-grabbing select-none border-2 border-white/40 shadow-2xl ${
            position ? "" : "bottom-24 right-4 sm:bottom-6 sm:right-6"
          } max-sm:w-13 max-sm:h-13 max-sm:rounded-full max-sm:p-0 max-sm:flex max-sm:items-center max-sm:justify-center max-sm:bg-gradient-to-tr max-sm:from-emerald-600 max-sm:via-teal-600 max-sm:to-indigo-600 sm:flex sm:items-center sm:gap-2.5 sm:px-4 sm:py-3 sm:bg-gradient-to-r sm:from-emerald-600 sm:to-teal-700 sm:rounded-full sm:hover:scale-105 active:scale-95 text-white`}
          title="AI Support Assistant (Tap to open, drag to move anywhere on screen)"
          aria-label="AI Support"
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <Bot className="w-5 h-5 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-emerald-800" />
          </div>
          <span className="hidden sm:inline text-xs font-black tracking-wide pr-1 pointer-events-none">AI Support</span>
          <span className="hidden sm:inline text-[10px] uppercase font-bold bg-white/20 px-1.5 py-0.5 rounded-full pointer-events-none">DeepSeek</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl ${
            isMinimized
              ? "bottom-6 right-6 w-72 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-between px-4"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[430px] h-[600px] max-h-[85vh] bg-white rounded-3xl border border-slate-200/90 flex flex-col overflow-hidden"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">Anjuman AI Support</h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                    DeepSeek
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/80 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online • Portal Knowledge Base
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                  title="Reset Conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body (if not minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} group`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                          isUser
                            ? "bg-teal-600 text-white rounded-br-xs font-medium"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {/* Render simple markdown bolding and line breaks */}
                        <div className="whitespace-pre-wrap break-words space-y-1">
                          {msg.content.split("\n").map((line, idx) => {
                            if (!line.trim()) return <div key={idx} className="h-1" />;
                            // Simple bold formatting
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                              <p key={idx}>
                                {parts.map((p, i) => {
                                  if (p.startsWith("**") && p.endsWith("**")) {
                                    return <strong key={i} className="font-bold text-slate-950">{p.slice(2, -2)}</strong>;
                                  }
                                  return p;
                                })}
                              </p>
                            );
                          })}
                        </div>
                      </div>

                      {/* Message Meta & Copy */}
                      <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="opacity-0 group-hover:opacity-100 transition p-0.5 hover:text-slate-700"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                        <span className="ml-1 text-[11px] font-semibold text-teal-700">DeepSeek thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              {messages.length <= 3 && (
                <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Suggested:
                  </span>
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(qp.query)}
                      className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-slate-200 text-[11px] font-semibold text-slate-700 rounded-lg transition cursor-pointer"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Anjuman AI about rules, submissions..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 text-white rounded-xl shadow-xs transition cursor-pointer shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5" /> Category Bonding & Content Assistant
                  </span>
                  <span>DeepSeek API Sk-***</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
