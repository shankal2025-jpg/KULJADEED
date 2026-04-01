import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const ProductsPage = () => {
  const { t, getLocalizedName, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/api/categories');
        setCategories(data);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (sort) params.set('sort', sort);
        params.set('page', page.toString());
        params.set('limit', '12');

        const { data } = await api.get(`/api/products?${params.toString()}`);
        setProducts(data.products);
        setTotalPages(data.pages);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search, category, sort, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (search) params.set('search', search);
    else params.delete('search');
    setSearchParams(params);
  };

  const handleCategoryChange = (value) => {
    setCategory(value === 'all' ? '' : value);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set('category', value);
    else params.delete('category');
    setSearchParams(params);
  };

  const handleSortChange = (value) => {
    setSort(value);
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    setSearchParams(params);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3">{t('categories')}</h3>
        <div className="space-y-2">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`block w-full text-start px-3 py-2 rounded-lg transition-colors ${!category ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            data-testid="filter-all"
          >
            {t('allProducts')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`block w-full text-start px-3 py-2 rounded-lg transition-colors ${category === cat.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              data-testid={`filter-category-${cat.id}`}
            >
              {getLocalizedName(cat)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t('allProducts')}</h1>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="ps-10 rounded-full"
                data-testid="search-input"
              />
            </form>

            {/* Sort */}
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] rounded-full hidden sm:flex" data-testid="sort-select">
                <SelectValue placeholder={t('sort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('newest')}</SelectItem>
                <SelectItem value="price_asc">{t('priceLowHigh')}</SelectItem>
                <SelectItem value="price_desc">{t('priceHighLow')}</SelectItem>
                <SelectItem value="rating">{t('topRated')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="outline" size="icon" className="rounded-full" data-testid="mobile-filter-btn">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side={lang === 'ar' ? 'left' : 'right'}>
                <SheetHeader>
                  <SheetTitle>{t('filter')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">{t('noProducts')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-full"
                      data-testid="prev-page-btn"
                    >
                      Previous
                    </Button>
                    <span className="px-4 text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-full"
                      data-testid="next-page-btn"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
