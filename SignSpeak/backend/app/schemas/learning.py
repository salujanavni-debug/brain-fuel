from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.gesture import GestureDetailSchema


class LearningCategorySchema(BaseModel):
    id: str
    name: str
    description: str
    gesture_count: int


class LearningCategoriesResponse(BaseModel):
    total: int
    categories: List[LearningCategorySchema]


class LearningGesturesResponse(BaseModel):
    total: int
    gestures: List[GestureDetailSchema]


class QuizRequest(BaseModel):
    category: Optional[str] = Field(default=None, description="Optional category filter.")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum questions to return.")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": None,
                "limit": 5,
            }
        }
    )


class QuizQuestionPublicSchema(BaseModel):
    id: str
    gesture_id: str
    category: str
    prompt: str
    options: List[str]


class QuizResponse(BaseModel):
    total_questions: int
    questions: List[QuizQuestionPublicSchema]


class QuizAnswerItem(BaseModel):
    question_id: str = Field(..., min_length=1)
    selected_option: str = Field(..., min_length=1)


class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerItem] = Field(..., min_length=1, max_length=20)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "answers": [
                    {"question_id": "q1", "selected_option": "Hello"},
                    {"question_id": "q2", "selected_option": "Water"},
                ]
            }
        }
    )


class QuizQuestionFeedback(BaseModel):
    question_id: str
    selected_option: str
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    total_answered: int
    correct_count: int
    score_percentage: float
    results: List[QuizQuestionFeedback]
