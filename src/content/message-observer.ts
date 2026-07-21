// Content script que se ejecuta en contexto ISOLATED
// Monitorea cambios en el DOM de WhatsApp Web para detectar mensajes eliminados

const DELETED_INDICATORS = [
  "Este mensaje fue eliminado",
  "This message was deleted",
  "Le message a été supprimé",
  "Dieser Text wurde gelöscht",
  "Este mensaje fue borrado",
  "Mensagem apagada",
];

interface StoredMessage {
  id: string;
  originalContent?: string;
  messageElement?: HTMLElement;
}

const observedMessages = new Map<string, StoredMessage>();

function extractMessageId(element: HTMLElement): string | null {
  // Intenta extraer el ID único del mensaje del atributo de datos
  return (
    element.getAttribute("data-message-id") ||
    element.getAttribute("data-id") ||
    element.id ||
    null
  );
}

function isDeletedMessage(element: HTMLElement): boolean {
  const text = element.textContent || "";
  return DELETED_INDICATORS.some((indicator) =>
    text.includes(indicator)
  );
}

function getOriginalContent(element: HTMLElement): string | undefined {
  // Intenta extraer el contenido original si está disponible
  const contentEl = element.querySelector("[data-original-content]");
  return contentEl?.getAttribute("data-original-content") || undefined;
}

function onMessageDeleted(
  messageId: string,
  element: HTMLElement,
  originalContent?: string
) {
  const deletedAt = new Date().toISOString();
  const deletedText =
    Array.from(element.childNodes)
      .find(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          DELETED_INDICATORS.some((ind) => node.textContent?.includes(ind))
      )
      ?.textContent || "Este mensaje fue eliminado";

  // Enviar mensaje a storage-bridge para actualizar el estado
  window.postMessage(
    {
      type: "message-deleted",
      data: {
        id: messageId,
        deletedAt,
        deletedReason: deletedText,
        originalContent,
      },
    },
    "*"
  );

  console.log(`[wa-monitor] Mensaje eliminado detectado: ${messageId}`);
}

function setupMessageObserver() {
  // Observa cambios en la lista de mensajes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Detectar elementos de mensaje nuevos
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as HTMLElement;

          // Buscar mensajes dentro del nodo agregado
          const messages = element.querySelectorAll(
            "[role='listitem'], [data-testid*='message'], .message"
          );
          messages.forEach((msg) => {
            const messageId = extractMessageId(msg as HTMLElement);
            if (messageId) {
              const original = getOriginalContent(msg as HTMLElement);
              observedMessages.set(messageId, {
                id: messageId,
                originalContent: original,
                messageElement: msg as HTMLElement,
              });
            }
          });
        });
      }

      // Detectar cambios en atributos o contenido
      if (mutation.type === "characterData" || mutation.type === "attributes") {
        const element = mutation.target as HTMLElement;
        // Buscar mensaje padre
        const messageEl = element.closest(
          "[role='listitem'], [data-testid*='message'], .message"
        ) as HTMLElement | null;

        if (messageEl) {
          const messageId = extractMessageId(messageEl);
          if (messageId && isDeletedMessage(messageEl)) {
            const stored = observedMessages.get(messageId);
            onMessageDeleted(
              messageId,
              messageEl,
              stored?.originalContent
            );
          }
        }
      }
    });
  });

  // Configurar el observador para monitorear cambios
  const chatContainer = document.querySelector(
    "[role='main'], [data-testid='chat'], .messages-container"
  );

  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeFilter: ["data-content", "aria-label", "class"],
    });

    console.log("[wa-monitor] Observador de mensajes inicializado");
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMessageObserver);
} else {
  setupMessageObserver();
}
