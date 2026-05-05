# Import all models here so SQLAlchemy can discover them when
# Base.metadata.create_all() is called.
from app.models.user   import User,   UserRole       # noqa: F401
from app.models.resume import Resume                  # noqa: F401
from app.models.skill  import Skill, ResumeSkill, JobSkill  # noqa: F401
from app.models.job    import Job                     # noqa: F401
from app.models.match     import Match                   # noqa: F401
from app.models.user_data import UserData                # noqa: F401

# ── Phase-2 models ──────────────────────────────────────────────
from app.models.candidate    import CandidateProfile                              # noqa: F401
from app.models.analysis     import ResumeAnalysis                                # noqa: F401
from app.models.bulk_job     import BulkJob, BulkJobStatus                        # noqa: F401
from app.models.notification import EmailNotification, NotificationType, NotificationStatus  # noqa: F401

# ── Phase-3 models ──────────────────────────────────────────────
from app.models.phase3 import CustomModelConfig, BiasAuditLog                             # noqa: F401
