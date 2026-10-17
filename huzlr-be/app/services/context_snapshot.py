"""Build a current project projection from operational records, never from an LLM."""
import json
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from models.project import Project
from models.project_document import ProjectDocument
from models.issue import Issue, IssueDependency
from models.milestone import Milestone
from models.risk import Risk, Assumption
from models.context import ContextNote, ContextClaim, MeetingProject
from models.scrum_master import ScrumMeeting, MeetingTranscriptSegment
from models.team import Team
from models.workspace import Workspace
from models.property import Property
from services.context_text import plain, digest, chunks
from services.gcs_storage import gcs_storage


async def snapshot(db, project_id, workspace_id):
    project = await db.scalar(select(Project).options(selectinload(Project._property_record))
        .join(Team).join(Workspace).where(Project.project_id == project_id,
             Team.workspace_id == workspace_id, Team.deleted_at.is_(None), Workspace.deleted_at.is_(None)))
    if not project:
        return [], [], []
    nodes, edges, artifacts = [], [], []
    root = f"huzlr:project:{project_id}"
    project_path = f"/projects/{project_id}"

    def edge(source, target, kind, source_id=None):
        edges.append({"source": source, "target": target, "kind": kind, "source_id": source_id or source})

    def node(kind, cid, title, content, path=project_path, **extra):
        text = plain(content)
        item = {"canonical_id": cid, "kind": kind, "workspace_id": workspace_id, "project_id": project_id,
                "title": str(title), "text": text[:2400], "path": path, "source_id": cid,
                "source_version": digest(text), "status": "active", **extra}
        nodes.append(item)
        return item

    def document(kind, cid, title, content, path):
        text = plain(content)
        item = node(kind, cid, title, text, path)
        edge(root, cid, {"Document": "HAS_DOCUMENT", "Meeting": "HAS_MEETING", "Note": "HAS_NOTE"}[kind])
        artifacts.append({"source_id": cid, "version": digest(text), "text": text, "path": path})
        for part in chunks(text):
            chunk_id = f"{cid}:chunk:{part['start']}"
            node("DocumentChunk", chunk_id, title, part["text"], path, source_id=cid,
                 source_version=item["source_version"], start=part["start"], end=part["end"])
            edge(cid, chunk_id, "HAS_CHUNK")

    node("Project", root, project.properties.get("project_title", f"Project {project_id}"), project.properties)
    for kind, model, id_field, rel in [
        ("Milestone", Milestone, "milestone_id", "HAS_MILESTONE"),
        ("Risk", Risk, "risk_id", "HAS_CLAIM"), ("Assumption", Assumption, "assumption_id", "HAS_CLAIM"),
    ]:
        for row in (await db.scalars(select(model).where(model.project_id == project_id))).all():
            cid = f"huzlr:{kind.lower()}:{getattr(row, id_field)}"
            content = {col.name: getattr(row, col.name) for col in model.__table__.columns}
            node(kind, cid, getattr(row, "title", None) or getattr(row, "description", None) or kind, content)
            edge(root, cid, rel)
    issues = list((await db.scalars(select(Issue).options(selectinload(Issue._property_record))
                                  .where(Issue.project_id == project_id))).all())
    for issue in issues:
        cid = f"huzlr:issue:{issue.id}"
        node("Issue", cid, issue.title, {"description": issue.description, "status": issue.status, **issue.properties},
             f"/teams/{project.team_id}/issues/{issue.id}")
        edge(root, cid, "HAS_ISSUE")
        if issue.parent_id:
            edge(cid, f"huzlr:issue:{issue.parent_id}", "SUBTASK_OF")
        if issue.milestone_id:
            edge(cid, f"huzlr:milestone:{issue.milestone_id}", "PART_OF")
    ids = [i.id for i in issues]
    for dep in (await db.scalars(select(IssueDependency).where(or_(IssueDependency.issue_id.in_(ids),
                                            IssueDependency.depends_on_issue_id.in_(ids))))).all():
        edge(f"huzlr:issue:{dep.issue_id}", f"huzlr:issue:{dep.depends_on_issue_id}", "DEPENDS_ON")
    # Explicit project dependency IDs; names and similarity never create edges.
    for value in project.properties.get("dependencies", []):
        if str(value).isdigit():
            edge(root, f"huzlr:project:{int(value)}", "DEPENDS_ON")
    # Restore inbound project dependencies when their target is rebuilt.
    other_properties = (await db.execute(select(Project.project_id, Property.data)
        .join(Team, Team.id == Project.team_id)
        .join(Property, (Property.entity_type == "project") & (Property.entity_id == Project.project_id))
        .where(Team.workspace_id == workspace_id, Project.project_id != project_id))).all()
    for other_id, properties in other_properties:
        if str(project_id) in {str(v) for v in (properties or {}).get("dependencies", [])}:
            edge(f"huzlr:project:{other_id}", root, "DEPENDS_ON")
    for doc in (await db.scalars(select(ProjectDocument).where(ProjectDocument.project_id == project_id))).all():
        content = await gcs_storage.download_text(doc.content_object_name) if doc.content_object_name else doc.content or ""
        document("Document", f"huzlr:document:{doc.document_id}", doc.title, content,
                 f"{project_path}/documents/{doc.document_id}")
    for note in (await db.scalars(select(ContextNote).where(ContextNote.project_id == project_id))).all():
        document("Note", f"huzlr:note:{note.id}", "User-provided context", note.text, project_path)
    meetings = (await db.scalars(select(ScrumMeeting).join(MeetingProject, MeetingProject.meeting_id == ScrumMeeting.id)
        .where(MeetingProject.project_id == project_id, ScrumMeeting.workspace_id == workspace_id))).all()
    for meeting in meetings:
        segments = (await db.scalars(select(MeetingTranscriptSegment).where(MeetingTranscriptSegment.meeting_id == meeting.id)
                                     .order_by(MeetingTranscriptSegment.created_at, MeetingTranscriptSegment.id))).all()
        # Project-qualified canonical ID prevents one linked project replacing another's meeting node.
        content = "\n".join(f"[{s.id}] {s.speaker_type}: {s.text}" for s in segments if s.speaker_type == "participant")
        document("Meeting", f"huzlr:project:{project_id}:meeting:{meeting.id}", meeting.title, content,
                 f"/scrum-master/meetings/{meeting.id}")
    from services.jira.projector import project_sources, PRIVATE_FIELDS
    jira_nodes, jira_edges, jira_artifacts = await project_sources(db, project_id, workspace_id)
    nodes.extend(jira_nodes)
    edges.extend(jira_edges)
    artifacts.extend(jira_artifacts)
    source_metadata = {a["source_id"]: {k: a[k] for k in PRIVATE_FIELDS if k in a} for a in artifacts}
    current_versions = {a["source_id"]: a["version"] for a in artifacts}
    for claim in (await db.scalars(select(ContextClaim).where(ContextClaim.project_id == project_id))).all():
        # Stale-source claims remain in SQL history but can no longer answer current questions.
        status = claim.status if current_versions.get(claim.source_id) == claim.source_version else "superseded"
        cid = f"huzlr:claim:{claim.id}"
        node("Claim", cid, claim.predicate, claim.statement, source_id=claim.source_id,
             source_version=claim.source_version, evidence=claim.evidence, confidence=claim.confidence,
             status=status, recorded_at=claim.created_at.isoformat(), **source_metadata.get(claim.source_id, {}))
        edge(root, cid, "HAS_CLAIM")
        edge(cid, claim.source_id, "SUPPORTED_BY", claim.source_id)
    return nodes, edges, artifacts
