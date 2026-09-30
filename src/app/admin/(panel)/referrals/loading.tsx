import {
  PageHeaderSkeleton,
  TableSkeleton,
  ToolbarSkeleton,
} from "@/components/custom/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ToolbarSkeleton />
      <TableSkeleton columns={6} />
    </div>
  );
}
