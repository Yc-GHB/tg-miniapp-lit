import { createAppKit } from '@reown/appkit';
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5';
import { mainnet, sepolia } from '@reown/appkit/networks';

// 定义 Chronicle Yellowstone 网络 (Lit Protocol 测试网)
const yellowstone = {
  id: 175188,
  name: 'Chronicle Yellowstone',
  network: 'chronicle-yellowstone',
  nativeCurrency: { name: 'tstLPX', symbol: 'tstLPX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://yellowstone-rpc.litprotocol.com/'] },
    public: { http: ['https://yellowstone-rpc.litprotocol.com/'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://yellowstone-explorer.litprotocol.com/' },
  },
} as const;

// 1. 获取 projectId - 从 WalletConnect Cloud 获取
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'ab7ef5ef0be6d6e1ada8554df0dcf37d';

// 2. 设置支持的网络
export const networks = [yellowstone] as const;

// 3. 创建 metadata
const metadata = {
  name: 'Lit Telegram Mini App',
  description: 'Telegram Mini App with Lit Protocol',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://example.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// 4. 创建 Ethers adapter
const ethers5Adapter = new Ethers5Adapter();

// 5. 创建 AppKit 实例（支持移动端和桌面端）
export const appKit = createAppKit({
  adapters: [ethers5Adapter],
  networks: [yellowstone],
  metadata,
  projectId,
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
  },
  // 移动端优化配置
  enableWalletConnect: true,  // 启用 WalletConnect（移动端必需）
  enableInjected: true,        // 启用注入钱包（桌面端）
  enableEIP6963: true,         // 支持 EIP-6963 钱包发现
  enableCoinbase: true,        // 启用 Coinbase Wallet
  // 显示所有支持的钱包
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709', // OKX Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
  ],
  // 主题配置
  themeMode: 'dark',
  themeVariables: {
    '--w3m-z-index': 9999,
  },
});

// 导出便捷方法
export const openConnectModal = () => appKit.open();
export const disconnect = () => appKit.disconnect();

