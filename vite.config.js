import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // กำหนด port เริ่มต้น (เปลี่ยนได้ตามต้องการ)
    open: true, // เปิด browser อัตโนมัติเมื่อสั่ง run
  },
  build: {
    outDir: 'dist',
  }
})