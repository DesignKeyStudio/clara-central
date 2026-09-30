import {
  DetailHeaderSkeleton,
  InfoCardSkeleton,
  TableSkeleton,
} from "@/components/custom/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DetailHeaderSkeleton />
      <InfoCardSkeleton fields={6} />
      <TableSkeleton columns={5} />
    </div>
  );
}
