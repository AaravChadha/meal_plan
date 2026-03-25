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
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showingRecents, setShowingRecents] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRecents = useRef(false);

  // Fetch recent/frequent foods once on mount
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
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowingRecents(false);
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

  const renderFoodItem = (food: FoodResult, idx: number, badge?: string) => {
    const isFrequent = frequentFoods.some(f => f.id === food.id);
    const isRecent = recentFoods.some(f => f.id === food.id);
    return (
      <div
        key={`${food.source}-${food.id || food.name}-${idx}`}
        className="search-result-item"
        onClick={() => handleSelect(food)}
      >
        <div>
          <div className="search-result-name">
            {food.name}
            {badge && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 6px',
                borderRadius: '4px', marginLeft: '6px',
                background: badge === 'Recent' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                color: badge === 'Recent' ? 'var(--accent-indigo)' : '#10b981',
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
        />
      </div>

      {showResults && (
        <div className="search-results">
          {showingRecents ? (
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
