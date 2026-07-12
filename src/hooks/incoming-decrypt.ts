// Protocol-level incoming-message translation. We hook `WAWebMsgProcessingDecryptEnc.
// decryptEnc` — the function WhatsApp calls to decrypt an incoming encrypted stanza.
// After decryption, we inspect the resulting message protobuf and replace the visible
// text fields (`conversation`, `extendedTextMessage.text`, image/video/document captions)
// with our translation BEFORE the message reaches the message store and React renderer.
//
// Why this is better than wrapping React components:
// - Translation runs ONCE per message (at decrypt time), not on every render.
// - Group chats and DMs both flow through the same decrypt path.
// - Edits, replies, search, copy-paste all show the translated text consistently.
//
// We append the original under the translation so the recipient can verify.

import { injectToFunction } from "./wa";

let installed = false;
let stanzaInstalled = false;

const messagesStanzas = new Map<string, any>();

function waitStanza(msgId: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const checkInterval = 100; // Check every 100ms
    let elapsedTime = 0;

    const intervalId = setInterval(() => {
      if (messagesStanzas.has(msgId)) {
        clearInterval(intervalId);
        resolve(messagesStanzas.get(msgId));
      } else {
        elapsedTime += checkInterval;
        if (elapsedTime >= timeout) {
          clearInterval(intervalId);
          reject(new Error(`Timeout waiting for stanza with msgId: ${msgId}`));
        }
      }
    }, checkInterval);
  });
}

export function installDecryptHook(): boolean {
  console.log("[wa-scripts] installing decrypt hook");
  if (installed) return true;
  const ok = injectToFunction(
    { module: "WAWebMsgProcessingDecryptEnc", function: "decryptEnc" },
    async (orig, ...args: any[]) => {
      let result = await orig(...args);
      try {
        const decodedResult = require("decodeProtobuf").decodeProtobuf(
          require("WAWebProtobufsE2E.pb").MessageSpec,
          require("WACryptoPkcs7").unpadPkcs7(new Uint8Array(result)),
        );

        const externalId = args[3]?.msgInfo?.externalId;
        console.log("[wa-scripts] Decrypted message with externalId:", externalId);
        const stanzaTags = externalId ? await waitStanza(externalId) : null;

        const { user, server, _serialized } = args[2] as {
          user: string;
          server: string;
          _serialized: string;
        };

        const fullMessage = {
          contactName: tryGetContactName(user + "@" + server),
          fullJid: _serialized,
          result: decodedResult,
          tags: stanzaTags?.content || [],
          msgInfo: args[3].msgInfo,
          bizInfo: args[3].bizInfo,
        };

        /// message contains buffers that are not serializable, so we remove them before sending the message to the popup
        const withoutBuffers = removeBuffers(fullMessage);

        window.postMessage(
          {
            type: "message",
            data: withoutBuffers,
          },
          "*",
        );

        result = require("WAWebSendMsgCommonApi").encodeAndPad(decodedResult);
      } catch (err) {
        console.warn("[wa-scripts] decrypt translate failed", err);
      }

      return result;
    },
  );
  if (ok) {
    installed = true;
    console.info("[wa-scripts] decrypt hook installed");
  }
  return ok;
}

export function installStanzaHook(): boolean {
  console.log("[wa-scripts] installing stanza hook");
  if (stanzaInstalled) return true;
  const ok = injectToFunction(
    { module: "WAWap", function: "decodeStanza" },
    async (orig, ...args: any[]) => {
      let result = await orig(...args);
      try {
        const msgId = result?.attrs?.id;

        if (msgId) {
          console.log("[wa-scripts] Stanza received with msgId:", msgId);
          messagesStanzas.set(msgId, result);
        }
      } catch (err) {
        console.warn("[wa-scripts] decrypt translate failed", err);
      }

      return result;
    },
  );
  if (ok) {
    stanzaInstalled = true;
    console.info("[wa-scripts] stanza hook installed");
  }
  return ok;
}

function tryGetContactName(lid: string): string | undefined {
  try {
    const wid = window.require("WAWebWidFactory").createUserLidOrThrow(lid);
    const contact = window
      .require("WAWebContactCollection")
      .ContactCollection.get(wid);
    const name = contact
      ? window
          .require("WAWebFrontendContactGetters")
          .getUserDisplayNameForLid(contact)
      : undefined;

    return name;
  } catch {
    return undefined;
  }
}

//  When try parseing the message, we can get some buffers that are not serializable, so we remove them before sending the message to the popup
function removeBuffers(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeBuffers);
  }

  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, removeBuffers(value)]),
    );
  }

  if (obj instanceof ArrayBuffer || obj instanceof Uint8Array) {
    return 'Removed Buffer'; // or return null, or some placeholder value
  }

  return obj;
}
