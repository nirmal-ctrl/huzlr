"""allow multiple Google Calendar connections per workspace

Revision ID: 9b2c3d4e5f6a
Revises: 8f1c2d3e4a5b
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9b2c3d4e5f6a"
down_revision: Union[str, Sequence[str], None] = "8f1c2d3e4a5b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for constraint in inspector.get_unique_constraints("google_calendar_connections"):
        if set(constraint.get("column_names") or []) == {"workspace_id"}:
            op.drop_constraint(constraint["name"], "google_calendar_connections", type_="unique")

    workspace_index = next(
        (index for index in inspector.get_indexes("google_calendar_connections")
         if index["name"] == "ix_google_calendar_connections_workspace_id"),
        None,
    )
    if workspace_index and workspace_index.get("unique"):
        op.drop_index("ix_google_calendar_connections_workspace_id", table_name="google_calendar_connections")
        op.create_index(
            "ix_google_calendar_connections_workspace_id",
            "google_calendar_connections",
            ["workspace_id"],
            unique=False,
        )

    op.create_unique_constraint(
        "uq_google_calendar_connection_workspace_email",
        "google_calendar_connections",
        ["workspace_id", "email"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_google_calendar_connection_workspace_email",
        "google_calendar_connections",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_google_calendar_connections_workspace_id",
        "google_calendar_connections",
        ["workspace_id"],
    )
