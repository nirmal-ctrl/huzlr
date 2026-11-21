"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppSelector } from "@/lib/redux/hooks";

const routeMapping: Record<string, string> = {
  projects: "Projects",
  issues: "Issues",
  new: "New Project",
  brainstorms: "Brainstorms",
  dashboard: "Dashboard",
  documents: "Documents",
  "scrum-master": "Scrum Master",
  "ai-workers": "AI Workers",
  executions: "Executions",
  edit: "Edit worker",
  work: "Work",
  meetings: "Meetings",
  settings: "Settings",
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const teams = useAppSelector((state) => state.workspace.teams);
  const projects = useAppSelector((state) => state.projects.items);

  // If we are on home page
  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {segments.map((segment, index) => {
          if (
            segments[0] === "ai-workers" &&
            ["executions", "edit"].includes(segments[2]) &&
            index === 1
          )
            return null;
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join("/")}`;

          // Format the label
          let label: string = routeMapping[segment] || "";
          if (segment === "new" && segments[0] === "ai-workers")
            label = "Create worker";
          if (!label) {
            // Fallback: capitalize or show segment as is (e.g. for IDs)
            // Check if it looks like an ID (numeric or long string)
            if (/^\d+$/.test(segment)) {
              const numId = parseInt(segment);
              const matchedTeam = teams.find((t: any) => t.id === numId);
              const matchedProject = projects.find(
                (p: any) => p.project_id === numId,
              );
              if (matchedTeam) {
                label = matchedTeam.name;
              } else if (matchedProject) {
                label =
                  (matchedProject.properties?.project_title as string) ||
                  (matchedProject.properties?.title as string) ||
                  `Project ${numId}`;
              } else {
                label = `#${segment}`;
              }
            } else {
              label = segment.charAt(0).toUpperCase() + segment.slice(1);
            }
          }

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast || segment === "documents" ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : segments[0] === "ai-workers" ? (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
