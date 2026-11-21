"use client";

import { Suspense } from "react";
import {
  WorkerWorkspace,
  WorkerWorkspaceLoading,
} from "@/components/ai-workers/worker-workspace";

export default function WorkPage() {
  return (
    <Suspense fallback={<WorkerWorkspaceLoading />}>
      <WorkerWorkspace />
    </Suspense>
  );
}
