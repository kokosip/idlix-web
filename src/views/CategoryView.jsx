import React, { useState, useEffect } from 'react';
import { Filter, ArrowLeft, Loader2 } from 'lucide-react';
import ContentCard from '../components/ContentCard';
import SkeletonCard from '../components/SkeletonCard';
import { 
  getByGenre, 
  getByCountry, 
  getByYear, 
  getByNetwork, 
  searchContent,
  normalizeMediaItem 
} from '../services/api';

export default function CategoryView({ selectedCategory, onBack, onSelectMedia }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { categoryType, name, slug } = selectedCategory || {};

  useEffect(() => {
    if (!selectedCategory) return;

    let isMounted = true;
    const fetchCategoryData = async () => {
      setIsLoading(true);
      let res;

      if (categoryType === 'genre') {
        res = await getByGenre(slug);
      } else if (categoryType === 'country') {
        res = await getByCountry(slug);
      } else if (categoryType === 'year') {
        res = await getByYear(slug);
      } else if (categoryType === 'network') {
        const slugKey = (slug || name || '').toLowerCase();
        let searchQuery = slugKey;
        if (slugKey.includes('prime') || slugKey.includes('amazon')) searchQuery = 'prime';
        if (slugKey.includes('disney')) searchQuery = 'disney';
        if (slugKey.includes('apple')) searchQuery = 'apple';
        if (slugKey.includes('hbo')) searchQuery = 'hbo';
        if (slugKey.includes('netflix')) searchQuery = 'netflix';

        res = await searchContent(searchQuery);
        if (!res || !res.success || !res.data || res.data.length === 0) {
          res = await getByNetwork(slug);
        }
      }

      if (isMounted) {
        if (res && res.success && res.data) {
          const raw = Array.isArray(res.data) ? res.data : res.data.data || res.data.items || [];
          setItems(raw.map(normalizeMediaItem));
        } else {
          setItems([]);
        }
        setIsLoading(false);
      }
    };

    fetchCategoryData();
    return () => { isMounted = false; };
  }, [selectedCategory]);

  if (!selectedCategory) return null;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Category Header */}
      <div className="flex items-center justify-between border-b border-dark-border/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-500/20 text-brand-500 border border-brand-500/30">
                Filter: {categoryType}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {name}
            </h1>
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <ContentCard key={item.slug || item.id} media={item} onSelect={onSelectMedia} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400 bg-dark-card/40 rounded-3xl border border-dashed border-dark-border">
          Belum ada film atau series yang ditemukan pada kategori "{name}".
        </div>
      )}

    </div>
  );
}
