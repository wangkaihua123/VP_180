# 使用轻量级 Python 镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 拷贝项目代码
COPY . .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 启动应用（根据你的程序入口修改）
CMD ["python", "app.py"]
