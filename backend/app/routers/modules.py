from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, VocabularyModule
from ..schemas import ModuleCreate, ModuleResponse, ModuleUpdate
from ..security import get_current_user


router = APIRouter(
    prefix="/modules",
    tags=["modules"],
)


def get_user_module(
    module_id: int,
    current_user: User,
    db: Session,
) -> VocabularyModule:
    module = (
        db.query(VocabularyModule)
        .filter(
            VocabularyModule.id == module_id,
            VocabularyModule.user_id == current_user.id,
        )
        .first()
    )

    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modul nebyl nalezen.",
        )

    return module


@router.post(
    "",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_module(
    module_data: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_module = VocabularyModule(
        user_id=current_user.id,
        name=module_data.name,
        source_language=module_data.source_language,
        target_language=module_data.target_language,
    )

    db.add(new_module)
    db.commit()
    db.refresh(new_module)

    return new_module


@router.get(
    "",
    response_model=list[ModuleResponse],
)
def get_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    modules = (
        db.query(VocabularyModule)
        .filter(VocabularyModule.user_id == current_user.id)
        .order_by(VocabularyModule.created_at.desc())
        .all()
    )

    return modules


@router.get(
    "/{module_id}",
    response_model=ModuleResponse,
)
def get_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_module(
        module_id=module_id,
        current_user=current_user,
        db=db,
    )


@router.put(
    "/{module_id}",
    response_model=ModuleResponse,
)
def update_module(
    module_id: int,
    module_data: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_user_module(
        module_id=module_id,
        current_user=current_user,
        db=db,
    )

    module.name = module_data.name
    module.source_language = module_data.source_language
    module.target_language = module_data.target_language

    db.commit()
    db.refresh(module)

    return module


@router.delete(
    "/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_user_module(
        module_id=module_id,
        current_user=current_user,
        db=db,
    )

    db.delete(module)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)