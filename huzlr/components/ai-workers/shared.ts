"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  useGetWorkerProjectsQuery,
  type WorkerProject,
} from "@/services/aiWorkersApi";

export function useWorkerWorkspace() {
  const [mounted, setMounted] = useState(false);
  const selectedWorkspaceId = useAppSelector(
    (state) => state.workspace.activeWorkspaceId,
  );
  const workspaceId = mounted ? selectedWorkspaceId : null;
  useEffect(() => setMounted(true), []);
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId);
  const teams = useAppSelector((state) => state.workspace.teams);
  const teamId = teams.some(
    (team) => team.id === activeTeamId && team.workspace_id === workspaceId,
  )
    ? activeTeamId
    : null;
  return { workspaceId, teamId, isReady: mounted };
}

export function useWorkerProjects() {
  const { workspaceId, teamId } = useWorkerWorkspace();
  const query = useGetWorkerProjectsQuery(
    { workspaceId: workspaceId ?? 0, teamId },
    { skip: !workspaceId },
  );
  return { ...query, projects: query.currentData ?? [], workspaceId };
}

export function workerProjectName(project: WorkerProject) {
  return (
    project.properties.project_title ||
    project.properties.title ||
    `Project ${project.project_id}`
  );
}

export function workerError(error: unknown) {
  if (typeof error === "object" && error && "data" in error) {
    const data = (
      error as { data?: { detail?: string | Array<{ msg?: string }> } }
    ).data;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail))
      return data.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
  }
  return "Please try again. Your changes are still here.";
}
