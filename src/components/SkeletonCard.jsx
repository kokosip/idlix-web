import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-dark-card border border-dark-border/40 animate-pulse flex flex-col h-full">
      <div className="aspect-[2/3] w-full bg-dark-surface/80" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-dark-surface/80 rounded w-3/4" />
        <div className="flex items-center justify-between">
          <div className="h-3 bg-dark-surface/60 rounded w-1/3" />
          <div className="h-3 bg-dark-surface/60 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
