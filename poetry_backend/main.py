
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

# 读取当前目录下的 .env 文件
load_dotenv()

API_KEY = os.getenv("DASHSCOPE_API_KEY")

app = FastAPI(
    title="中原诗旅智导 API",
    description="为中原诗旅智导小程序提供 AI 诗词问答服务",
    version="1.0.0",
)

# 先允许小程序开发阶段的跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str = Field(
        ..., min_length=1, max_length=1000, description="用户的问题"
    )
    conversation_id: str = Field(
        default="", max_length=100, description="对话标识"
    )


class AskData(BaseModel):
    answer: str
    sources: list = []
    conversation_id: str


class AskResponse(BaseModel):
    code: int
    message: str
    data: AskData | None = None


@app.get("/")
def home():
    return {
        "message": "中原诗旅智导后端运行正常",
        "docs": "/docs",
    }


@app.post("/api/poetry/ask", response_model=AskResponse)
def ask_poetry(request: AskRequest):
    if not API_KEY:
        return AskResponse(
            code=500,
            message="服务器未配置 API Key",
            data=None,
        )

    try:
        client = OpenAI(
            api_key=API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

        result = client.chat.completions.create(
            model="qwen3.5-plus-2026-02-15",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是中原诗旅智导的诗词文化助手。"
                        "请用准确、易懂的中文回答诗词、诗人、"
                        "历史文化和旅游相关问题。"
                        "如果不确定事实，请明确说明，不要编造。"
                    ),
                },
                {
                    "role": "user",
                    "content": request.question,
                },
            ],
            max_tokens=500,
        )

        answer = result.choices[0].message.content or "暂时没有生成回答。"
        conversation_id = request.conversation_id or uuid.uuid4().hex

        return AskResponse(
            code=0,
            message="success",
            data=AskData(
                answer=answer,
                sources=[],
                conversation_id=conversation_id,
            ),
        )

    except Exception:
        # 不向用户返回密钥、请求头或完整异常信息
        return AskResponse(
            code=500,
            message="AI 服务暂时不可用，请稍后重试",
            data=None,
        )
