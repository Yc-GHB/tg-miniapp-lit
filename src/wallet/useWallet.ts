import { useEffect, useState, useCallback } from 'react';
import { providers } from 'ethers';
import { appKit } from './config';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: providers.Web3Provider | null;
  signer: providers.JsonRpcSigner | null;
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

  const updateWalletState = useCallback(async () => {
    try {
      // 获取 provider
      const walletProvider = appKit.getWalletProvider();
      
      if (walletProvider) {
        const provider = new providers.Web3Provider(walletProvider as any);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = provider.getSigner();
          const network = await provider.getNetwork();
          
          setState({
            isConnected: true,
            address: accounts[0],
            chainId: Number(network.chainId),
            provider,
            signer,
          });
          return;
        }
      }

      setState({
        isConnected: false,
        address: null,
        chainId: null,
        provider: null,
        signer: null,
      });
    } catch (error) {
      console.error('Error updating wallet state:', error);
    }
  }, []);

  // 监听钱包事件
  useEffect(() => {
    // 初始化状态
    updateWalletState();

    // 监听连接状态变化
    const unsubscribe = appKit.subscribeState((newState) => {
      console.log('AppKit state changed:', newState);
      updateWalletState();
    });

    return () => {
      unsubscribe();
    };
  }, [updateWalletState]);

  // 连接钱包
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      await appKit.open();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await appKit.disconnect();
      setState({
        isConnected: false,
        address: null,
        chainId: null,
        provider: null,
        signer: null,
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 切换网络
  const switchNetwork = useCallback(async (chainId: number) => {
    try {
      await appKit.switchNetwork(chainId as any);
      await updateWalletState();
    } catch (error) {
      console.error('Error switching network:', error);
    }
  }, [updateWalletState]);

  return {
    ...state,
    isLoading,
    connect,
    disconnect,
    switchNetwork,
  };
}
