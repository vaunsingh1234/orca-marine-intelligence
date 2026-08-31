from fastapi import APIRouter, HTTPException, status

from app.chat.provider import ChatProviderError
from app.chat.schemas import ChatRequest, ChatResponse
from app.chat.service import answer_question

router = APIRouter(tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        return answer_question(payload)
    except ChatProviderError as extra:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=extra.user_message,
        ) from extra
