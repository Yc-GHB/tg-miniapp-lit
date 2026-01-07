/// <reference types="vite/client" />

// 钱包 provider 类型声明
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeListener: (event: string, handler: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isOkxWallet?: boolean;
  };
  Telegram?: {
    WebApp?: any;
  };
}
