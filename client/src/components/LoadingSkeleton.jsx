export const CardSkeleton = () => (
  <div className="bg-card border border-cardBorder rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-4" />
    <div className="h-8 bg-gray-700 rounded w-1/2 mb-4" />
    <div className="h-3 bg-gray-700 rounded w-full mb-2" />
    <div className="h-3 bg-gray-700 rounded w-5/6" />
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-card border border-cardBorder rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
    <div className="h-10 bg-gray-700 rounded w-1/2" />
  </div>
);

export const ListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-card border border-cardBorder rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    ))}
  </div>
);
