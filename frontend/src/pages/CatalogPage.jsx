import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import * as categoriesApi from '../api/categories';
import * as brandsApi from '../api/brands';
import * as productsApi from '../api/products';
import ProductGrid from '../components/product/ProductGrid';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Más recientes', sort_by: 'created_at', sort_order: 'desc' },
  { value: 'price_asc', label: 'Precio: menor a mayor', sort_by: 'price', sort_order: 'asc' },
  { value: 'price_desc', label: 'Precio: mayor a menor', sort_by: 'price', sort_order: 'desc' },
  { value: 'avg_rating_desc', label: 'Mejor valorados', sort_by: 'avg_rating', sort_order: 'desc' },
];

function findSortOption(sortBy, sortOrder) {
  return (
    SORT_OPTIONS.find((option) => option.sort_by === sortBy && option.sort_order === sortOrder) ||
    SORT_OPTIONS[0]
  );
}

function CategoryLink({ category, activeSlug, onSelect, depth = 0 }) {
  const isActive = category.slug === activeSlug;
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(category.slug)}
        style={{ paddingLeft: `${depth * 14}px` }}
        className={clsx(
          'block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
          isActive ? 'bg-brand-100 font-medium text-brand-700' : 'text-ink-soft hover:bg-surface-alt',
        )}
      >
        {category.name}
      </button>
      {category.children?.map((child) => (
        <CategoryLink
          key={child.id}
          category={child}
          activeSlug={activeSlug}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export default function CatalogPage() {
  const { slug: routeSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [routeCategory, setRouteCategory] = useState(null);
  const [routeCategoryLoading, setRouteCategoryLoading] = useState(!!routeSlug);
  const [routeCategoryNotFound, setRouteCategoryNotFound] = useState(false);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [minPriceInput, setMinPriceInput] = useState(searchParams.get('min_price') || '');
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get('max_price') || '');

  useDocumentTitle(routeCategory ? routeCategory.name : 'Catálogo');

  useEffect(() => {
    categoriesApi
      .getCategories()
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]));
    brandsApi
      .getBrands()
      .then((response) => setBrands(response.data))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!routeSlug) {
      setRouteCategory(null);
      setRouteCategoryNotFound(false);
      setRouteCategoryLoading(false);
      return;
    }

    let isMounted = true;
    setRouteCategoryLoading(true);
    setRouteCategoryNotFound(false);

    categoriesApi
      .getCategoryBySlug(routeSlug)
      .then((response) => {
        if (isMounted) setRouteCategory(response.data);
      })
      .catch(() => {
        if (isMounted) {
          setRouteCategory(null);
          setRouteCategoryNotFound(true);
        }
      })
      .finally(() => {
        if (isMounted) setRouteCategoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeSlug]);

  useEffect(() => {
    setMinPriceInput(searchParams.get('min_price') || '');
    setMaxPriceInput(searchParams.get('max_price') || '');
  }, [searchParams]);

  useEffect(() => {
    if (routeSlug && routeCategoryLoading) return;
    if (routeSlug && routeCategoryNotFound) {
      setProducts([]);
      setTotal(0);
      setPages(1);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const sortOption = findSortOption(
      searchParams.get('sort_by') || 'created_at',
      searchParams.get('sort_order') || 'desc',
    );

    const params = {
      search: searchParams.get('search') || undefined,
      category_id: routeSlug ? routeCategory?.id : searchParams.get('category') || undefined,
      brand_id: searchParams.get('brand') || undefined,
      min_price: searchParams.get('min_price') || undefined,
      max_price: searchParams.get('max_price') || undefined,
      sort_by: sortOption.sort_by,
      sort_order: sortOption.sort_order,
      page: Number(searchParams.get('page')) || 1,
      page_size: 20,
    };

    productsApi
      .getProducts(params)
      .then((response) => {
        if (!isMounted) return;
        setProducts(response.data.items);
        setTotal(response.data.total);
        setPages(response.data.pages);
      })
      .catch(() => {
        if (!isMounted) return;
        setProducts([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, routeSlug, routeCategory, routeCategoryLoading, routeCategoryNotFound]);

  function updateParams(patch, { resetPage = true } = {}) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (resetPage) next.delete('page');
    setSearchParams(next);
  }

  function goToCategorySlug(slug) {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    navigate(`/categoria/${slug}?${next.toString()}`);
  }

  function clearCategoryFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('page');
    navigate(`/catalogo?${next.toString()}`);
  }

  function handleBrandClick(brandId) {
    const isActive = searchParams.get('brand') === brandId;
    updateParams({ brand: isActive ? null : brandId });
  }

  function handlePriceApply() {
    updateParams({ min_price: minPriceInput || null, max_price: maxPriceInput || null });
  }

  function handleClearFilters() {
    setMinPriceInput('');
    setMaxPriceInput('');
    navigate('/catalogo');
  }

  const activeBrandId = searchParams.get('brand') || '';
  const currentSortValue = findSortOption(
    searchParams.get('sort_by') || 'created_at',
    searchParams.get('sort_order') || 'desc',
  ).value;
  const hasActiveCategory = !!routeSlug;
  const hasAnyFilter =
    hasActiveCategory ||
    !!searchParams.get('brand') ||
    !!searchParams.get('min_price') ||
    !!searchParams.get('max_price') ||
    !!searchParams.get('search');

  if (routeSlug && routeCategoryNotFound) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Categoría no encontrada"
          description="La categoría que buscás no existe o fue movida."
          action={
            <Button as={Link} to="/catalogo">
              Ver catálogo completo
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {routeCategory ? routeCategory.name : 'Catálogo'}
        </h1>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-soft/20 px-3.5 py-2 text-sm font-medium text-ink lg:hidden"
        >
          {filtersOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
          Filtros
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside
          className={clsx(
            'w-full shrink-0 lg:block lg:w-[250px]',
            filtersOpen ? 'block' : 'hidden',
          )}
        >
          <div className="flex flex-col gap-6 rounded-xl border border-ink-soft/10 bg-white p-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Categorías</h2>
              <div className="flex flex-col gap-0.5">
                {hasActiveCategory && (
                  <button
                    type="button"
                    onClick={clearCategoryFilter}
                    className="mb-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-brand-600 hover:bg-surface-alt"
                  >
                    Todas las categorías
                  </button>
                )}
                {categories.map((category) => (
                  <CategoryLink
                    key={category.id}
                    category={category}
                    activeSlug={routeSlug}
                    onSelect={goToCategorySlug}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Marcas</h2>
              <div className="flex flex-col gap-0.5">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleBrandClick(brand.id)}
                    className={clsx(
                      'block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                      activeBrandId === brand.id
                        ? 'bg-brand-100 font-medium text-brand-700'
                        : 'text-ink-soft hover:bg-surface-alt',
                    )}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Precio</h2>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={minPriceInput}
                  onChange={(event) => setMinPriceInput(event.target.value)}
                  onBlur={handlePriceApply}
                  onKeyDown={(event) => event.key === 'Enter' && handlePriceApply()}
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={maxPriceInput}
                  onChange={(event) => setMaxPriceInput(event.target.value)}
                  onBlur={handlePriceApply}
                  onKeyDown={(event) => event.key === 'Enter' && handlePriceApply()}
                />
              </div>
            </div>

            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {isLoading ? 'Buscando...' : `${total} producto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
            </p>
            <select
              value={currentSortValue}
              onChange={(event) => {
                const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
                updateParams({ sort_by: option.sort_by, sort_order: option.sort_order });
              }}
              className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" className="text-brand-600" />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No encontramos productos"
              description="Probá ajustar los filtros o buscar otra cosa."
            />
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination
                currentPage={Number(searchParams.get('page')) || 1}
                totalPages={pages}
                onPageChange={(page) => updateParams({ page }, { resetPage: false })}
                className="mt-8"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
