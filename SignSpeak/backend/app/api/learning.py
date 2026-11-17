from typing import Optional

from fastapi import APIRouter, Query, status

from app.schemas.learning import (
    LearningCategoriesResponse,
    LearningGesturesResponse,
    QuizRequest,
    QuizResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.learning_service import (
    generate_quiz,
    get_learning_categories,
    get_learning_gestures,
    grade_quiz_submission,
)

router = APIRouter(prefix="/learning", tags=["Learning"])


@router.get(
    "/categories",
    response_model=LearningCategoriesResponse,
    status_code=status.HTTP_200_OK,
    summary="List Learning Categories",
    description="Return available sign language learning categories and gesture counts.",
)
async def list_learning_categories() -> LearningCategoriesResponse:
    return get_learning_categories()


@router.get(
    "/gestures",
    response_model=LearningGesturesResponse,
    status_code=status.HTTP_200_OK,
    summary="List Learning Gestures & Guides",
    description="Return detailed learning materials, handshape guides, and tips for supported gestures.",
)
async def list_learning_gestures(
    category: Optional[str] = Query(default=None, description="Filter by learning category."),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty (Beginner/Intermediate)."),
    search: Optional[str] = Query(default=None, description="Search by gesture name or handshape."),
) -> LearningGesturesResponse:
    return get_learning_gestures(category=category, difficulty=difficulty, search=search)


@router.post(
    "/quiz",
    response_model=QuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch Interactive Quiz Questions",
    description="Return curated sign language quiz questions optionally filtered by category.",
)
async def create_quiz(payload: QuizRequest = QuizRequest()) -> QuizResponse:
    return generate_quiz(payload)


@router.post(
    "/quiz/submit",
    response_model=QuizSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and Score Quiz Answers",
    description="Validate submitted quiz responses against authoritative answers and return total score and feedback.",
)
async def submit_quiz(payload: QuizSubmitRequest) -> QuizSubmitResponse:
    return grade_quiz_submission(payload)
