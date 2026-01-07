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

  // 更新钱包状态
  const updateWalletState = useCallback(async () => {
    try {
      const walletProvider = appKit.getWalletProvider();
      const account = appKit.getAddress();
      const networkId = appKit.getChainId();
      
      if (walletProvider && account) {
        const provider = new providers.Web3Provider(walletProvider as any);
        const signer = provider.getSigner();
        
        setState({
          isConnected: true,
          address: account,
          chainId: networkId ? Number(networkId) : null,
          provider,
          signer,
        });
      } else {
        setState({
          isConnected: false,
          address: null,
          chainId: null,
          provider: null,
          signer: null,
        });
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
    }
  }, []);

  // 监听钱包事件
  useEffect(() => {
    updateWalletState();

    const unsubsAccount = appKit.subscribeAccount(() => updateWalletState());
    const unsubsNetwork = appKit.subscribeNetwork(() => updateWalletState());
    const unsubsState = appKit.subscribeState(() => updateWalletState());

    return () => {
      if (typeof unsubsAccount === 'function') (unsubsAccount as () => void)();
      if (typeof unsubsNetwork === 'function') (unsubsNetwork as () => void)();
      if (typeof unsubsState === 'function') (unsubsState as () => void)();
    };
  }, [updateWalletState]);

  // 连接钱包 - 打开 AppKit 模态框
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
