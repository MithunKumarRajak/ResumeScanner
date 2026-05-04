from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserDataCreate(BaseModel):
    data_type: str      # 'parsed_resume' | 'resume_build' | 'job_description'
    data: dict


class UserDataOut(BaseModel):
    data: Optional[dict] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
