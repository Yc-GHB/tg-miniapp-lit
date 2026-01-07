import { useEffect, useState } from "react";

import "./App.css";
import litLogo from "./assets/lit.png";
import {
  getSessionSignatures,
  connectToLitNodes,
  mintNewPkp,
} from "./litConnections";
import {
  isRecent,
  verifyInitData,
} from "./telegramAuthHelpers";
import { useWallet, walletConnector } from "./wallet";

interface TelegramWebApp {
  ready: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons: Array<{ text: string; type: string }>;
  }) => void;
  initData: string;
}

function App() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [sessionSignatures, setSessionSignatures] = useState<any | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<boolean | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [pkp, setPkp] = useState<{
    tokenId: any;
    publicKey: string;
    ethAddress: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 使用新的 wallet hook
  const { isConnected, address, provider, connect, disconnect } = useWallet();

  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    if (tgApp) {
      tgApp.ready();
      setWebApp(tgApp);
      setData(tgApp.initData);

      isRecent(tgApp.initData).then((isRecent) => {
        setRecent(isRecent);
      });

      verifyInitData(tgApp.initData, import.meta.env.VITE_TELEGRAM_BOT_SECRET)
        .then((isVerified) => {
          setValid(isVerified);
        })
        .catch((error) => {
          console.error("Error verifying init data:", error);
        });
    }
  }, []);

  // 监听连接成功
  useEffect(() => {
    if (isConnected && address && webApp) {
      webApp.showPopup({
        title: "Connected",
        message: `Connected with account: ${address?.slice(0, 6)}...${address?.slice(-4)}`,
        buttons: [{ text: "Close", type: "close" }],
      });
    }
  }, [isConnected, address, webApp]);

  const handleConnect = async () => {
    try {
      setError(null);
      await connect();
    } catch (err: any) {
      console.warn("failed to connect..", err);
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setPkp(null);
      setSessionSignatures(null);
    } catch (err: any) {
      console.warn("failed to disconnect..", err);
    }
  };

  const mintPkp = async () => {
    if (!provider) {
      setError("Please connect wallet first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 检查网络：Lit Datil-test (Yellowstone) 的 Chain ID 是 175188
      const currentChainId = walletConnector.getChainId();
      if (currentChainId !== 175188) {
        setError("请先切换到 Chronicle Yellowstone 网络");
        // 尝试自动切换网络
        await walletConnector.switchNetwork(175188);
        setIsLoading(false);
        return;
      }

      // 获取原始 provider（支持 window.ethereum 或 WalletConnect）
      const rawProvider = walletConnector.getRawProvider();
      if (!rawProvider) {
        throw new Error("找不到钱包连接，请重新连接");
      }

      console.log("Starting mint with provider...", rawProvider);
      const pkp = await mintNewPkp(rawProvider);
      setPkp(pkp);

      if (webApp) {
        webApp.showPopup({
          title: "PKP Minted",
          message: `Successfully minted PKP: ${pkp.ethAddress?.slice(0, 10)}...`,
          buttons: [{ text: "Close", type: "close" }],
        });
      }
    } catch (err: any) {
      console.error("Failed to mint PKP:", err);
      setError(err.message || "Failed to mint PKP");
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionSigs = async () => {
    if (!pkp) {
      setError("Please mint PKP first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const litNodeClient = await connectToLitNodes();
      // 获取原始 provider（支持 window.ethereum 或 WalletConnect）
      const rawProvider = walletConnector.getRawProvider();
      if (!rawProvider) {
        throw new Error("找不到钱包连接，请重新连接");
      }
      const sessionSignatures = await getSessionSignatures(
        litNodeClient,
        pkp,
        rawProvider,
        data
      );
      setSessionSignatures(sessionSignatures);

      if (webApp) {
        webApp.showPopup({
          title: "Success",
          message: "Session signatures obtained successfully!",
          buttons: [{ text: "Close", type: "close" }],
        });
      }
    } catch (err: any) {
      console.error("Failed to get session signatures:", err);
      setError(err.message || "Failed to get session signatures");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={litLogo} className="App-logo" alt="logo" />
        <h1>Telegram Mini App</h1>
      </header>

      {/* Telegram 验证状态 */}
      <div className="status-section">
        <h3>Telegram User Data Validity:</h3>
        <div className="status-item">
          <span>Recent:</span>
          <span className={recent ? "status-valid" : "status-invalid"}>
            {recent === null ? "Checking..." : recent ? "✓ Yes" : "✗ No"}
          </span>
        </div>
        <div className="status-item">
          <span>Valid:</span>
          <span className={valid ? "status-valid" : "status-invalid"}>
            {valid === null ? "Checking..." : valid ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* 钱包连接区域 */}
      <div className="wallet-section">
        {!isConnected ? (
          <button
            className="connect-button"
            onClick={handleConnect}
            disabled={isLoading}
          >
            🔗 Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <div className="wallet-address">
              <span>Connected:</span>
              <code>{address?.slice(0, 6)}...{address?.slice(-4)}</code>
            </div>
            <button
              className="disconnect-button"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* PKP 操作区域 */}
      {isConnected && (
        <div className="action-section">
          <button
            className="action-button"
            onClick={mintPkp}
            disabled={isLoading}
          >
            {isLoading ? "Minting..." : "🔑 Mint PKP"}
          </button>

          {pkp && (
            <button
              className="action-button"
              onClick={getSessionSigs}
              disabled={isLoading}
            >
              {isLoading ? "Getting Signatures..." : "✍️ Get Session Signatures"}
            </button>
          )}
        </div>
      )}

      {/* PKP 信息显示 */}
      {pkp && (
        <div className="boxed-code-display">
          <div className="boxed-code-display__container">
            <h2 className="boxed-code-display__title">🔑 PKP:</h2>
            <pre className="boxed-code-display__content">
              {JSON.stringify(pkp, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Session Signatures 显示 */}
      {sessionSignatures && (
        <div className="boxed-code-display">
          <div className="boxed-code-display__container">
            <h2 className="boxed-code-display__title">✍️ Session Signatures:</h2>
            <pre className="boxed-code-display__content">
              {JSON.stringify(sessionSignatures, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
