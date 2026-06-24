from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Text
from models.base import Base
from sqlalchemy.orm import relationship, foreign
from sqlalchemy import ForeignKey, Date, Boolean

class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.project_id"), nullable=False)
    milestone_id: Mapped[int | None] = mapped_column(ForeignKey("milestones.milestone_id"), nullable=True)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    estimated_end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    critical_path_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Recursive Subtasks Support
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("issues.id"), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="issues")
    
    _property_record: Mapped["Property"] = relationship(
        "Property",
        primaryjoin="and_(foreign(Property.entity_id) == Issue.id, Property.entity_type == 'issue')",
        viewonly=False,
        uselist=False,
        cascade="all, delete-orphan"
    )

    @property
    def properties(self) -> dict:
        return self._property_record.data if self._property_record else {}

    @properties.setter
    def properties(self, value: dict):
        from models.property import Property
        if self._property_record:
            self._property_record.data = value
        else:
            self._property_record = Property(entity_type="issue", data=value)
            
    milestone: Mapped["Milestone"] = relationship("Milestone", back_populates="issues")
    dependencies: Mapped[list["IssueDependency"]] = relationship(
        "IssueDependency",
        foreign_keys="IssueDependency.issue_id",
        back_populates="issue",
        cascade="all, delete-orphan"
    )
    
    parent: Mapped["Issue"] = relationship("Issue", remote_side=[id], back_populates="subtasks")
    subtasks: Mapped[list["Issue"]] = relationship("Issue", back_populates="parent", cascade="all, delete-orphan")


class IssueDependency(Base):
    __tablename__ = "issue_dependencies"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    issue_id: Mapped[int] = mapped_column(Integer, ForeignKey("issues.id"), nullable=False)
    depends_on_issue_id: Mapped[int] = mapped_column(Integer, ForeignKey("issues.id"), nullable=False)
    
    # Relationships
    issue: Mapped["Issue"] = relationship("Issue", foreign_keys=[issue_id], back_populates="dependencies")
    depends_on_issue: Mapped["Issue"] = relationship("Issue", foreign_keys=[depends_on_issue_id])
