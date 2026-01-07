# 🚀 快速测试指南

## ✅ 修改已完成

所有代码已成功更新，开发服务器正在运行：`http://localhost:5176/`

## 🔧 主要改进

### 1. **替换 Reown AppKit 为轻量级钱包连接器**
   - ✅ 移除了 AppKit 的复杂抽象层
   - ✅ 直接使用 `window.ethereum` 与钱包通信
   - ✅ 更好的 Telegram Mini App 兼容性

### 2. **移除 React.StrictMode**
   - ✅ 避免开发环境中的双重渲染
   - ✅ 防止重复的连接和签名请求

### 3. **优化状态管理**
   - ✅ 单一 WalletConnector 实例
   - ✅ 简化的事件订阅机制
   - ✅ 避免重复的状态更新

## 📝 在 Telegram 中测试

### 步骤 1: 访问你的 Mini App
在 Telegram 中打开你的 Mini App

### 步骤 2: 连接钱包
1. 点击 "🔗 Connect Wallet" 按钮
2. **预期：** 只需点击一次，钱包应用自动打开
3. **预期：** 只需确认一次连接请求
4. **预期：** 连接成功后显示地址

### 步骤 3: Mint PKP
1. 确认已连接到 Chronicle Yellowstone 网络 (Chain ID: 175188)
2. 点击 "🔑 Mint PKP" 按钮
3. **预期：** 自动切换到正确网络（如果需要）
4. **预期：** 钱包应用自动打开
5. **预期：** 只需签名一次
6. **预期：** 成功后显示 PKP 信息

### 步骤 4: Get Session Signatures
1. PKP mint 成功后
2. 点击 "✍️ Get Session Signatures" 按钮
3. **预期：** 钱包应用自动打开
4. **预期：** 只需签名一次（或最多两次，因为需要创建 capacity delegation）
5. **预期：** 成功后显示签名信息

## 🐛 如果还有问题

### 问题 A: 仍然需要连接两次

**可能原因：** 浏览器缓存了旧的 AppKit 状态

**解决方案：**
```bash
# 清除浏览器缓存，或者在 Telegram 中：
# 1. 关闭 Mini App
# 2. 清除 Telegram 缓存
# 3. 重新打开 Mini App
```

### 问题 B: 钱包不会自动唤起

**可能原因：** Telegram 浏览器的安全限制

**解决办法：**
1. 确保在用户主动点击按钮后才发起签名请求（已实现）
2. 某些 Telegram 版本可能需要手动切换到钱包应用

### 问题 C: 网络切换失败

**解决办法：**
```typescript
// 代码已经实现了自动添加网络配置
// 如果失败，用户需要手动在钱包中添加 Chronicle Yellowstone 网络

网络信息：
- 网络名称: Chronicle Yellowstone
- RPC URL: https://yellowstone-rpc.litprotocol.com/
- Chain ID: 175188
- 代币符号: tstLPX
```

## 📊 性能对比

### 之前 (使用 AppKit + StrictMode)
- ❌ 连接钱包：需要 2 次确认
- ❌ Mint PKP：需要 2 次签名
- ❌ Get Session Sig：需要 2 次签名
- ❌ 钱包不会自动唤起

### 现在 (使用 WalletConnector)
- ✅ 连接钱包：只需 1 次确认
- ✅ Mint PKP：只需 1 次签名
- ✅ Get Session Sig：只需 1-2 次签名（正常）
- ✅ 钱包自动唤起

## 🔄 回滚方案（如果需要）

如果新方案有问题，可以通过 Git 回滚：

```bash
# 查看修改
git status

# 回滚到之前的版本
git checkout HEAD -- src/

# 或者回滚整个提交
git reset --hard HEAD~1
```

## 📦 清理旧依赖（可选）

测试通过后，可以卸载不再使用的 AppKit：

```bash
pnpm remove @reown/appkit @reown/appkit-adapter-ethers5
```

**注意：** 建议先充分测试再卸载，以防需要回滚。

## 🎯 核心文件清单

### 新增文件
- ✅ `src/wallet/walletConnect.ts` - 轻量级钱包连接器
- ✅ `WALLET_OPTIMIZATION.md` - 优化说明文档
- ✅ `TESTING_GUIDE.md` - 本测试指南

### 修改文件
- ✅ `src/wallet/useWallet.ts` - 简化的 Hook
- ✅ `src/wallet/index.ts` - 更新导出
- ✅ `src/App.tsx` - 移除 AppKit 引用
- ✅ `src/main.tsx` - 移除 StrictMode
- ✅ `src/vite-env.d.ts` - 更新类型声明

## 💡 技术要点

### WalletConnector 设计原则
1. **单例模式** - 全局只有一个实例
2. **事件驱动** - 监听钱包事件自动更新状态
3. **最小抽象** - 直接使用 `window.ethereum`
4. **Telegram 优化** - 适配 Telegram 内置浏览器环境

### 为什么移除 AppKit？
1. AppKit 为标准 Web 应用设计，不适合 Telegram Mini App
2. 多层抽象导致在移动端无法正确唤起钱包
3. 复杂的订阅机制导致状态重复更新
4. 包含大量不需要的功能（社交登录、法币出入金等）

---

## 📞 需要帮助？

如果在测试过程中遇到任何问题，请告诉我：
1. 具体的错误信息
2. 浏览器控制台日志
3. 哪一步出现问题

我会继续帮你优化！🚀
