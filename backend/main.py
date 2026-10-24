# -*- coding: utf-8 -*-
"""
中原诗旅智导 · 成员 B 后端服务（首版：基础文字问答）
=====================================================
技术栈：FastAPI + Uvicorn + python-dotenv + openai SDK
模型：  阿里云百炼（DashScope）通义千问，OpenAI 兼容模式
接口：  POST /api/poetry/ask

安全约定：
- API Key 只从环境变量或本地 backend/.env 读取，绝不写入前端、公开仓库或日志；
- 日志中不打印密钥，不记录用户完整提问内容（只记录长度与会话标识）；
- 未接入真实知识库前，data.sources 恒为空数组，不伪造检索来源。
"""

import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    OpenAI,
    PermissionDeniedError,
    RateLimitError,
)
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 配置：仅从环境变量 / 本地 .env 读取
# ---------------------------------------------------------------------------
load_dotenv()  # 读取 backend/.env，不覆盖已存在的系统环境变量

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "").strip()
DASHSCOPE_BASE_URL = os.getenv(
    "DASHSCOPE_BASE_URL",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
).strip()
# 模型代码以百炼控制台"模型广场"实际可调用为准，通过 .env 的 DASHSCOPE_MODEL 配置
DASHSCOPE_MODEL = os.getenv("DASHSCOPE_MODEL", "qwen3.5-plus-2026-02-15").strip()
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "30"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "800"))
MAX_QUESTION_LEN = int(os.getenv("MAX_QUESTION_LEN", "2000"))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Windows 控制台输出中文日志时避免 GBK 编码报错
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(errors="replace")
        sys.stderr.reconfigure(errors="replace")
    except Exception:  # noqa: BLE001
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("poetry_backend")

# ---------------------------------------------------------------------------
# 系统提示词：面向游客与学生，优先中原诗词文化，不编造
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "你是“中原诗旅智导”小程序的 AI 诗词文化问答助手，服务对象是来河南（中原）"
    "旅游的游客和学习古诗词的学生。请遵循以下规则：\n"
    "1. 使用简体中文，口吻清晰、友好、有条理，优先围绕诗词、诗人、景点与中原文化的关系作答。\n"
    "2. 遇到与诗词文化无关、或你自己也不确定的问题时，明确说明不确定，绝不编造作者、出处或历史事实。\n"
    "3. 涉及诗词原文时尽量引用原句并给出白话解释；涉及景点、研学时给出简洁实用的介绍或建议。\n"
    "4. 回答控制在 300 字以内，重点突出，方便手机端阅读。"
)

# ---------------------------------------------------------------------------
# 请求 / 响应模型（接口约定：code / message / data.answer / data.sources / data.conversation_id）
# ---------------------------------------------------------------------------
class PoetryAskRequest(BaseModel):
    question: str = Field(..., description="用户问题（必填，去除空格后不能为空）")
    conversation_id: str = Field("", description="会话标识；为空时由服务端生成")


class PoetryAskResponse(BaseModel):
    code: int = Field(..., description="0 表示成功")
    message: str = Field(..., description="状态说明")
    data: dict = Field(..., description="answer / sources / conversation_id")


