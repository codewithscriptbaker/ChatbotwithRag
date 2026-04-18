# ChatGPT Lite

[English](./README.md) | 简体中文

ChatGPT Lite 是一个功能完整、支持私有化部署的 ChatGPT 应用。**前端**基于 Next.js。可选的 **FastAPI 后端**（[`backend/`](./backend/)）提供 RAG 能力：知识文件夹、文档上传、ChromaDB 向量存储、通过 [Ollama](https://ollama.com/) 对话，以及基于 WhisperX 的服务端语音转写。

## 演示

访问 [ChatGPT Lite 演示网站](https://gptlite.vercel.app)

| 浅色主题 | 深色主题 |
|:--------:|:-------:|
| ![浅色主题](./docs/images/demo.jpg) | ![深色主题](./docs/images/demo-dark.jpg) |

## 功能介绍

**功能：**

- **实时流式响应** - 通过 Server-Sent Events 实现逐字输出
- **丰富的 Markdown 渲染** - 完整支持 Markdown 语法及代码高亮
- **角色系统** - 创建并切换不同的 AI 人设，自定义系统提示词
- **多会话管理** - 轻松组织和切换多个聊天会话
- **持久化聊天记录** - 对话保存在浏览器侧；界面不依赖账号数据库（启用 RAG 时后端会本地持久化向量数据，见下文）
- **文件附件** - 支持直接上传图片、PDF、电子表格（XLSX/CSV）及文本文件
- **RAG 与知识工作区**（可选） - 在运行 FastAPI 与 Ollama 时支持文件夹、文档入库与检索增强对话
- **语音输入** - 通过 Web Speech API 识别；也可走服务端 WhisperX 转写（需后端）
- **联网搜索** - 模型支持时可搜索网络，并显示来源引用
- **支持 OpenAI、Azure OpenAI 及 OpenAI 兼容 API 提供商**
- **40+ UI 主题**
- **响应式设计** - 适配桌面与移动端，可折叠侧边栏

本项目基于 [ChatGPT Minimal](https://github.com/blrchen/chatgpt-minimal) 扩展开发，在其基础上增加了主题系统、角色系统、文件附件、语音输入等功能。如果只需要核心聊天功能，可以直接使用 ChatGPT Minimal，代码量小，代码清晰，易于扩展。

## 部署

部署所需的环境变量请参考[环境变量](#环境变量)章节。

### 部署到 Vercel

点击下方按钮即可一键部署：

[![使用Vercel部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fblrchen%2Fchatgpt-lite&project-name=chatgpt-lite&framework=nextjs&repository-name=chatgpt-lite)

### 使用 Docker 部署

发布的镜像仅包含 **Next.js** 应用。**RAG 相关能力**需要单独运行 FastAPI 服务（见[本地开发](#本地开发)），并通过 `RAG_BACKEND_URL` 以及将 `/api/rag/*` 正确反代到后端来访问。

OpenAI 账户：

```bash
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY="<你的_OPENAI_API_KEY>" \
  blrchen/chatgpt-lite
```

Azure OpenAI 账户：

```bash
docker run -d -p 3000:3000 \
  -e AZURE_OPENAI_RESOURCE_NAME="<你的_AZURE_RESOURCE_NAME>" \
  -e AZURE_OPENAI_API_KEY="<你的_AZURE_OPENAI_API_KEY>" \
  -e AZURE_OPENAI_DEPLOYMENT="<你的_AZURE_OPENAI_DEPLOYMENT_NAME>" \
  blrchen/chatgpt-lite
```

## 本地开发

### 仅前端

1. 安装 Node.js 22+。
2. 克隆本仓库。
3. 运行 `npm install` 安装依赖。
4. 将 `.env.example` 复制为 `.env.local` 并根据需要修改环境变量。
5. 运行 `npm run dev` 启动应用。
6. 在浏览器访问 http://localhost:3000。

以上即可使用 OpenAI 或 Azure 的标准聊天能力。`/api/rag/*` 相关能力需要后端（见下文）。

### 带 RAG 后端（全栈）

1. 安装并运行 [Ollama](https://ollama.com/)，并拉取 `OLLAMA_CHAT_MODEL` 中配置的模型（见 [`backend/.env.example`](./backend/.env.example)）。
2. 安装 **Python 3.11+**，建议在 `backend/` 下创建虚拟环境。
3. 在 `backend/` 执行 `pip install -r requirements.txt`（嵌入模型、WhisperX、ChromaDB 体积较大，请预留磁盘与内存）。
4. 将 [`backend/.env.example`](./backend/.env.example) 复制为 `backend/.env` 并按需修改。
5. 在 `backend/` 运行 `python run.py`（默认监听 `http://127.0.0.1:8000`，具体见 `HOST` / `PORT`）。
6. 若后端不在 `http://127.0.0.1:8000`，在项目根目录的 `.env.local` 中设置 `RAG_BACKEND_URL`。
7. 在项目根目录执行 `npm run dev`，浏览器访问 http://localhost:3000。

**启动顺序：** Ollama → FastAPI → Next.js。开发环境下 `next.config.ts` 将 `/api/rag/*` 重写至 `http://127.0.0.1:8000/api/v1/*`；聊天接口路由通过 `RAG_BACKEND_URL` 以服务端方式调用 `/api/v1/chat`。

## 环境变量

### Next.js（项目根目录）

以下环境变量为使用云端大模型时的必填项：

**OpenAI 账户：**

| 名称                | 说明                                                                             | 默认值                 |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| OPENAI_API_BASE_URL | （可选）如需为 `api.openai.com` 配置反向代理可设此变量。                             | https://api.openai.com |
| OPENAI_API_KEY      | 从 [OpenAI API](https://platform.openai.com/account/api-keys) 获取的密钥字符串。 |                        |
| OPENAI_MODEL        | （可选）使用的 GPT 模型                                                          | gpt-4o-mini          |

**Azure OpenAI 账户：**

| 名称                       | 说明                                          |
| -------------------------- | --------------------------------------------- |
| AZURE_OPENAI_RESOURCE_NAME | Azure 资源名称（如 "my-openai-resource"）     |
| AZURE_OPENAI_API_KEY       | 密钥                                          |
| AZURE_OPENAI_DEPLOYMENT    | 模型部署名称（不是模型名）                    |

**RAG 集成（可选）：**

| 名称            | 说明                                                         | 默认值                  |
| --------------- | ------------------------------------------------------------ | ----------------------- |
| RAG_BACKEND_URL | Next.js 聊天路由（`/api/chat`）访问 FastAPI 时使用的基地址。 | `http://127.0.0.1:8000` |

### FastAPI 后端

Ollama、嵌入模型、WhisperX、上传限制、ChromaDB 持久化目录以及 `HOST` / `PORT` 等见 [`backend/.env.example`](./backend/.env.example)。

## 致谢

- 主题代码来自 [tweakcn](https://github.com/jnsahaj/tweakcn)

## 贡献

欢迎提交各种规模的 PR。
