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
}

interface FoodSearchProps {
  onSelect: (food: FoodResult) => void;
}

export default function FoodSearch({ onSelect }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
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
  }, [query]);

  const handleSelect = (food: FoodResult) => {
    onSelect(food);
    setQuery('');
    setResults([]);
    setShowResults(false);
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
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
      </div>

      {showResults && (
        <div className="search-results">
          {isLoading ? (
            <div className="search-loading">Searching...</div>
          ) : results.length === 0 ? (
            <div className="search-loading">No results found</div>
          ) : (
            results.map((food, idx) => (
              <div
                key={`${food.source}-${food.id || food.name}-${idx}`}
                className="search-result-item"
                onClick={() => handleSelect(food)}
              >
                <div>
                  <div className="search-result-name">
                    {food.name}
                    <span className={`search-source-badge ${food.source}`}>
                      {food.source === 'local' ? '★ Local' : 'USDA'}
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
