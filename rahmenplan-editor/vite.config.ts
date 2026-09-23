/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build = eine einzige HTML-Datei (inkl. Schriften), die offline per Doppelklick läuft.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 100_000_000 },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
