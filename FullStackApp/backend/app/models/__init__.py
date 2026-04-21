# Import all models here so SQLAlchemy can discover them when
# Base.metadata.create_all() is called.
from app.models.user   import User,   UserRole       # noqa: F401
from app.models.resume import Resume                  # noqa: F401
from app.models.skill  import Skill, ResumeSkill, JobSkill  # noqa: F401
from app.models.job    import Job                     # noqa: F401
from app.models.match  import Match                   # noqa: F401
