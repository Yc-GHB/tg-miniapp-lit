import { createAppKit } from '@reown/appkit';
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5';
// import { mainnet, sepolia, polygon, bsc, arbitrum } from '@reown/appkit/networks';
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

// 1. 获取 projectId - 需要在 https://cloud.reown.com 注册获取
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'ab7ef5ef0be6d6e1ada8554df0dcf37d';

// 2. 设置支持的网络 - 使用元组类型
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

// 5. 创建 AppKit 实例
export const appKit = createAppKit({
  adapters: [ethers5Adapter],
  networks: [yellowstone],
  metadata,
  projectId,
  features: {
    analytics: false, // 禁用分析
    email: false,     // 禁用邮箱登录
    socials: false,   // 禁用社交登录
    onramp: false,    // 禁用法币出入金 (Buy)
    swaps: false,     // 禁用交换 (Swap)
  },
  // 仅保留基础钱包连接
  enableWalletConnect: true,
  enableInjected: true, 
  enableEIP6963: true,
  enableCoinbase: false, // 如果不需要 Coinbase 特别按钮可以关闭
});

// 导出便捷方法
export const openConnectModal = () => appKit.open();
export const disconnect = () => appKit.disconnect();
