// src/utils/sessionId.ts
/**
 * Gera um UUID seguro.
 */
function generateId(): string {
  if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback para ambientes sem crypto
  return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Retorna sempre um novo sessionId a cada reload.
 * (Não usa storage, só memória)
 */
export function getSessionId(): string {
  return generateId();
}
