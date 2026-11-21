"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfiniteScroll({
  hasMore,
  fetching,
  error,
  loadMore,
  count,
}: {
  hasMore: boolean;
  fetching: boolean;
  error: boolean;
  loadMore: () => unknown;
  count: number;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = sentinel.current;
    if (
      !element ||
      !hasMore ||
      fetching ||
      error ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, fetching, error, loadMore, count]);

  return (
    <div
      ref={sentinel}
      className="flex min-h-20 flex-col items-center justify-center gap-2 py-5"
    >
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-muted-foreground"
      >
        {fetching ? (
          <span className="flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading more…
          </span>
        ) : error ? (
          "We couldn’t load more items. Your current list is still here."
        ) : hasMore ? (
          `${count} loaded`
        ) : (
          `All ${count} loaded`
        )}
      </p>
      {hasMore && !fetching && (
        <Button variant="outline" size="sm" onClick={loadMore}>
          {error ? "Try again" : "Load more"}
        </Button>
      )}
    </div>
  );
}
