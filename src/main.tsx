import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 不再导入 wallet/config，因为已经改用轻量级 walletConnector

createRoot(document.getElementById('root')!).render(
  <App />
);