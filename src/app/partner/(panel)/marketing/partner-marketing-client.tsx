"use client";

import { useState } from "react";
import { PageHeader } from "@/components/custom/page-header";
import { MarketingPreviewDialog } from "@/components/custom/marketing-preview-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerMarketing } from "@/lib/queries/hooks";
import type { EnrichedMarketingItem } from "@/app/actions/marketing";
import { MaterialCard } from "./material-card";

export function PartnerMarketingClient() {
  const { data: sections = [], isLoading } = usePartnerMarketing();
  const [previewItem, setPreviewItem] = useState<EnrichedMarketingItem | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketing Materials"
        subtitle="Brand assets and collateral to share with prospects."
      />

      {isLoading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No marketing materials are available yet — check back soon.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <h2 className="break-words text-lg font-semibold">{section.title}</h2>
            {section.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this section yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <MaterialCard key={item.id} item={item} onPreview={setPreviewItem} />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <MarketingPreviewDialog
        item={previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
      />
    </div>
  );
}
