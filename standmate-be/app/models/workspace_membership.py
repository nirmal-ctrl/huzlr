from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, ForeignKey, Enum as SAEnum, UniqueConstraint
from datetime import datetime
import enum
from models.base import Base

class WorkspaceRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id"), nullable=False)
    role: Mapped[WorkspaceRoleEnum] = mapped_column(SAEnum(WorkspaceRoleEnum, name="workspace_role_enum"), default=WorkspaceRoleEnum.USER)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'workspace_id', name='uq_user_workspace'),
    )

    # Relationships
    user = relationship("User", back_populates="workspace_memberships")
    workspace = relationship("Workspace", back_populates="memberships")
