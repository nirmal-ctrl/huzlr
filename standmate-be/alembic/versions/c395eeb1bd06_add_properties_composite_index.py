"""add_properties_composite_index

Revision ID: c395eeb1bd06
Revises: 8605203d04d7
Create Date: 2026-06-15 22:44:18.067247

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c395eeb1bd06'
down_revision: Union[str, Sequence[str], None] = '8605203d04d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('idx_properties_entity_type_id', 'properties', ['entity_type', 'entity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_properties_entity_type_id', table_name='properties')
