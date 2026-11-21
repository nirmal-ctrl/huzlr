"use client";

import { useParams } from "next/navigation";
import { WorkerSetup } from "@/components/ai-workers/worker-setup";

export default function EditWorkerPage() {
  const { workerId } = useParams<{ workerId: string }>();
  return <WorkerSetup workerId={workerId} />;
}
