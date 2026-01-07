import { ethers } from 'ethers';

// Telegram Mini App 专用轻量级钱包连接管理器
export class WalletConnector {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private address: string | null = null;
  private chainId: number | null = null;
  private listeners: Set<() => void> = new Set();

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

  // 订阅状态变化
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 通知所有监听者
  private notify() {
    this.listeners.forEach(callback => callback());
  }

  // 连接钱包（支持多种钱包）
  async connect(): Promise<void> {
    try {
      // 检查是否在 Telegram 环境中
      const isTelegram = !!window.Telegram?.WebApp;
      
      // 检查是否有可用的钱包
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请先安装支持的钱包（如 MetaMask、OKX Wallet 等）');
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

      // 设置事件监听
      this.setupEventListeners();

      // 通知状态变化
      this.notify();

      console.log('✅ 钱包连接成功:', {
        address: this.address,
        chainId: this.chainId,
        isTelegram
      });
    } catch (error: any) {
      console.error('❌ 钱包连接失败:', error);
      throw error;
    }
  }

  // 切换网络
  async switchNetwork(targetChainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('未检测到钱包');
    }

    try {
      // 尝试切换网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902) {
        // Chronicle Yellowstone 配置
        if (targetChainId === 175188) {
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
          throw new Error(`不支持的网络 ID: ${targetChainId}`);
        }
      } else {
        throw switchError;
      }
    }

    // 重新获取 chainId
    if (this.provider) {
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      this.notify();
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    
    // 移除事件监听
    this.removeEventListeners();
    
    // 通知状态变化
    this.notify();
    
    console.log('✅ 钱包已断开连接');
  }

  // 设置事件监听
  private setupEventListeners() {
    if (!window.ethereum) return;

    // 账户变化
    window.ethereum.on('accountsChanged', this.handleAccountsChanged);
    
    // 链变化
    window.ethereum.on('chainChanged', this.handleChainChanged);
    
    // 断开连接
    window.ethereum.on('disconnect', this.handleDisconnect);
  }

  // 移除事件监听
  private removeEventListeners() {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', this.handleChainChanged);
    window.ethereum.removeListener('disconnect', this.handleDisconnect);
  }

  // 处理账户变化
  private handleAccountsChanged = async (accounts: string[]) => {
    console.log('账户变化:', accounts);
    
    if (accounts.length === 0) {
      // 用户断开了钱包
      await this.disconnect();
    } else if (accounts[0] !== this.address) {
      // 账户切换
      this.address = accounts[0];
      if (this.provider) {
        this.signer = this.provider.getSigner();
      }
      this.notify();
    }
  };

  // 处理链变化
  private handleChainChanged = async (chainIdHex: string) => {
    console.log('链变化:', chainIdHex);
    
    const newChainId = parseInt(chainIdHex, 16);
    this.chainId = newChainId;
    
    // 重新创建 provider 和 signer
    if (window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      this.signer = this.provider.getSigner();
    }
    
    this.notify();
  };

  // 处理断开连接
  private handleDisconnect = async () => {
    console.log('钱包断开连接');
    await this.disconnect();
  };
}

// 导出单例实例
export const walletConnector = new WalletConnector();
