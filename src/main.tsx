import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 初始化 AppKit（只需导入配置文件即可）
import './wallet/config';

createRoot(document.getElementById('root')!).render(
  <App />
);