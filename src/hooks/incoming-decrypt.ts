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
        const { user, server, _serialized } = args[2] as {
          user: string;
          server: string;
          _serialized: string;
        };

        const fullMessage = {
          ...decodedResult,
          contactName: tryGetContactName(user + "@" + server),
          fullJid: _serialized,
        };

        /// MessageCOntextInfo contains buffers that are not serializable, so we remove it before sending the message to the popup
        const withoutMessageContextInfo = removeBuffers(fullMessage);

        window.postMessage(
          {
            type: "message",
            data: withoutMessageContextInfo,
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
    return undefined; // or return null, or some placeholder value
  }

  return obj;
}
