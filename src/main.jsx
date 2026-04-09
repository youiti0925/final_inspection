import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// ==========================================
// 起動するアプリのバージョンをここで切り替えます
// ==========================================
//import App from './App.jsx'                // ← 【現在: PocketBase版】
import App from './App.firebase.jsx'    // ← 【Firebase版を使う場合はこちらのコメントを外し、上の行をコメントアウトしてください】


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
