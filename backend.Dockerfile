# 使用官方 Ubuntu 镜像
FROM ubuntu:22.04

# 设置工作目录
WORKDIR /app

# 更新系统并安装 Python 3.10、pip 以及 OpenCV 运行依赖
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# 升级 pip 并安装 Python 依赖
COPY backend/requirements.txt /app/requirements.txt
RUN python3 -m pip install --upgrade pip \
    && python3 -m pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ /app/

# 暴露 Flask 端口
EXPOSE 5000

# 启动 Flask
CMD ["python3", "app.py"]
