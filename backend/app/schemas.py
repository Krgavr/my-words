from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    login: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class ModuleBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    source_language: str = Field(min_length=1, max_length=50)
    target_language: str = Field(min_length=1, max_length=50)

    @field_validator(
        "name",
        "source_language",
        "target_language",
    )
    @classmethod
    def remove_extra_spaces(cls, value: str) -> str:
        cleaned_value = value.strip()

        if not cleaned_value:
            raise ValueError("Hodnota nesmí být prázdná.")

        return cleaned_value


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(ModuleBase):
    pass


class ModuleResponse(ModuleBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WordBase(BaseModel):
    word: str = Field(min_length=1, max_length=255)
    translation: str = Field(min_length=1, max_length=255)

    @field_validator(
        "word",
        "translation",
    )
    @classmethod
    def remove_word_extra_spaces(cls, value: str) -> str:
        cleaned_value = value.strip()

        if not cleaned_value:
            raise ValueError("Hodnota nesmí být prázdná.")

        return cleaned_value


class WordCreate(WordBase):
    pass


class WordUpdate(WordBase):
    pass


class WordResponse(WordBase):
    id: int
    module_id: int
    is_known: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
