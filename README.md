# 优亿医疗测试平台

这是一个基于Flask REST API后端和Next.js前端的自动化测试系统，支持医疗设备（特别是180系统）的测试用例创建、管理和执行。

## 准备工作

1. 硬件连接：
   - 连接串口线
   - 连接SSH线
   - 将touch_click.py文件放进设备的app/jzj文件夹下面

2. 网络配置：
   - 将设备IP设置成10.0.18.xxx网段，须跟自动化测试平台中的IP设置保持一致

## IP配置说明

### 使用固定IP（推荐）：
- 后端设置：`USE_FIXED_IP=true`，配置 `FIXED_HOST` 和 `FIXED_PORT`
- 前端设置：`NEXT_PUBLIC_USE_FIXED_IP=true`，配置 `NEXT_PUBLIC_FIXED_API_URL`

### 使用动态IP：
- 后端设置：`USE_FIXED_IP=false`
- 前端设置：`NEXT_PUBLIC_USE_FIXED_IP=false`
- 系统会自动获取当前主机的IP地址

### 环境变量优先级：
环境变量 > 配置文件 > 默认值

可以通过修改环境变量来覆盖配置文件中的设置。前端环境变量在 `frontend/.env.local` 文件中配置，后端环境变量在 `backend/config.py` 文件中配置。


## 跨域问题解决

项目已配置跨域支持：
- 后端：在 `backend/config.py` 中配置了CORS
- 前端：通过 `frontend/lib/config.ts` 统一管理API URL配置

## 项目结构

```
/
├── backend/                # 后端Flask API服务
│   ├── app.py             # 主应用文件
│   ├── config.py          # 配置文件
│   ├── routes/            # API路由模块
│   │   ├── auth.py        # 认证路由
│   │   ├── test_cases.py # 测试用例路由
│   │   ├── settings.py   # 设置路由
│   │   ├── ssh.py         # SSH连接路由
│   │   ├── serial.py      # 串口连接路由
│   │   ├── logs.py        # 日志路由
│   │   ├── screen.py      # 屏幕操作路由
│   │   └── files.py       # 文件操作路由
│   ├── services/          # 业务逻辑服务
│   ├── models/            # 数据模型
│   ├── utils/             # 工具模块
│   ├── data/              # 数据目录
│   └── requirements.txt   # 后端依赖
│
├── frontend/              # Next.js前端应用
│   ├── app/               # 页面路由
│   │   ├── page.tsx       # 主页
│   │   ├── test-cases/    # 测试用例页面
│   │   │   ├── page.tsx   # 测试用例列表
│   │   │   ├── [id]/      # 测试用例详情
│   │   │   │   ├── edit/  # 编辑测试用例
│   │   │   │   └── logs/  # 查看日志
│   │   │   ├── new/       # 新建测试用例
│   │   │   └── reports/   # 测试报告
│   │   ├── execute-all/   # 批量执行页面
│   │   ├── settings/      # 设置页面
│   │   └── login/         # 登录页面
│   ├── components/        # 可复用组件
│   │   ├── ui/            # UI组件库
│   │   ├── TestCaseList.tsx # 测试用例列表组件
│   │   ├── MainNav.tsx    # 主导航组件
│   │   └── Sidebar.tsx    # 侧边栏组件
│   ├── lib/               # 工具库
│   │   ├── api/           # API接口封装
│   │   └── config.ts      # 配置管理
│   ├── hooks/             # React钩子
│   ├── types/             # TypeScript类型定义
│   ├── utils/             # 工具函数
│   ├── public/            # 静态资源
│   ├── package.json       # 前端依赖
│   ├── next.config.mjs    # Next.js配置
│   └── tailwind.config.ts # Tailwind CSS配置
│
├── backend.Dockerfile     # 后端Docker配置
├── frontend.Dockerfile    # 前端Docker配置
├── docker-compose.yml     # Docker编排配置
├── DOCKER_USAGE.md        # Docker使用说明
└── README.md              # 项目说明文档
```

## 功能特性

### 测试用例管理
- 测试用例创建、编辑、删除、查看
- 可视化测试用例编辑器
- 批量执行测试用例
- 测试用例执行结果查看

### 设备控制
- SSH远程连接设备
- 串口通信控制
- 按钮点击模拟
- 触摸屏幕操作模拟

### 图像分析
- 图像获取
- 屏幕截图
- 图像相似度比对
- 图像关键点检测

### 系统功能
- 用户认证
- 日志记录
- 设置管理
- 实时监控

