# Docker 使用说明

本文档提供了关于如何使用 Docker 和 Docker Compose 来构建、运行和管理本项目的详细指南。

## 简介

通过 Docker，我们可以将前端和后端应用及其所有依赖项打包到独立的、可移植的容器中。这确保了在不同开发和生产环境中的一致性，并简化了部署流程。

## 先决条件

在开始之前，请确保您的系统已安装以下软件：

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 目录结构

本次 Docker 化方案在项目根目录添加了以下文件：

- `Dockerfile`: 用于构建后端 Flask 应用的 Docker 镜像。
- `frontend.Dockerfile`: 用于构建前端 Next.js 应用的 Docker 镜像。
- `docker-compose.yml`: 用于定义和编排前端、后端服务的配置文件。
- `DOCKER_USAGE.md`: 本使用说明文档。

## 使用方法

所有命令都应在项目的根目录下执行。

### 1. 首次构建和启动

首次启动或在 `Dockerfile` 发生更改后，请使用以下命令。该命令会构建镜像并在前台启动容器，方便您查看实时日志和启动过程。

```bash
docker-compose up --build
```

### 2. 后台运行

如果您希望容器在后台运行，请使用 `-d` (detached) 标志：

```bash
docker-compose up -d
```

### 3. 停止服务

要停止并移除由 `docker-compose up` 创建的容器、网络和卷，请使用：

```bash
docker-compose down
```

### 4. 查看日志

要实时查看正在运行的服务的日志，请使用：

```bash
docker-compose logs -f
```

您也可以只查看特定服务的日志，例如：

```bash
# 只看后端日志
docker-compose logs -f backend

# 只看前端日志
docker-compose logs -f frontend
```

### 5. 重新构建

当您修改了前端或后端的代码后，需要重新构建镜像以应用更改。

```bash
# 重新构建所有服务
docker-compose build

# 只重新构建特定服务
docker-compose build frontend
```

构建完成后，重新使用 `docker-compose up` 即可启动更新后的服务。

## 访问应用

当容器成功启动后，您可以通过以下地址访问应用：

- **前端应用:** [http://localhost:3000](http://localhost:3000)
- **后端 API:** [http://localhost:5000](http://localhost:5000)

## 数据持久化

为了防止容器重启导致数据丢失，后端的 `data` 目录（包含日志、截图、报告等）已通过 Docker 卷挂载到您本地的 `./backend/data` 目录。这意味着容器内对 `/app/data` 的任何写入都会直接反映在您本地的文件系统中，反之亦然。

## 导出构建和镜像

### 1. 构建镜像

如果您需要单独构建前端或后端镜像，可以使用以下命令：

```bash
# 构建后端镜像
docker build -f backend.Dockerfile -t ue-test-backend .

# 构建前端镜像
docker build -f frontend.Dockerfile -t ue-test-frontend .
```

### 2. 导出镜像

将构建好的镜像导出为 .tar 文件，方便在其他环境中使用：

```bash
# 导出后端镜像
docker save -o backend-image.tar ue-test-backend

# 导出前端镜像
docker save -o frontend-image.tar ue-test-frontend

# 同时导出两个镜像
docker save -o app-images.tar ue-test-backend ue-test-frontend
```

**注意**：导出的 .tar 文件默认保存在您执行命令的当前工作目录中。如果您在项目根目录执行这些命令，则导出的文件将位于项目根目录下。

### 3. 使用导出的镜像

在其他环境中使用导出的镜像：

```bash
# 加载后端镜像
docker load -i backend-image.tar

# 加载前端镜像
docker load -i frontend-image.tar

# 加载包含两个镜像的文件
docker load -i app-images.tar
```

### 4. 运行导出的镜像

加载镜像后，您可以单独运行每个容器：

```bash
# 运行后端容器
docker run -d --name backend -p 5000:5000 -v $(pwd)/backend/data:/app/data ue-test-backend

# 运行前端容器
docker run -d --name frontend -p 3000:3000 --env-file ./frontend/.env ue-test-frontend
```

### 5. 创建 Docker Compose 文件

如果您想在其他环境中使用 Docker Compose 运行这些镜像，可以创建一个新的 docker-compose.yml 文件：

```yaml
version: '3'

services:
  backend:
    image: ue-test-backend
    container_name: backend
    ports:
      - "5000:5000"
    volumes:
      - ./backend/data:/app/data

  frontend:
    image: ue-test-frontend
    container_name: frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    env_file:
      - ./frontend/.env
```

然后使用以下命令启动服务：

```bash
docker-compose up -d
```

## 注意事项

1. 确保目标环境已安装 Docker 和 Docker Compose
2. 导出的镜像文件可能较大，传输时请考虑网络带宽
3. 在不同的操作系统上运行时，可能需要调整路径格式（Windows 使用 `\`，Linux/Mac 使用 `/`）
4. 确保目标环境有足够的资源运行这些容器
5. 数据持久化目录需要在目标环境中提前创建