client: OpenAI | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动检查：密钥缺失时给出明确提示，不打印密钥本身。"""
    global client
    if not DASHSCOPE_API_KEY:
        logger.warning(
            "未检测到 DASHSCOPE_API_KEY：请在 backend/.env 中填写真实密钥后重启服务；"
            "在此之前 /api/poetry/ask 将返回“密钥缺失”错误。"
        )
    else:
        client = OpenAI(
            api_key=DASHSCOPE_API_KEY,
            base_url=DASHSCOPE_BASE_URL,
            timeout=REQUEST_TIMEOUT,
            max_retries=1,  # 控制重试次数，避免免费额度被无谓消耗
        )
        logger.info(
            "百炼客户端已初始化：模型=%s 超时=%.0fs max_tokens=%d",
            DASHSCOPE_MODEL,
            REQUEST_TIMEOUT,
            MAX_TOKENS,
        )
    yield


app = FastAPI(
    title="中原诗旅智导 · 后端服务",
    description="AI 诗词文化问答接口（成员 B）",
    version="0.1.0",
    lifespan=lifespan,
)

# 浏览器调试跨域（微信小程序 wx.request 不依赖 CORS，此处仅为方便本地网页调试）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def err(code: int, message: str, http_status: int) -> JSONResponse:
    """统一错误 JSON：{code, message, data:null}"""
    return JSONResponse(
        status_code=http_status,
        content={"code": code, "message": message, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """把 FastAPI 默认 422 转为统一 JSON 的 400（含缺失字段与无效 JSON）。"""
    err_types = {e.get("type") for e in exc.errors()}
    if "json_invalid" in err_types:
        return err(40004, "请求体不是有效的 JSON，请检查 Content-Type 与格式", 400)
    return err(40001, "请求参数无效：question 必须为字符串且不能为空", 400)


@app.get("/")
async def root():
    return {
        "service": "中原诗旅智导后端",
        "status": "ok",
        "model": DASHSCOPE_MODEL,
        "key_configured": bool(DASHSCOPE_API_KEY),
    }


@app.post("/api/poetry/ask", response_model=PoetryAskResponse)
async def poetry_ask(payload: PoetryAskRequest):
    """核心接口：接收问题 -> 调用百炼模型 -> 统一 JSON 响应。"""
    question = payload.question.strip()
    if not question:
        return err(40001, "question 不能为空", 400)
    if len(question) > MAX_QUESTION_LEN:
        return err(40002, f"question 过长（上限 {MAX_QUESTION_LEN} 字）", 400)

    conv_id = (payload.conversation_id or "").strip()
    if len(conv_id) > 128:
        return err(40003, "conversation_id 过长（上限 128 字符）", 400)
    if not conv_id:
        conv_id = uuid.uuid4().hex  # 服务端生成会话标识

    if client is None:
        logger.error("密钥缺失，拒绝处理请求 conv=%s", conv_id)
        return err(
            50001,
            "服务未配置模型密钥，请管理员在 backend/.env 中填写 DASHSCOPE_API_KEY 后重启",
            503,
        )

    try:
        resp = client.chat.completions.create(
            model=DASHSCOPE_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            max_tokens=MAX_TOKENS,
            temperature=0.4,
        )
    except AuthenticationError:
        logger.error("模型服务鉴权失败（API Key 无效）conv=%s", conv_id)
        return err(50002, "模型服务鉴权失败，请检查 DASHSCOPE_API_KEY 是否正确", 502)
    except RateLimitError:
        logger.error("模型服务限流或免费额度已用完 conv=%s", conv_id)
        return err(50003, "模型服务限流或免费额度已用完，请稍后再试", 503)
    except APITimeoutError:
        logger.error("模型调用超时（%.0fs）conv=%s", REQUEST_TIMEOUT, conv_id)
        return err(50004, "模型服务响应超时，请稍后再试", 504)
    except APIConnectionError:
        logger.error("无法连接模型服务 conv=%s", conv_id)
        return err(50005, "无法连接模型服务，请检查网络后重试", 502)
    except BadRequestError as e:
        logger.error("模型请求被拒绝 conv=%s err=%s", conv_id, str(e)[:150])
        return err(
            50006,
            "模型请求被拒绝：请检查 DASHSCOPE_MODEL 是否为控制台可调用的模型代码",
            400,
        )
    except PermissionDeniedError:
        logger.error("账号无权限调用该模型 conv=%s", conv_id)
        return err(50008, "当前账号无权限调用该模型，请联系管理员", 403)
    except InternalServerError:
        logger.error("模型服务内部错误 conv=%s", conv_id)
        return err(50007, "模型服务内部错误，请稍后再试", 502)
    except Exception as e:  # noqa: BLE001
        logger.error("未知上游错误 conv=%s err=%s", conv_id, str(e)[:200])
        return err(50009, "模型服务异常，请稍后再试", 502)

    if not resp.choices:
        return err(50010, "模型返回为空，请重试", 502)
    answer = (resp.choices[0].message.content or "").strip()
    if not answer:
        return err(50010, "模型返回为空，请重试", 502)

    # 日志只记录长度与会话标识，不记录用户完整提问，也不记录密钥
    logger.info("问答成功 conv=%s q_len=%d answer_len=%d", conv_id, len(question), len(answer))
    return {
        "code": 0,
        "message": "success",
        "data": {
            "answer": answer,
            "sources": [],  # 首版未接入知识库，恒为空数组
            "conversation_id": conv_id,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
