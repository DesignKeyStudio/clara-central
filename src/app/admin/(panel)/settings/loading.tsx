import {
  FormCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/custom/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormCardSkeleton fields={3} />
    </div>
  );
}
