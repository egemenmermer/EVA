"""initial

Revision ID: 001
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('conversation_id', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('context', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'))
    )
    op.create_index('idx_conversation_id', 'conversations', ['conversation_id'])
    op.create_index('idx_role', 'conversations', ['role'])

    # Create feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('conversation_id', sa.String(), nullable=False),
        sa.Column('query_id', sa.String(), nullable=False),
        sa.Column('rating', sa.Integer()),
        sa.Column('comment', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['query_id'], ['conversations.id'])
    ) 