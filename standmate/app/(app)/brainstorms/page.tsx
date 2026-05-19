import { SiteHeader } from "@/components/site-header"
import data from "@/constants/data.json"
import { DataTable } from "@/components/data-table"
import { projectColumns, type ProjectData } from "../projects/columns"

export default function Page() {
  return (
    <>
      <SiteHeader title="Brainstorms" />
      <div className="flex flex-1 flex-col gap-4 px-2 py-4">
        <div className="mx-auto w-full max-w-6xl flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <DataTable<ProjectData>
              data={data.map((item: any) => ({ id: item.id, project_id: item.project_id, ...item.properties })) as any[]}
              columns={projectColumns}
            />
          </div>
        </div>
      </div>
    </>
  )
}
