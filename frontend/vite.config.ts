import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/features/people/types.ts',
        'src/features/journal/types.ts',
        'src/features/almanac/types.ts',
        'src/features/reminders/types.ts',
        'src/features/journal/components/AiReflectionPanel.tsx',
        'src/features/journal/components/DailyPromptBanner.tsx',
        'src/features/journal/components/PeopleMentionInput.tsx',
        'src/features/shared/components/TagInput.tsx',
        'src/features/journal/routes/JournalEditorPage.tsx',
        'src/features/journal/routes/JournalEntryPage.tsx',
        'src/features/journal/routes/JournalListPage.tsx',
        'src/features/journal/api/stream-reflect.ts',
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
})
