import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

// WalletConnect 项目 ID（需要在 https://cloud.walletconnect.com 注册获取）
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'ab7ef5ef0be6d6e1ada8554df0dcf37d';

// Telegram Mini App 专用混合钱包连接管理器
// 支持桌面端（window.ethereum）和移动端（WalletConnect）
export class WalletConnector {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private address: string | null = null;
  private chainId: number | null = null;
  private listeners: Set<() => void> = new Set();
  private wcProvider: any = null; // WalletConnect provider
  private connectionType: 'injected' | 'walletconnect' | null = null;

  // 连接状态
  get isConnected(): boolean {
    return !!this.provider && !!this.address;
  }

  // 获取当前地址
  getAddress(): string | null {
    return this.address;
  }

  // 获取 chainId
  getChainId(): number | null {
    return this.chainId;
  }

  // 获取 provider
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  // 获取 signer
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  // 获取原始 provider（用于 Lit Protocol）
  getRawProvider(): any {
    return this.wcProvider || window.ethereum;
  }

  // 订阅状态变化
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 通知所有监听者
  private notify() {
    this.listeners.forEach(callback => callback());
  }

  // 检测是否在移动端
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 检测是否在 Telegram 中
  private isInTelegram(): boolean {
    return !!window.Telegram?.WebApp;
  }

  // 连接钱包（自动选择最佳方式）
  async connect(): Promise<void> {
    try {
      const isMobile = this.isMobile();
      const isInTelegram = this.isInTelegram();
      
      console.log('📱 连接环境:', { isMobile, isInTelegram, hasEthereum: !!window.ethereum });

      // 在移动端 Telegram 中，优先使用 WalletConnect
      if ((isMobile && isInTelegram) || !window.ethereum) {
        await this.connectViaWalletConnect();
      } else {
        // 桌面端或有 window.ethereum 注入时，使用注入的钱包
        await this.connectViaInjected();
      }

      console.log('✅ 钱包连接成功:', {
        address: this.address,
        chainId: this.chainId,
        type: this.connectionType
      });
    } catch (error: any) {
      console.error('❌ 钱包连接失败:', error);
      throw error;
    }
  }

  // 通过注入的钱包连接（如 MetaMask 浏览器扩展）
  private async connectViaInjected(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('未检测到钱包扩展，请安装 MetaMask 或其他 Web3 钱包');
    }