## 特殊功能

### 180系统特性

#### 硬件架构
- 处理器：ARM 64位架构，四核Cortex-A53处理器
- FPGA：Xilinx ZynqMP FPGA，提供可编程逻辑用于图像处理
- 输入设备：HTLTEK USB键盘
- 平台：Xilinx UltraScale+架构，结合了处理器和FPGA

#### 软件环境
- 操作系统：Linux 5.4.0-xilinx内核，定制的嵌入式系统
- 图像处理：使用GStreamer框架进行图像处理

#### 控制方式
- 通过GPIO控制开关机
- 内镜拔插模拟：`kill -SIGUSR1 300 && sleep 0.5 && kill -SIGUSR2 300`
- 电子放大功能测试
- 按钮点击和长按操作
- FPGA设备接口：`/dev/fpga0`

## 如何运行
### git 获取项目


### 后端 API 服务

1. 安装必要的依赖：

```bash
先安装python3.10
pip install -r backend/requirements.txt
```

2. 启动后端服务：

```bash
cd backend
python app.py
```

后端API将运行在 http://localhost:5000 或本机ip（端口5000）

### Next.js 前端

1. 安装前端依赖：

```bash
cd frontend
npm install --legacy-peer-deps
 
```

2. 运行开发服务器：

```bash
npm run dev
```

前端应用将运行在 http://localhost:3000 或本机ip（端口3000）

打开浏览器访问http://localhost:3000就可以使用
### Docker 部署

1. 确保已安装 Docker 和 Docker Compose

2. 在项目根目录执行：

```bash
# 首次构建和启动
docker-compose up --build

# 后台运行
docker-compose up -d

# 停止服务
docker-compose down
```

3. 访问应用：
   - 前端：http://localhost:3000
   - 后端：http://localhost:5000

详细Docker使用说明请参考 [DOCKER_USAGE.md](DOCKER_USAGE.md)

### 日志监控工具

系统提供了两种日志监控方式：

1. **Web界面实时监控**：
   - 在测试执行页面，系统会自动通过WebSocket实时显示日志
   - 支持查看历史日志和实时日志流

2. **命令行监控工具**：

```bash
# 查看默认VP_180.log日志文件
python -m backend.utils.log_monitor

# 自定义参数示例
python -m backend.utils.log_monitor -f backend/data/logs/custom.log -n 20 --no-color
```

可用选项:
- `-f, --file`: 指定要监控的日志文件路径
- `-n, --lines`: 开始时显示的最后几行日志数 (默认: 10)
- `--no-color`: 禁用彩色输出
- `-s, --sleep`: 检查文件变化的时间间隔(秒) (默认: 0.1)

## API 文档

系统提供以下REST API端点：

### 测试用例

- `GET /api/test-cases`: 获取所有测试用例
- `GET /api/test-cases/:id`: 获取单个测试用例
- `POST /api/test-cases`: 创建新测试用例
- `PUT /api/test-cases/:id`: 更新测试用例
- `DELETE /api/test-cases/:id`: 删除测试用例
- `POST /api/test-cases/:id/run`: 运行测试用例
- `POST /api/test-cases/batch/run`: 批量运行测试用例
- `GET /api/test-cases/:id/latest-log`: 获取测试用例的最新日志
- `GET /api/method-mappings`: 获取测试方法映射

### 系统设置

- `GET /api/settings`: 获取系统设置
- `PUT /api/settings`: 更新系统设置

### SSH连接

- `GET /api/ssh/status`: 获取SSH连接状态
- `POST /api/ssh/connect`: 连接SSH
- `POST /api/ssh/disconnect`: 断开SSH连接
- `POST /api/ssh/command`: 执行SSH命令

### 串口连接

- `GET /api/serial/ports`: 获取可用串口列表
- `GET /api/serial/status`: 获取串口连接状态
- `POST /api/serial/connect`: 连接串口
- `POST /api/serial/disconnect`: 断开串口连接
- `POST /api/serial/command`: 执行串口命令

### 用户认证

- `POST /api/login`: 登录（用户名/密码：admin/admin）
- `POST /api/logout`: 退出登录

### 报告功能

- `GET /api/reports`: 获取测试报告列表
- `GET /api/reports/:id`: 获取单个测试报告
- `POST /api/reports/generate`: 生成测试报告

### WebSocket 连接

- `ws://host:port/ws/touch-monitor`: 触摸屏监控WebSocket
- `ws://host:port/ws/logs`: 日志监控WebSocket