"""中原诗旅智导：异步、有限等待的诗词问答接口。"""
import asyncio
import logging
import math
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI, APIConnectionError, APITimeoutError, APIStatusError
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name('.env'), override=False)
VERSION = '0.2.0-async-timeout-fix'
API_KEY = os.getenv('DASHSCOPE_API_KEY', '').strip()
BASE_URL = os.getenv('DASHSCOPE_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1').strip()
MODEL = os.getenv('DASHSCOPE_MODEL', 'qwen3.5-plus-2026-02-15').strip()

def bounded_number(name, default, lower, upper):
    try:
        value = float(os.getenv(name, str(default)))
        if not math.isfinite(value):
            raise ValueError(name)
        return max(lower, min(value, upper))
    except ValueError:
        return default

# 总deadline至多40秒，给前端60秒超时留出网络余量。
REQUEST_TIMEOUT = bounded_number('REQUEST_TIMEOUT', 30, 1, 40)
MAX_TOKENS = int(bounded_number('MAX_TOKENS', 500, 16, 1000))
MAX_QUESTION_LEN = 2000
DISABLE_THINKING = os.getenv('DISABLE_THINKING', 'true').lower() not in ('0', 'false', 'no')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('poetry_backend')
SYSTEM_PROMPT = (
    '你是中原诗旅智导的诗词文化助手，面向游客和学生。使用简体中文，回答简洁准确，'
    '一般不超过300字。优先回答诗词、诗人、河南文化问题。'
    '不确定作者、出处、创作时间或地点时明确说明，不得编造。'
    '区分文学想象与历史事实、城市关联与具体景点关联。'
    '尚未接入审核后的知识库与路线库，不要声称已检索项目资料。'
    '旅行建议须说明是建议，不能保证实时开放、票价或交通，不编造来源。'
)
client = None

@asynccontextmanager
async def lifespan(app):
    global client
    if API_KEY:
        client = AsyncOpenAI(
            api_key=API_KEY, base_url=BASE_URL, max_retries=0,
            timeout=httpx.Timeout(REQUEST_TIMEOUT, connect=min(10, REQUEST_TIMEOUT)),
        )
    else:
        logger.warning('模型密钥未配置；问答将返回503')
    logger.info('version=%s timeout=%ss retries=0 thinking_disabled=%s', VERSION, REQUEST_TIMEOUT, DISABLE_THINKING)
    try:
        yield
    finally:
        if client is not None:
            await client.close()
            client = None

app = FastAPI(title='中原诗旅智导 · 后端服务', version=VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

class PoetryAskRequest(BaseModel):
    question: str
    conversation_id: str = ''

class AskData(BaseModel):
    answer: str
    sources: list = Field(default_factory=list)
    conversation_id: str

class PoetryAskResponse(BaseModel):
    code: int
    message: str
    data: AskData | None = None

def error(code, message, status, request_id=None):
    return JSONResponse(status_code=status, content={
        'code': code, 'message': message, 'data': None,
    }, headers={'X-Request-ID': request_id} if request_id else {})

@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return error(40001, '参数格式无效：question须为字符串，conversation_id须为字符串', 400)

@app.get('/')
async def root():
    # 健康检查不调用模型，也不表示额度、权限和上游网络已经正常。
    return {'service': '中原诗旅智导后端', 'status': 'ok', 'version': VERSION,
            'model': MODEL, 'key_configured': bool(API_KEY),
            'request_timeout_seconds': REQUEST_TIMEOUT, 'knowledge_base_enabled': False,
            'conversation_memory_enabled': False}

@app.head('/')
async def head_root():
    return JSONResponse(content=None)

@app.post('/api/poetry/ask', response_model=PoetryAskResponse)
async def ask_poetry(payload: PoetryAskRequest):
    question = payload.question.strip()
    if not question:
        return error(40001, 'question 不能为空', 400)
    if len(question) > MAX_QUESTION_LEN:
        return error(40002, 'question过长（上限2000字）', 400)
    conv = payload.conversation_id.strip()
    if len(conv) > 128:
        return error(40003, 'conversation_id过长（上限128字符）', 400)
    conv = conv or uuid.uuid4().hex
    request_id = uuid.uuid4().hex
    if client is None:
        return error(50001, '服务尚未配置模型密钥，请联系管理员', 503, request_id)
    kwargs = dict(model=MODEL, messages=[{'role': 'system', 'content': SYSTEM_PROMPT},
                  {'role': 'user', 'content': question}], max_tokens=MAX_TOKENS, temperature=0.4)
    if DISABLE_THINKING:
        kwargs['extra_body'] = {'enable_thinking': False}
    started = time.monotonic()
    logger.info('ask_start request_id=%s q_len=%d', request_id, len(question))
    try:
        # 真正await异步HTTP，不在事件循环中执行同步网络调用。
        # wait_for限制整次调用时长，而不只是单次网络读操作。
        result = await asyncio.wait_for(client.chat.completions.create(**kwargs), timeout=REQUEST_TIMEOUT)
        if not result.choices or not result.choices[0].message.content:
            return error(50010, '模型未返回有效回答，请重试', 502, request_id)
        answer = result.choices[0].message.content.strip()
        if not answer:
            return error(50010, '模型未返回有效回答，请重试', 502, request_id)
        logger.info('ask_ok request_id=%s elapsed=%.2f answer_len=%d', request_id, time.monotonic()-started, len(answer))
        return {'code': 0, 'message': 'success', 'data': {'answer': answer, 'sources': [], 'conversation_id': conv}}
    except (asyncio.TimeoutError, APITimeoutError):
        logger.warning('ask_timeout request_id=%s elapsed=%.2f', request_id, time.monotonic()-started)
        return error(50004, '模型响应超时，请稍后重试', 504, request_id)
    except APIConnectionError:
        logger.warning('upstream_connection_error request_id=%s', request_id)
        return error(50005, '无法连接模型服务，请管理员检查地域地址和网络', 502, request_id)
    except APIStatusError as exc:
        # 不打印异常正文、Authorization请求头、密钥或用户完整问题。
        status = exc.status_code
        logger.warning('upstream_error request_id=%s upstream_status=%s', request_id, status)
        mapping = {401: (50002, '模型鉴权失败，请管理员检查密钥', 502),
                   403: (50008, '模型权限不足，请管理员检查权限和地域', 502),
                   429: (50003, '模型限流或额度异常，请管理员检查控制台', 503),
                   400: (50006, '模型参数被拒绝，请管理员检查模型代码与参数', 502)}
        code, message, http_status = mapping.get(status, (50007, '模型服务异常，请稍后重试', 502))
        return error(code, message, http_status, request_id)
    except Exception as exc:
        logger.error('unexpected_error request_id=%s type=%s', request_id, type(exc).__name__)
        return error(50009, '模型服务异常，请稍后重试', 502, request_id)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=os.getenv('HOST', '127.0.0.1'), port=int(os.getenv('PORT', '8000')))
