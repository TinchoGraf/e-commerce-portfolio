"""add_partial_index_cart_items

Revision ID: 2cb2ec7d1017
Revises: 7d67e9bd06a9
Create Date: 2026-07-08 19:04:08.928969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cb2ec7d1017'
down_revision: Union[str, Sequence[str], None] = '7d67e9bd06a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Los NULL no participan de UniqueConstraint en Postgres: este índice parcial
    # evita duplicados de (user_id, product_id) en cart_items cuando variant_id es NULL.
    op.create_index(
        'ix_cart_item_user_product_no_variant',
        'cart_items',
        ['user_id', 'product_id'],
        unique=True,
        postgresql_where=sa.text('variant_id IS NULL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'ix_cart_item_user_product_no_variant',
        table_name='cart_items',
        postgresql_where=sa.text('variant_id IS NULL'),
    )
