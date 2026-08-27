import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'leaflet-heat-leaflet-import',
      transform(code, id) {
        const normalized = id.replaceAll('\\', '/')
        if (!normalized.includes('leaflet.heat/dist/leaflet-heat.js')) return
        return {
          code: `import L from 'leaflet';\n${code}`,
          map: null,
        }
      },
    },
  ],
})
