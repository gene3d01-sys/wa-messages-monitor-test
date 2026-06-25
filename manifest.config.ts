import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'WA Web Message Monitor',
  version: '0.1.0',
  description: 'Whatsapp Web Messages Monitor',
  icons: {
    16: 'public/icons/16.png',
    32: 'public/icons/32.png',
    48: 'public/icons/48.png',
    128: 'public/icons/128.png',
  },
  permissions: ['storage', 'sidePanel'],
  host_permissions: [
    'https://web.whatsapp.com/*',
  ],
  background: {
    service_worker: 'src/background.ts',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['https://web.whatsapp.com/*'],
      js: ['src/content/storage-bridge.ts'],
      run_at: 'document_start',
    },
    {
      matches: ['https://web.whatsapp.com/*'],
      js: ['src/hooks/index.ts'],
      run_at: 'document_end',
      world: 'MAIN',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['assets/*'],
      matches: ['https://web.whatsapp.com/*'],
    },
  ],
});
