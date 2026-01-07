# Telegram Mini App 钱包连接优化说明

## 问题分析

你之前遇到的问题包括：
1. **连接钱包需要两次才能成功**
2. **mintPKP 时不会直接唤起钱包软件**
3. **需要手动切换到钱包软件才会签名**
4. **每次操作都有两次签名请求**
5. **getSessionSignatures 也有同样的重复问题**

## 根本原因

### 1. React StrictMode 导致双重渲染
在开发模式下，`<StrictMode>` 会导致组件渲染两次，从而触发两次连接、两次签名请求。

### 2. Reown AppKit 不适合 Telegram Mini App
- AppKit 设计用于标准 Web 应用，不是为 Telegram Mini App 环境优化
- 在 Telegram 内置浏览器中无法正确唤起外部钱包应用
- 有多余的订阅机制导致状态更新触发多次连接

### 3. 重复的钱包连接按钮
- 自定义的 `Connect Wallet` 按钮
- AppKit 的 `<appkit-button />` 组件
两者可能互相干扰，导致重复连接

### 4. 多个 Provider 实例
litConnections.ts 中每次调用都创建新的 LitContracts 实例，每个实例都需要一次签名。

## 解决方案

### ✅ 替换为轻量级 WalletConnector

我们创建了一个专为 Telegram Mini App 优化的轻量级钱包连接器：

**核心特性：**
- 直接使用 `window.ethereum`，无额外抽象层
- 单例模式，避免多个实例
- 简洁的事件监听机制
- 支持多种钱包（MetaMask、OKX Wallet 等）
- 在 Telegram 环境中能正确唤起钱包应用

**文件变更：**
- ✅ 新建 `src/wallet/walletConnect.ts` - 核心钱包连接器
- ✅ 重写 `src/wallet/useWallet.ts` - 简化的 React Hook
- ✅ 更新 `src/wallet/index.ts` - 导出新的模块
- ✅ 更新 `src/App.tsx` - 使用新的连接器
- ✅ 更新 `src/main.tsx` - 移除 StrictMode
- ✅ 更新 `src/vite-env.d.ts` - 添加类型声明

### ✅ 移除 React.StrictMode

在 `main.tsx` 中移除了 `<StrictMode>`，避免开发环境中的双重渲染和连接。

### ✅ 简化钱包状态管理

- 只订阅一次钱包状态变化
- 使用单一 WalletConnector 实例
- 避免重复的 Provider 创建

### ✅ 直接使用 window.ethereum

在 mintPKP 和 getSessionSignatures 中直接使用 `window.ethereum`，不再通过多层抽象获取 provider。

## 主要代码变更

### 1. WalletConnector 类 (`src/wallet/walletConnect.ts`)

```typescript
// 单例钱包连接器
export class WalletConnector {
  private provider: ethers.providers.Web3Provider | null = null;
  
  // 直接使用 window.ethereum 连接
  async connect(): Promise<void> {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    // ...
  }
}

export const walletConnector = new WalletConnector();
```

### 2. 简化的 useWallet Hook

```typescript
// 只订阅一次，避免重复
useEffect(() => {
  updateWalletState();
  const unsubscribe = walletConnector.subscribe(updateWalletState);
  return () => {
    unsubscribe();
  };
}, [updateWalletState]);
```

### 3. 直接使用 window.ethereum

```typescript
// mintPKP 中
const pkp = await mintNewPkp(window.ethereum);

// getSessionSignatures 中
const sessionSignatures = await getSessionSignatures(
  litNodeClient,
  pkp,
  window.ethereum,
  data
);
```

## 使用方法

### 连接钱包
```typescript
const { connect, isConnected, address } = useWallet();

// 点击按钮连接
await connect();
```

### 切换网络
```typescript
const { switchNetwork } = useWallet();

// 切换到 Chronicle Yellowstone
await switchNetwork(175188);
```

### 断开连接
```typescript
const { disconnect } = useWallet();

await disconnect();
```

## 预期效果

✅ **单次连接** - 用户只需点击一次即可连接钱包  
✅ **自动唤起钱包** - Mint PKP 和签名时会自动打开对应钱包应用  
✅ **单次签名** - 每个操作只需签名一次  
✅ **更好的 Telegram 兼容性** - 在 Telegram 内置浏览器中表现更好  
✅ **更快的响应速度** - 减少了不必要的抽象层  

## 可选的进一步优化

如果仍有问题，可以考虑：

1. **添加签名缓存** - 在合理的时间内缓存签名，避免重复请求
2. **优化 LitContracts 实例** - 缓存实例而不是每次创建新的
3. **添加连接状态持久化** - 使用 localStorage 保存连接状态
4. **添加钱包检测** - 在连接前检测可用的钱包

## 测试建议

请在 Telegram 中测试以下场景：

1. ✅ 连接钱包 - 应该只需要一次确认
2. ✅ Mint PKP - 应该自动唤起钱包软件，只签名一次
3. ✅ Get Session Signatures - 应该自动唤起钱包，只签名一次
4. ✅ 切换账户 - 应该自动更新状态
5. ✅ 切换网络 - 应该正常工作
6. ✅ 断开连接 - 应该清除所有状态

## 卸载旧依赖（可选）

如果你不再需要 Reown AppKit，可以卸载相关依赖：

```bash
pnpm remove @reown/appkit @reown/appkit-adapter-ethers5
```

不过建议先测试新方案是否完全满足需求再卸载。
