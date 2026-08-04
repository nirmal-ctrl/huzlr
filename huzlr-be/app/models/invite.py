from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, BigInteger, ForeignKey, Enum as SAEnum, DateTime, UniqueConstraint, and_, Index
from datetime import datetime
import enum
from models.base import Base

class InviteRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class InviteStatusEnum(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.id"), nullable=False)
    role: Mapped[InviteRoleEnum] = mapped_column(SAEnum(InviteRoleEnum, name="invite_role_enum"), default=InviteRoleEnum.USER)
    status: Mapped[InviteStatusEnum] = mapped_column(SAEnum(InviteStatusEnum, name="invite_status_enum"), default=InviteStatusEnum.PENDING)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        Index('idx_pending_invite_email_workspace', 'email', 'workspace_id', unique=True, postgresql_where=(status == 'pending')),
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="invites")
