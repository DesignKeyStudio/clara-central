import {
  KpiGridSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  ToolbarSkeleton,
} from "@/components/custom/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={3} />
      <ToolbarSkeleton />
      <TableSkeleton columns={5} />
    </div>
  );
}
