from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Text, Date, ForeignKey, Boolean
from datetime import datetime, date
from models.base import Base

class Milestone(Base):
    __tablename__ = "milestones"
    
    milestone_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="milestones")
    issues: Mapped[list["Issue"]] = relationship("Issue", back_populates="milestone")
