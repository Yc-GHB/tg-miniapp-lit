import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { walletConnector } from './walletConnect';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    provider: null,
    signer: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // 更新钱包状态
  const updateWalletState = useCallback(() => {
    setState({
      isConnected: walletConnector.isConnected,
      address: walletConnector.getAddress(),
      chainId: walletConnector.getChainId(),
      provider: walletConnector.getProvider(),
      signer: walletConnector.getSigner(),
    });
  }, []);

  // 订阅钱包状态变化（只订阅一次）
  useEffect(() => {
    // 初始化时更新一次状态
    updateWalletState();
    
    // 订阅后续的状态变化
    const unsubscribe = walletConnector.subscribe(updateWalletState);
    
    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [updateWalletState]);

  // 连接钱包
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      await walletConnector.connect();
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await walletConnector.disconnect();
    } catch (error) {
      console.error('断开连接失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 切换网络
  const switchNetwork = useCallback(async (chainId: number) => {
    try {
      await walletConnector.switchNetwork(chainId);
    } catch (error) {
      console.error('切换网络失败:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    isLoading,
    connect,
    disconnect,
    switchNetwork,
  };
}
