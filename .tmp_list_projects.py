import asyncio

from sqlalchemy import text

from core.database import engine


async def main() -> None:
    query = text(
        """
        SELECT
            p.project_id,
            p.team_id,
            COALESCE(
                pr.data->>'project_title',
                pr.data->>'name',
                'Project ' || p.project_id::text
            ) AS title,
            COALESCE(pr.data->>'status', '') AS status,
            (SELECT count(*) FROM issues i WHERE i.project_id = p.project_id) AS issues,
            (SELECT count(*) FROM issues i WHERE i.project_id = p.project_id AND i.parent_id IS NULL) AS tasks,
            (SELECT count(*) FROM issues i WHERE i.project_id = p.project_id AND i.parent_id IS NOT NULL) AS subtasks
        FROM projects p
        LEFT JOIN properties pr
            ON pr.entity_type = 'project' AND pr.entity_id = p.project_id
        ORDER BY p.updated_at DESC
        """
    )
    async with engine.connect() as connection:
        result = await connection.execute(query)
        for row in result.mappings():
            print(dict(row))
    await engine.dispose()


asyncio.run(main())
