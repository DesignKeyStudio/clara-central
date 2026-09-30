import {
  DetailHeaderSkeleton,
  InfoCardSkeleton,
  KpiGridSkeleton,
  TableSkeleton,
} from "@/components/custom/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DetailHeaderSkeleton />
      <InfoCardSkeleton fields={6} />
      <KpiGridSkeleton count={4} />
      <TableSkeleton columns={5} />
    </div>
  );
}