    // 请求账户连接
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到账户，请重试');
    }

    // 创建 ethers provider
    this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    this.signer = this.provider.getSigner();
    this.address = accounts[0];

    // 获取 chainId
    const network = await this.provider.getNetwork();
    this.chainId = network.chainId;

    this.connectionType = 'injected';

    // 设置事件监听
    this.setupInjectedListeners();

    // 通知状态变化
    this.notify();
  }

  // 通过 WalletConnect 连接（移动端钱包应用）
  private async connectViaWalletConnect(): Promise<void> {
    try {
      // 创建 WalletConnect provider
      this.wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [175188], // Chronicle Yellowstone
        optionalChains: [1, 5, 11155111, 137, 80001], // 主网、测试网等
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '9999'
          }
        },
        metadata: {
          name: 'Lit Telegram Mini App',
          description: 'Telegram Mini App with Lit Protocol',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      // 连接钱包
      await this.wcProvider.enable();

      // 创建 ethers provider
      this.provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');
      this.signer = this.provider.getSigner();
      this.address = await this.signer.getAddress();

      // 获取 chainId
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;

      this.connectionType = 'walletconnect';

      // 设置事件监听
      this.setupWalletConnectListeners();

      // 通知状态变化
      this.notify();

      console.log('✅ WalletConnect 连接成功:', {
        address: this.address,
        chainId: this.chainId
      });
    } catch (error: any) {
      console.error('❌ WalletConnect 连接失败:', error);
      
      // 清理
      if (this.wcProvider) {
        await this.wcProvider.disconnect();
        this.wcProvider = null;
      }
      
      throw new Error(`WalletConnect 连接失败: ${error.message}`);
    }
  }

  // 切换网络
  async switchNetwork(targetChainId: number): Promise<void> {
    try {
      if (this.connectionType === 'walletconnect' && this.wcProvider) {
        // WalletConnect 切换网络
        await this.wcProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } else if (window.ethereum) {
        // 注入钱包切换网络
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          // 如果网络不存在，尝试添加网络
          if (switchError.code === 4902 && targetChainId === 175188) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x2AC74',
                  chainName: 'Chronicle Yellowstone',
                  nativeCurrency: {
                    name: 'tstLPX',
                    symbol: 'tstLPX',
                    decimals: 18,
                  },
                  rpcUrls: ['https://yellowstone-rpc.litprotocol.com/'],
                  blockExplorerUrls: ['https://yellowstone-explorer.litprotocol.com/'],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      // 重新获取 chainId
      if (this.provider) {
        const network = await this.provider.getNetwork();
        this.chainId = network.chainId;
        this.notify();
      }
    } catch (error: any) {
      console.error('切换网络失败:', error);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    try {
      // 断开 WalletConnect
      if (this.wcProvider) {
        await this.wcProvider.disconnect();
        this.removeWalletConnectListeners();
        this.wcProvider = null;
      }

      // 移除注入钱包的事件监听
      if (this.connectionType === 'injected') {
        this.removeInjectedListeners();
      }

      this.provider = null;
      this.signer = null;
      this.address = null;
      this.chainId = null;
      this.connectionType = null;
      
      // 通知状态变化
      this.notify();
      
      console.log('✅ 钱包已断开连接');
    } catch (error) {
      console.error('断开连接时出错:', error);
      // 即使出错也要清理状态
      this.provider = null;
      this.signer = null;
      this.address = null;
      this.chainId = null;
      this.connectionType = null;
      this.wcProvider = null;
      this.notify();
    }
  }

  // 设置注入钱包的事件监听
  private setupInjectedListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', this.handleAccountsChanged);
    window.ethereum.on('chainChanged', this.handleChainChanged);
    window.ethereum.on('disconnect', this.handleDisconnect);
  }

  // 移除注入钱包的事件监听
  private removeInjectedListeners() {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', this.handleChainChanged);
    window.ethereum.removeListener('disconnect', this.handleDisconnect);
  }

  // 设置 WalletConnect 的事件监听
  private setupWalletConnectListeners() {
    if (!this.wcProvider) return;

    this.wcProvider.on('accountsChanged', this.handleWCAccountsChanged);
    this.wcProvider.on('chainChanged', this.handleWCChainChanged);
    this.wcProvider.on('disconnect', this.handleWCDisconnect);
  }

  // 移除 WalletConnect 的事件监听
  private removeWalletConnectListeners() {
    if (!this.wcProvider) return;

    this.wcProvider.removeListener('accountsChanged', this.handleWCAccountsChanged);
    this.wcProvider.removeListener('chainChanged', this.handleWCChainChanged);
    this.wcProvider.removeListener('disconnect', this.handleWCDisconnect);
  }

  // 处理注入钱包的账户变化
  private handleAccountsChanged = async (accounts: string[]) => {
    console.log('账户变化:', accounts);
    
    if (accounts.length === 0) {
      await this.disconnect();
    } else if (accounts[0] !== this.address) {
      this.address = accounts[0];
      if (this.provider) {
        this.signer = this.provider.getSigner();
      }
      this.notify();
    }
  };

  // 处理注入钱包的链变化
  private handleChainChanged = async (chainIdHex: string) => {
    console.log('链变化:', chainIdHex);
    
    const newChainId = parseInt(chainIdHex, 16);
    this.chainId = newChainId;
    
    if (window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      this.signer = this.provider.getSigner();
    }
    
    this.notify();
  };

  // 处理注入钱包的断开连接
  private handleDisconnect = async () => {
    console.log('钱包断开连接');
    await this.disconnect();
  };

  // 处理 WalletConnect 的账户变化
  private handleWCAccountsChanged = async (accounts: string[]) => {
    console.log('WC 账户变化:', accounts);
    
    if (accounts.length === 0) {
      await this.disconnect();
    } else if (accounts[0] !== this.address) {
      this.address = accounts[0];
      if (this.provider) {
        this.signer = this.provider.getSigner();
      }
      this.notify();
    }
  };

  // 处理 WalletConnect 的链变化
  private handleWCChainChanged = async (chainId: number) => {
    console.log('WC 链变化:', chainId);
    
    this.chainId = chainId;
    
    if (this.wcProvider) {
      this.provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');
      this.signer = this.provider.getSigner();
    }
    
    this.notify();
  };

  // 处理 WalletConnect 的断开连接
  private handleWCDisconnect = async () => {
    console.log('WalletConnect 断开连接');
    await this.disconnect();
  };
}

// 导出单例实例
export const walletConnector = new WalletConnector();
