import { createAppKit } from '@reown/appkit';
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5';
import { mainnet, sepolia, polygon, bsc, arbitrum } from '@reown/appkit/networks';

// 1. 获取 projectId - 需要在 https://cloud.reown.com 注册获取
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'ab7ef5ef0be6d6e1ada8554df0dcf37d';

// 2. 设置支持的网络 - 使用元组类型
export const networks = [mainnet, sepolia, polygon, bsc, arbitrum] as const;

// 3. 创建 metadata
const metadata = {
  name: 'Lit Telegram Mini App',
  description: 'Telegram Mini App with Lit Protocol',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://example.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// 4. 创建 Ethers adapter
const ethers5Adapter = new Ethers5Adapter();

// 5. 创建 AppKit 实例
export const appKit = createAppKit({
  adapters: [ethers5Adapter],
  networks: [mainnet, sepolia, polygon, bsc, arbitrum],
  metadata,
  projectId,
  features: {
    analytics: true,
    email: false, // 禁用邮箱登录
    socials: false, // 禁用社交登录
  },
  // Telegram Mini App 中的特殊配置
  enableWalletConnect: true,
  enableInjected: true, // 支持注入钱包（MetaMask, OKX 等）
  enableCoinbase: true, // 支持 Coinbase Wallet
  enableEIP6963: true, // 支持 EIP-6963 多钱包发现
});

// 导出便捷方法
export const openConnectModal = () => appKit.open();
export const disconnect = () => appKit.disconnect();
