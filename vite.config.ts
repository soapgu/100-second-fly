import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径 base：适配 GitHub Pages 项目站子路径部署（https://soapgu.github.io/100-second-fly/）
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
