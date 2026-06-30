// Main-world entry point. Loaded into web.whatsapp.com as a module via the content script.
// Order matters: the WAM scrub must be installed before WhatsApp builds its event registry.

import { waitTillReady, waitForModules } from "./wa";
import { installWamScrub } from "./wam-scrub";
import { installDecryptHook, installStanzaHook } from "./incoming-decrypt";

// Modules our hooks depend on. Most of these are lazy-loaded by WhatsApp after the user
// authenticates and opens a chat for the first time, so we wait for them before binding
// the hooks (otherwise window.require returns undefined and the hooks no-op).
const REQUIRED_MODULES = [
  "react",
  "WAWebChatCollection",
  "WAWebSendTextMsgChatAction",
  "WAWebMsgProcessingDecryptEnc",
  "WAWebWamCodegenUtils",
  "WAWap",
];

console.info("[wa-scripts] page-world script booted");

(async () => {
  // Try the scrub as early as possible; retry until WhatsApp's WAM module is loaded.
  let scrubbed = installWamScrub();

  await waitTillReady();
  console.info("[wa-scripts] WhatsApp bundle ready");

  // Wait for the lazy-loaded chat/composer modules before installing module-level hooks.
  const missing = await waitForModules(REQUIRED_MODULES);
  if (missing.length) {
    console.warn("[wa-scripts] some modules never loaded after 60s:", missing);
  } else {
    console.info("[wa-scripts] all required modules loaded");
  }

  if (!scrubbed) scrubbed = installWamScrub();
  if (!scrubbed)
    console.warn("[wa-scripts] wam scrub could not install (module not found)");

  installStanzaHook();
  installDecryptHook();
  console.info("[wa-scripts] ready");
})();
