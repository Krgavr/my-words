from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, VocabularyModule, WordCard
from ..schemas import WordCreate, WordResponse, WordUpdate
from ..security import get_current_user
from .modules import get_user_module


router = APIRouter(
    tags=["words"],
)


def get_user_word(
    word_id: int,
    current_user: User,
    db: Session,
) -> WordCard:
    word_card = (
        db.query(WordCard)
        .join(
            VocabularyModule,
            WordCard.module_id == VocabularyModule.id,
        )
        .filter(
            WordCard.id == word_id,
            VocabularyModule.user_id == current_user.id,
        )
        .first()
    )

    if word_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slovíčko nebylo nalezeno.",
        )

    return word_card


@router.post(
    "/modules/{module_id}/words",
    response_model=WordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_word(
    module_id: int,
    word_data: WordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_user_module(
        module_id=module_id,
        current_user=current_user,
        db=db,
    )

    new_word = WordCard(
        module_id=module.id,
        word=word_data.word,
        translation=word_data.translation,
        is_known=False,
    )

    db.add(new_word)
    db.commit()
    db.refresh(new_word)

    return new_word


@router.get(
    "/modules/{module_id}/words",
    response_model=list[WordResponse],
)
def get_module_words(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_user_module(
        module_id=module_id,
        current_user=current_user,
        db=db,
    )

    words = (
        db.query(WordCard)
        .filter(WordCard.module_id == module.id)
        .order_by(WordCard.created_at.desc())
        .all()
    )

    return words


@router.put(
    "/words/{word_id}",
    response_model=WordResponse,
)
def update_word(
    word_id: int,
    word_data: WordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word_card = get_user_word(
        word_id=word_id,
        current_user=current_user,
        db=db,
    )

    word_card.word = word_data.word
    word_card.translation = word_data.translation

    db.commit()
    db.refresh(word_card)

    return word_card


@router.patch(
    "/words/{word_id}/known",
    response_model=WordResponse,
)
def mark_word_as_known(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word_card = get_user_word(
        word_id=word_id,
        current_user=current_user,
        db=db,
    )

    word_card.is_known = True

    db.commit()
    db.refresh(word_card)

    return word_card


@router.patch(
    "/words/{word_id}/unknown",
    response_model=WordResponse,
)
def mark_word_as_unknown(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word_card = get_user_word(
        word_id=word_id,
        current_user=current_user,
        db=db,
    )

    word_card.is_known = False

    db.commit()
    db.refresh(word_card)

    return word_card


@router.delete(
    "/words/{word_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_word(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word_card = get_user_word(
        word_id=word_id,
        current_user=current_user,
        db=db,
    )

    db.delete(word_card)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
