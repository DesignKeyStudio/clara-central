"use client";

import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientValue } from "@/hooks/use-client-value";

/**
 * "Your referral link" card for the partner home. Shows the partner's public
 * `/r/{code}` link with Copy + Open. The absolute URL is built from
 * `window.location.origin` after mount (the first render uses the relative path so
 * SSR and hydration match); leads captured through the link auto-attribute to this
 * partner.
 */
export function ReferralLinkCard({ code }: { code: string }) {
  const origin = useClientValue(() => window.location.origin, "");

  const path = `/r/${code}`;
  const url = origin ? `${origin}${path}` : path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied");
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4 text-muted-foreground" />
          Your referral link
        </CardTitle>
        <CardDescription>
          Share this link with prospects — anyone who submits their details through it is
          automatically attributed to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input readOnly value={url} aria-label="Your referral link" className="flex-1 bg-white" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={copy} className="flex-1 sm:flex-none">
            <Copy className="size-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" asChild className="flex-1 sm:flex-none">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
