import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, AIModel, User } from "../types";
import { chatWithQuizForge, getChatConversations, getChatMessages, createChatConversation, saveChatMessage, deleteChatConversation } from "../api";
import MarkdownRenderer from "./MarkdownRenderer";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  files: File[];
  chatHistory: ChatMessage[];
  setChatHistory: (h: ChatMessage[]) => void;
  onBack: () => void;
  aiModel: AIModel;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  user?: User | null;
}

export default function ChatView({ files, chatHistory, setChatHistory, onBack, aiModel, onNotify, user }: Props) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const result = await getChatConversations();
      if (result.ok) setConversations(result.conversations);
    } catch {} finally { setLoadingConversations(false); }
  };

  const handleNewChat = async () => {
    setChatHistory([]);
    setActiveConversationId(null);
    setShowSidebar(false);
    inputRef.current?.focus();
  };

  const handleLoadConversation = async (conv: Conversation) => {
    try {
      const result = await getChatMessages(conv.id);
      if (result.ok) {
        const messages: ChatMessage[] = result.messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }));
        setChatHistory(messages);
        setActiveConversationId(conv.id);
        setShowSidebar(false);
      }
    } catch {
      onNotify("Failed to load conversation", "error");
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await deleteChatConversation(convId);
      setConversations(conversations.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setChatHistory([]);
        setActiveConversationId(null);
      }
      onNotify("Conversation deleted", "info");
    } catch {
      onNotify("Failed to delete conversation", "error");
    }
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || isTyping) return;

    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput("");
    setIsTyping(true);

    let convId = activeConversationId;
    if (!convId && user) {
      try {
        const convResult = await createChatConversation(msg.substring(0, 100));
        if (convResult.ok) {
          convId = convResult.conversation.id;
          setActiveConversationId(convId);
          setConversations(prev => [convResult.conversation, ...prev]);
        }
      } catch {}
    }

    if (convId && user) {
      saveChatMessage(convId, "user", msg).catch(() => {});
    }

    try {
      const result = await chatWithQuizForge({
        files, message: msg,
        history: newHistory.map((m) => ({ role: m.role, content: m.content })),
        aiModel,
      });
      if (result.ok) {
        const assistantMsg: ChatMessage = { role: "assistant", content: result.reply, timestamp: Date.now() };
        setChatHistory([...newHistory, assistantMsg]);
        if (convId && user) {
          saveChatMessage(convId, "assistant", result.reply).catch(() => {});
        }
      } else {
        onNotify(result.error || "Failed to get response", "error");
        setChatHistory([...newHistory, { role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
      }
    } catch {
      const modelName = aiModel === "gemini" ? "Google Gemini" : "Grok";
      onNotify(`Failed to establish a chat to ${modelName}`, "error");
      setChatHistory([...newHistory, { role: "assistant", content: "Connection error. Please check your network and try again.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const modelLabel = aiModel === "gemini" ? "Gemini" : "Grok";

  return (
    <div className={`chat-view page-transition ${maximized ? "chat-maximized" : ""}`}>
      {showSidebar && (
        <div className="chat-sidebar-overlay" onClick={() => setShowSidebar(false)}>
          <div className="chat-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="chat-sidebar-header">
              <h3>Conversations</h3>
              <button className="chat-sidebar-close" onClick={() => setShowSidebar(false)}>✕</button>
            </div>
            <button className="chat-new-btn btn-primary btn-sm btn-ripple" onClick={handleNewChat}>
              <span>+</span> New Chat
            </button>
            {loadingConversations ? (
              <div className="chat-sidebar-loading"><div className="spinner" style={{width:24,height:24}}></div></div>
            ) : conversations.length === 0 ? (
              <div className="chat-sidebar-empty">
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="chat-sidebar-list">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`chat-sidebar-item ${activeConversationId === conv.id ? "active" : ""}`}
                    onClick={() => handleLoadConversation(conv)}
                  >
                    <div className="chat-sidebar-item-info">
                      <span className="chat-sidebar-item-title">{conv.title}</span>
                      <span className="chat-sidebar-item-date">{new Date(conv.updated_at).toLocaleDateString()}</span>
                    </div>
                    <button className="chat-sidebar-item-delete" onClick={(e) => handleDeleteConversation(e, conv.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="chat-header">
        <div className="chat-header-info">
          <button className="chat-menu-btn" onClick={() => setShowSidebar(true)} title="Chat history">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div className="chat-avatar pulse-dot"><span>⚡</span></div>
          <div>
            <h3>QuizForge AI <span className="chat-model-badge">{modelLabel}</span></h3>
            <span className="chat-status">{isTyping ? "Typing..." : "Online"}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-new-chat-btn" onClick={handleNewChat} title="New chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button className="chat-size-btn" onClick={() => setMaximized(!maximized)} title={maximized ? "Minimize" : "Maximize"}>
            {maximized ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {chatHistory.length === 0 && (
          <div className="chat-welcome slide-in">
            <div className="chat-welcome-avatar"></div>
            <h3>Hi! I'm QuizForge AI</h3>
            <p>Ask me anything about your uploaded materials. I can explain concepts, answer questions, and help you study!</p>
            {files.length === 0 && (
              <p className="chat-no-files-note">No files uploaded - I can still help with general questions!</p>
            )}
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role} message-slide-in`}>
            {msg.role === "assistant" && <div className="message-avatar"><span>⚡</span></div>}
            <div className="message-bubble">
              {msg.role === "assistant" ? <MarkdownRenderer content={msg.content} className="chat-md" /> : <p>{msg.content}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message assistant message-slide-in">
            <div className="message-avatar"><span>⚡</span></div>
            <div className="message-bubble typing-bubble">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input ref={inputRef} type="text" className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask a question..." disabled={isTyping} />
        <button className="chat-send-btn btn-ripple" onClick={sendMessage} disabled={!input.trim() || isTyping}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </div>
    </div>
  );
}
