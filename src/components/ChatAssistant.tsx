import React, { useState, useEffect, useRef } from "react";
import { useSessionId } from "@/hooks/useSessionId";
import { useAuth } from "@/hooks/useAuth";
import { Bot, X, Send } from "lucide-react";

const TOOLTIP_STORAGE_KEY = "chatAssistant_tooltipShown";

const ChatAssistant = () => {
  const sessionId = useSessionId();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { from: "user" | "assistant" | "system"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 🔹 Tooltip logic
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      return;
    }

    const hasSeenTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);

    if (!hasSeenTooltip) {
      // First visit - show immediately
      setShowTooltip(true);
      localStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
      
      // Auto-hide after 3 seconds
      const hideTimer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(hideTimer);
    } else {
      // Returning visit - show after 3-5 seconds delay
      const delay = 3000 + Math.random() * 2000; // 3-5 seconds
      const showTimer = setTimeout(() => {
        setShowTooltip(true);
        // Auto-hide after 3 seconds
        const hideTimer = setTimeout(() => setShowTooltip(false), 3000);
        return () => clearTimeout(hideTimer);
      }, delay);
      return () => clearTimeout(showTimer);
    }
  }, [isOpen]);

  const handleTooltipClick = () => {
    setShowTooltip(false);
    setIsOpen(true);
  };

  // 🔹 Scroll automático
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // 🔹 Enviar mensagem
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user" as const, text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const payload = {
      message: input,
      sessionId,
      user: currentUser
        ? {
            uid: currentUser.uid,
            name: currentUser.displayName || "Usuário",
            email: currentUser.email || "sem-email",
          }
        : {
            uid: "anon-" + sessionId.slice(0, 8),
            name: "Visitante",
            email: null,
          },
    };

    try {
      const response = await fetch(
        "https://n8n-n8n-start.yh11mi.easypanel.host/webhook/chatassistant",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      const output = Array.isArray(data)
        ? data[0]?.output || data[0]?.reply
        : data.output || data.reply;

      if (output) {
        setMessages((prev) => [...prev, { from: "assistant", text: output }]);
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (err) {
      console.error("⚠️ Erro:", err);
      setMessages((prev) => [
        ...prev,
        { from: "system", text: "Erro ao conectar. Tente novamente." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // 🔹 Mensagem inicial automática
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          from: "assistant",
          text: "Olá 👋! Sou o atendente virtual da Pizzaria Oliveira ! Posso te ajudar com informações ou acompanhar seu pedido 😊",
        },
      ]);
    }
  }, [isOpen]);

  return (
    <>
      {/* 🔹 Botão flutuante com tooltip */}
      <div className="fixed bottom-4 left-6 z-50" style={{ transform: "translateY(-10px)" }}>
        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div
            onClick={handleTooltipClick}
            className="absolute bottom-full left-0 mb-2 cursor-pointer animate-fade-in"
          >
            <div className="bg-primary text-white text-sm px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
              Acompanhe seu pedido por aqui 🤖
            </div>
            {/* Arrow */}
            <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-primary transform rotate-45" />
          </div>
        )}
        
        <button
          onClick={() => {
            setShowTooltip(false);
            setIsOpen(true);
          }}
          className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition flex items-center justify-center"
          title="Atendente Virtual"
        >
          <Bot size={22} />
        </button>
      </div>

      {/* 🔹 Janela do Chat */}
      {isOpen && (
        <div className="fixed bottom-20 left-6 w-80 h-96 bg-white border rounded-lg shadow-lg flex flex-col z-50">
          {/* Cabeçalho */}
          <div className="p-3 bg-primary text-white flex justify-between items-center rounded-t-lg">
            <span className="flex items-center gap-2">
              <Bot size={18} />
              <span>Atendente Virtual</span>
            </span>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div
            ref={messagesEndRef}
            className="flex-1 p-3 overflow-y-auto space-y-2 text-sm scroll-smooth"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-md max-w-[80%] ${
                  msg.from === "user"
                    ? "bg-primary text-white self-end ml-auto"
                    : msg.from === "assistant"
                    ? "bg-gray-100 text-gray-900 self-start"
                    : "bg-red-100 text-red-700 text-center w-full"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500 text-xs mt-2">
                <div className="flex space-x-1">
                  <span className="animate-bounce delay-[0ms]">●</span>
                  <span className="animate-bounce delay-[150ms]">●</span>
                  <span className="animate-bounce delay-[300ms]">●</span>
                </div>
                <span>Digitando...</span>
              </div>
            )}
          </div>

          {/* Campo de entrada */}
          <div className="p-2 border-t flex">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 border rounded-l-md px-2 py-1 text-sm focus:outline-none"
              placeholder="Digite sua mensagem..."
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className={`px-3 rounded-r-md text-white flex items-center justify-center ${
                isTyping
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;







