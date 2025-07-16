# IP地址统一配置说明

## 概述
现在所有的IP地址配置都统一在 `.env.local` 文件中管理，不需要在多个文件中分别修改。

## 配置方法

### 1. 修改 `.env.local` 文件
只需要修改 `frontend/.env.local` 文件中的以下配置：

```env
# 统一IP配置 - 只需要修改这里的IP地址
NEXT_PUBLIC_BACKEND_HOST=10.0.18.134
NEXT_PUBLIC_BACKEND_PORT=5000
NEXT_PUBLIC_FRONTEND_HOST=10.0.18.134
NEXT_PUBLIC_FRONTEND_PORT=3000

# 自动生成的API URLs (不需要手动修改)
NEXT_PUBLIC_API_URL=http://10.0.18.134:5000
NEXT_PUBLIC_FIXED_API_URL=http://10.0.18.134:5000
```

### 2. 重启前端服务
修改配置后，需要重启前端开发服务器：

```bash
cd frontend
npm run dev
```

## 配置说明

- `NEXT_PUBLIC_BACKEND_HOST`: 后端服务器的IP地址
- `NEXT_PUBLIC_BACKEND_PORT`: 后端服务器的端口号
- `NEXT_PUBLIC_FRONTEND_HOST`: 前端服务器的IP地址
- `NEXT_PUBLIC_FRONTEND_PORT`: 前端服务器的端口号

## 自动化配置

系统会自动：
1. 从环境变量读取配置
2. 构建完整的API URL
3. 在所有API调用中使用统一的配置

## 文件结构

- `frontend/.env.local` - 主配置文件
- `frontend/lib/config.ts` - 配置管理工具
- `frontend/lib/constants.ts` - 常量定义
- `frontend/next.config.js` - Next.js配置

## 优势

1. **统一管理**: 只需要修改一个文件
2. **自动同步**: 所有API调用自动使用新配置
3. **环境隔离**: 不同环境可以有不同的配置
4. **易于维护**: 减少配置错误和遗漏

## 注意事项

1. 修改配置后必须重启前端服务
2. 确保后端服务器在指定的IP和端口上运行
3. 如果使用不同的网络环境，只需要修改 `.env.local` 文件即可
