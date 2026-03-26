'use client';

import { useState, useEffect, useRef } from 'react';

interface FoodResult {
  id: number | null;
  name: string;
  brand: string | null;
  category: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  saturated_fat_g: number;
  fdc_id?: string | null;
  source: string;
  suggestion_type?: string;
  log_count?: number;
}

interface FoodSearchProps {
  onSelect: (food: FoodResult) => void;
}

export default function FoodSearch({ onSelect }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodResult[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodResult[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodResult[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showingRecents, setShowingRecents] = useState(false);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRecents = useRef(false);

  const fetchFavorites = () => {
    fetch('/api/foods/favorites')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const favs = data.data.map((f: FoodResult) => ({ ...f, source: 'local' }));
          setFavoriteFoods(favs);
          setFavoriteIds(new Set(favs.map((f: FoodResult) => f.id).filter(Boolean) as number[]));
        }
      })
      .catch(() => {});
  };

  // Fetch recent/frequent/favorites on mount
  useEffect(() => {
    if (fetchedRecents.current) return;
    fetchedRecents.current = true;
    fetch('/api/foods/recent')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setRecentFoods((data.data.recent || []).map((f: FoodResult) => ({ ...f, source: 'local' })));
          setFrequentFoods((data.data.frequent || []).map((f: FoodResult) => ({ ...f, source: 'local' })));
        }
      })
      .catch(() => {});
    fetchFavorites();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowingRecents(false);
        setShowingFavorites(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setShowingRecents(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          // Boost frequent items to the top of search results
          const frequentIds = new Set(frequentFoods.map(f => f.id));
          const recentIds = new Set(recentFoods.map(f => f.id));
          const sorted = [...data.data].sort((a: FoodResult, b: FoodResult) => {
            const aFreq = frequentIds.has(a.id) || recentIds.has(a.id) ? 1 : 0;
            const bFreq = frequentIds.has(b.id) || recentIds.has(b.id) ? 1 : 0;
            return bFreq - aFreq;
          });
          setResults(sorted);
          setShowResults(true);
        }
      } catch {
        console.error('Search failed');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, frequentFoods, recentFoods]);

  const handleFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setShowResults(true);
    } else if (query.length < 2 && (recentFoods.length > 0 || frequentFoods.length > 0)) {
      setShowingRecents(true);
      setShowResults(true);
    }
  };

  const handleSelect = (food: FoodResult) => {
    onSelect(food);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setShowingRecents(false);
    setShowingFavorites(false);
    // Refresh recents after logging
    fetch('/api/foods/recent')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setRecentFoods((data.data.recent || []).map((f: FoodResult) => ({ ...f, source: 'local' })));
          setFrequentFoods((data.data.frequent || []).map((f: FoodResult) => ({ ...f, source: 'local' })));
        }
      })
      .catch(() => {});
  };

  const toggleFavorite = async (e: React.MouseEvent, food: FoodResult) => {
    e.stopPropagation();
    if (!food.id) return;
    const isFav = favoriteIds.has(food.id);
    if (isFav) {
      await fetch(`/api/foods/favorites?food_item_id=${food.id}`, { method: 'DELETE' });
      setFavoriteIds(prev => { const next = new Set(prev); next.delete(food.id!); return next; });
      setFavoriteFoods(prev => prev.filter(f => f.id !== food.id));
    } else {
      await fetch('/api/foods/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_item_id: food.id }),
      });
      setFavoriteIds(prev => new Set(prev).add(food.id!));
      setFavoriteFoods(prev => [...prev, { ...food, source: 'local' }]);
    }
  };

  const renderFoodItem = (food: FoodResult, idx: number, badge?: string) => {
    const isFrequent = frequentFoods.some(f => f.id === food.id);
    const isRecent = recentFoods.some(f => f.id === food.id);
    const isFav = food.id ? favoriteIds.has(food.id) : false;
    return (
      <div
        key={`${food.source}-${food.id || food.name}-${idx}`}
        className="search-result-item"
        onClick={() => handleSelect(food)}
      >
        {/* Star toggle */}
        {food.id && (
          <button
            onClick={(e) => toggleFavorite(e, food)}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              fontSize: '16px', flexShrink: 0, lineHeight: 1,
              color: isFav ? '#f59e0b' : 'var(--text-muted)',
              opacity: isFav ? 1 : 0.4,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isFav) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { if (!isFav) e.currentTarget.style.opacity = '0.4'; }}
          >
            {isFav ? '★' : '☆'}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="search-result-name">
            {food.name}
            {badge && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 6px',
                borderRadius: '4px', marginLeft: '6px',
                background: badge === 'Recent' ? 'rgba(99,102,241,0.12)' : badge === 'Favorite' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                color: badge === 'Recent' ? 'var(--accent-indigo)' : badge === 'Favorite' ? '#f59e0b' : '#10b981',
              }}>{badge}</span>
            )}
            {!badge && (isFrequent || isRecent) && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 6px',
                borderRadius: '4px', marginLeft: '6px',
                background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)',
              }}>⟳ Logged before</span>
            )}
            <span className={`search-source-badge ${food.source}`}>
              {food.source === 'local' ? '★ Local' : food.source === 'openfoodfacts' ? 'OFF' : 'USDA'}
            </span>
          </div>
          {food.brand && (
            <div className="search-result-brand">
              {food.brand === 'Purdue Dining' ? (
                <span style={{
                  background: 'rgba(206,163,50,0.15)', color: '#CFA332',
                  padding: '1px 6px', borderRadius: '4px', fontSize: '10px',
                  fontWeight: 700, letterSpacing: '0.3px',
                }}>🚂 Purdue Dining</span>
              ) : food.brand}
            </div>
          )}
        </div>
        <div>
          <div className="search-result-cal">{Math.round(food.calories)} cal</div>
          <div className="search-result-serving">
            per {food.serving_size}{food.serving_unit}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="food-search-container" ref={containerRef}>
      <div className="food-search-input-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          id="food-search-input"
          type="text"
          className="food-search-input"
          placeholder="Search foods... (e.g., chicken breast, banana, rice)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowingFavorites(false); }}
          onFocus={handleFocus}
        />
        {/* Favorites star button */}
        <button
          onClick={() => {
            if (showingFavorites) {
              setShowingFavorites(false);
              setShowResults(false);
            } else {
              setShowingFavorites(true);
              setShowingRecents(false);
              setShowResults(true);
            }
          }}
          title={showingFavorites ? 'Hide favorites' : 'Show favorites'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', padding: '4px 8px', lineHeight: 1,
            color: showingFavorites ? '#f59e0b' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
        >
          {showingFavorites ? '★' : '☆'}
        </button>
      </div>

      {showResults && (
        <div className="search-results">
          {showingFavorites ? (
            <>
              <div style={{
                padding: '8px 14px', fontSize: '11px', fontWeight: 700,
                color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px',
                borderBottom: '1px solid var(--border-primary)',
              }}>★ Favorites</div>
              {favoriteFoods.length === 0 ? (
                <div className="search-loading" style={{ color: 'var(--text-muted)' }}>
                  No favorites yet — tap ☆ on any food to save it
                </div>
              ) : (
                favoriteFoods.map((food, idx) => renderFoodItem(food, idx, 'Favorite'))
              )}
            </>
          ) : showingRecents ? (
            <>
              {recentFoods.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 14px', fontSize: '11px', fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border-primary)',
                  }}>Recent</div>
                  {recentFoods.map((food, idx) => renderFoodItem(food, idx, 'Recent'))}
                </>
              )}
              {frequentFoods.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 14px', fontSize: '11px', fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border-primary)',
                    marginTop: recentFoods.length > 0 ? '4px' : 0,
                  }}>Frequently Logged</div>
                  {frequentFoods.map((food, idx) => renderFoodItem(food, idx, 'Frequent'))}
                </>
              )}
            </>
          ) : isLoading ? (
            <div className="search-loading">Searching...</div>
          ) : results.length === 0 ? (
            <div className="search-loading">No results found</div>
          ) : (
            results.map((food, idx) => renderFoodItem(food, idx))
          )}
        </div>
      )}
    </div>
  );
}
