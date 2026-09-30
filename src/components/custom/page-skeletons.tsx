import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Composable skeleton building blocks for route `loading.tsx` boundaries.
 * Each mirrors the shape of a real page region (see <PageHeader>, <KpiCard>,
 * <DataTable>, detail pages) so the Suspense fallback shows instantly on
 * navigation with minimal layout shift when the hydrated content swaps in.
 */

/** Title + subtitle block — matches <PageHeader />. */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}

/** Responsive row of KPI cards — matches the <KpiCard /> grid (h-[86px]). */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="h-[86px] gap-0 rounded-xl border">
          <CardContent className="flex h-full items-center justify-between p-[17px]">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-11 w-11 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Search + filter toolbar row above a table. */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-full sm:w-[150px]" />
      <Skeleton className="h-10 w-full sm:w-[150px]" />
    </div>
  );
}

/** Bordered table with a header row + N body rows — matches <DataTable />. */
export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <TableCell key={c}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Back link + avatar/title header + action buttons — matches detail pages. */
export function DetailHeaderSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </>
  );
}

/** Multi-column label/value info card — matches detail info panels. */
export function InfoCardSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Settings/form card: header + N field groups + a submit button. */
export function FormCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card className="max-w-xl">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-64" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}
