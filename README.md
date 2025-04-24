# 优亿医疗测试平台

这是一个基于Flask REST API后端和Next.js前端的自动化测试系统，支持医疗设备（特别是180系统）的测试用例创建、管理和执行。
准备工作：
连接串口，ssh线
将touch_click.py文件放进设备的app/jzj文件夹下面
将ip设置成10.0.18.189

## 项目结构

```
/
├── backend/                # 后端Flask API服务
│   ├── app.py             # 主应用文件
│   ├── config.py          # 配置文件
│   ├── routes/            # API路由模块
│   ├── services/          # 业务逻辑服务
│   ├── models/            # 数据模型
│   └── requirements.txt   # 后端依赖
│
├── frontend/              # Next.js前端应用
│   ├── app/               # 页面路由
│   │   ├── page.tsx       # 主页
│   │   ├── test-cases/    # 测试用例页面
│   │   ├── settings/      # 设置页面
│   │   ├── login/         # 登录页面
│   │   └── monitoring/    # 监控页面
│   ├── components/        # 可复用组件
│   ├── lib/               # 工具库
│   ├── hooks/             # React钩子
│   ├── styles/            # 样式文件
│   ├── public/            # 静态资源
│   ├── package.json       # 前端依赖
│   └── next.config.js     # Next.js配置
│
├── utils/                 # 工具模块
│   ├── button_clicker.py  # 按钮点击工具
│   ├── image_comparator.py # 图像比对工具
│   ├── ssh_manager.py     # SSH连接管理
│   ├── serial_manager.py  # 串口连接管理
│   ├── test_method_mapping.py # 测试方法映射
│   ├── log_config.py      # 日志配置
│   └── log_monitor.py     # 日志监控工具(实时监控日志文件)
│
├── data/                  # 数据存储目录
│   ├── test_cases.json    # 测试用例数据
│   ├── settings.json      # 配置设置数据
│   ├── logs/              # 日志文件
│   ├── img/               # 图片资源
│   └── screenshots/       # 屏幕截图
│
├── py_venv/               # Python虚拟环境
│
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

### 日志监控工具

使用日志监控工具实时查看日志：

```bash
# 查看默认VP_180.log日志文件
python -m utils.log_monitor

# 自定义参数示例
python -m utils.log_monitor -f data/logs/custom.log -n 20 --no-color
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