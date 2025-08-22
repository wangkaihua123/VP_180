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