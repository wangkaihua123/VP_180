# 优亿医疗测试平台

这是一个基于Flask REST API后端和Next.js前端的测试用例管理系统，支持测试用例的创建、管理和执行。

## 项目结构

```
/
├── backend/                # 后端Flask API服务
│   ├── app.py             # 主应用文件
│   └── requirements.txt   # 后端依赖
│
├── frontend/              # Next.js前端应用
│   ├── components/        # 可复用组件
│   ├── pages/             # 页面组件
│   ├── styles/            # 样式文件
│   ├── public/            # 静态资源
│   ├── package.json       # 前端依赖
│   └── next.config.js     # Next.js配置
│
├── data/                  # 数据存储目录
│   ├── test_cases.json    # 测试用例数据
│   ├── settings.json      # 配置设置数据
│   └── img/               # 图片资源
│
├── py_venv/               # Python虚拟环境
│
└── README.md              # 项目说明文档
```

## 功能特性

- 测试用例管理（创建、编辑、删除、查看）
- 测试用例执行
- SSH连接设置
- 用户认证

## 如何运行

### 后端 API 服务

1. 首先激活虚拟环境：

```bash
# Windows
.\py_venv\Scripts\activate

# Linux/macOS
source py_venv/bin/activate
```

2. 安装必要的依赖：

```bash
pip install -r backend/requirements.txt
```

3. 启动后端服务：

```bash
python backend/app.py
```

后端API将运行在 http://localhost:5000

### Next.js 前端

1. 安装前端依赖：

```bash
cd frontend
npm install
```

2. 运行开发服务器：

```bash
npm run dev
```

前端应用将运行在 http://localhost:3000

## API 文档

系统提供以下REST API端点：

### 测试用例

- `GET /api/test-cases`: 获取所有测试用例
- `GET /api/test-cases/:id`: 获取单个测试用例
- `POST /api/test-cases`: 创建新测试用例
- `PUT /api/test-cases/:id`: 更新测试用例
- `DELETE /api/test-cases/:id`: 删除测试用例
- `POST /api/test-cases/:id/run`: 运行测试用例
- `POST /api/test-cases/run-all`: 运行所有测试用例

### 系统设置

- `GET /api/settings`: 获取系统设置
- `PUT /api/settings`: 更新系统设置

### 用户认证

- `POST /api/login`: 登录（用户名/密码：admin/admin）
- `POST /api/logout`: 退出登录 