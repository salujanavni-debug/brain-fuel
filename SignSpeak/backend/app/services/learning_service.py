from typing import List, Optional

from fastapi import HTTPException, status

from app.models.gesture import CATEGORY_CATALOG, GESTURE_CATALOG, QUIZ_CATALOG
from app.schemas.learning import (
    LearningCategoriesResponse,
    LearningCategorySchema,
    LearningGesturesResponse,
    QuizQuestionFeedback,
    QuizQuestionPublicSchema,
    QuizRequest,
    QuizResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.gesture_service import to_gesture_detail


def get_learning_categories() -> LearningCategoriesResponse:
    categories: List[LearningCategorySchema] = []
    for cat in CATEGORY_CATALOG:
        count = sum(1 for g in GESTURE_CATALOG if g.category.lower() == cat.name.lower())
        categories.append(
            LearningCategorySchema(
                id=cat.id,
                name=cat.name,
                description=cat.description,
                gesture_count=count,
            )
        )

    return LearningCategoriesResponse(
        total=len(categories),
        categories=categories,
    )


def get_learning_gestures(
    *,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
) -> LearningGesturesResponse:
    items = GESTURE_CATALOG

    if category and category.strip().lower() != "all":
        norm_cat = category.strip().lower()
        items = [g for g in items if g.category.lower() == norm_cat]

    if difficulty:
        norm_diff = difficulty.strip().lower()
        items = [g for g in items if g.difficulty.lower() == norm_diff]

    if search:
        query = search.strip().lower()
        items = [
            g
            for g in items
            if query in g.label.lower()
            or query in g.handshape.lower()
            or query in g.movement.lower()
        ]

    details = [to_gesture_detail(g) for g in items]
    return LearningGesturesResponse(total=len(details), gestures=details)


def generate_quiz(payload: QuizRequest) -> QuizResponse:
    questions = QUIZ_CATALOG
    if payload.category and payload.category.strip().lower() != "all":
        norm_cat = payload.category.strip().lower()
        questions = [q for q in questions if q.category.lower() == norm_cat]

    selected = questions[: payload.limit]
    if not selected:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quiz questions found for category '{payload.category}'.",
        )

    public_questions = [
        QuizQuestionPublicSchema(
            id=q.id,
            gesture_id=q.gesture_id,
            category=q.category,
            prompt=q.prompt,
            options=list(q.options),
        )
        for q in selected
    ]
    return QuizResponse(total_questions=len(public_questions), questions=public_questions)


def grade_quiz_submission(payload: QuizSubmitRequest) -> QuizSubmitResponse:
    question_map = {q.id: q for q in QUIZ_CATALOG}
    feedback: List[QuizQuestionFeedback] = []
    correct_count = 0

    for answer in payload.answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz question '{answer.question_id}' does not exist.",
            )

        is_correct = (
            answer.selected_option.strip().lower() == question.correct_answer.strip().lower()
        )
        if is_correct:
            correct_count += 1

        feedback.append(
            QuizQuestionFeedback(
                question_id=question.id,
                selected_option=answer.selected_option,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                explanation=question.explanation,
            )
        )

    total_answered = len(feedback)
    score_pct = round((correct_count / total_answered) * 100, 2) if total_answered else 0.0

    return QuizSubmitResponse(
        total_answered=total_answered,
        correct_count=correct_count,
        score_percentage=score_pct,
        results=feedback,
    )
