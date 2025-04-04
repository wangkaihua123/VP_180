# VP 180 测试系统

## 项目简介
VP 180 测试系统是一个基于 Flask 的 Web 应用程序，用于管理和执行自动化测试用例。系统提供了友好的 Web 界面，支持测试用例的创建、编辑、执行和管理。

## 项目结构
```
vp_180/
├── app.py              # Web服务主入口
├── main.py             # 测试用例运行主入口
├── config/             # 配置文件目录
│   └── app_config.py   # 应用配置
├── data/               # 数据目录
│   ├── img/           # 图片文件
│   ├── screenshots/   # 截图文件
│   ├── test_files/    # 测试文件
│   ├── settings.json  # 系统设置
│   └── test_cases.json # 测试用例数据
├── docs/              # 项目文档
├── log/               # 日志目录
├── reports/           # 测试报告目录
├── routes/            # 路由处理
│   ├── settings.py    # 设置相关路由
│   └── test_cases.py  # 测试用例相关路由
├── tests/             # 测试用例目录
├── utils/             # 工具类
│   ├── button_clicker.py      # 按钮点击工具
│   ├── image_comparator.py    # 图像比较工具
│   ├── ssh_manager.py         # SSH连接管理
│   └── test_method_mapping.py # 测试方法映射
└── web/               # Web前端
    ├── static/       # 静态资源
    └── templates/    # HTML模板
```

## 功能特性
- 测试用例管理：创建、编辑、删除测试用例
- 测试执行：支持执行单个或批量测试用例
- 图像比较：支持图像相似度比较和关键点匹配
- SSH连接：支持远程设备连接和操作
- 测试报告：生成详细的测试执行报告

## 安装说明
1. 创建并激活虚拟环境：
   ```bash
   python -m venv venv_py310
   source venv_py310/bin/activate  # Linux/Mac
   venv_py310\Scripts\activate     # Windows
   ```

2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

## 运行说明
1. 启动Web服务：
   ```bash
   python app.py
   ```

2. 运行测试用例：
   ```bash
   python main.py
   ```

## 配置说明
系统配置存储在 `data/settings.json` 文件中，包含以下配置项：
- host: SSH服务器地址
- port: SSH服务器端口
- username: SSH用户名
- password: SSH密码

## 开发说明
- 使用 Flask 作为 Web 框架
- 使用 Vue.js 和 Element UI 构建前端界面
- 使用 Paramiko 进行 SSH 连接
- 使用 OpenCV 和 scikit-image 进行图像处理

## 注意事项
1. 确保 SSH 服务器配置正确且可访问
2. 定期备份测试用例数据
3. 检查日志文件以排查问题 