import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Star, Search } from 'lucide-react';
import * as adminApi from '../../api/admin';
import { getProducts } from '../../api/products';
import { getCategories } from '../../api/categories';
import { getBrands } from '../../api/brands';
import DataTable from '../../components/admin/DataTable';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../stores/toastStore';
import { formatPrice } from '../../utils/formatters';

const PAGE_SIZE = 20;

// NOTA: ProductListResponse (GET /products) no expone `sku`, `category`,
// `brand` ni `is_active` — sólo id, name, slug, price, compare_at_price,
// is_featured, avg_rating, review_count, stock, primary_image_url. Por eso
// la tabla y el filtro de estado se limitan a "Todos" / "Activos" (lo único
// que el backend puede distinguir vía `include_inactive`), sin una opción
// "Inactivos" que requeriría un campo `is_active` que el listado no trae.

export default function AdminProductsPage() {
  useDocumentTitle('Productos');
  const addToast = useToastStore((state) => state.addToast);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active'
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories()
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]));
    getBrands()
      .then((response) => setBrands(response.data))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, brandId, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const params = {
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
    };

    // "Todos" pide include_inactive=true; "Activos" no manda ese param
    // (el backend sólo trae activos por default, ver GET /products).
    const request =
      statusFilter === 'all' ? adminApi.getAdminProducts(params) : getProducts(params);

    request
      .then((response) => {
        if (!isMounted) return;
        setProducts(response.data.items);
        setPages(response.data.pages);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar los productos.');
        setProducts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, categoryId, brandId, statusFilter]);

  async function handleDelete(product) {
    if (!window.confirm(`¿Eliminar el producto "${product.name}"?`)) return;
    try {
      await adminApi.deleteProduct(product.id);
      addToast('Producto eliminado correctamente', 'success');
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
    } catch {
      addToast('No se pudo eliminar el producto', 'error');
    }
  }

  const columns = [
    {
      key: 'image',
      header: 'Imagen',
      width: 56,
      render: (row) =>
        row.primary_image_url ? (
          <img
            src={row.primary_image_url}
            alt={row.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-surface-alt" />
        ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (row) => (
        <Link
          to={`/admin/productos/${row.id}/editar`}
          className="font-medium text-ink hover:text-brand-600"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'price',
      header: 'Precio',
      render: (row) => formatPrice(row.price),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) =>
        row.stock === 0 ? (
          <span className="font-semibold text-red-600">Sin stock</span>
        ) : (
          row.stock
        ),
    },
    {
      key: 'is_featured',
      header: 'Destacado',
      render: (row) =>
        row.is_featured ? (
          <Star size={18} className="fill-accent-500 text-accent-500" />
        ) : (
          <Star size={18} className="text-ink-soft/40" />
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/productos/${row.id}/editar`}
            className="text-ink-soft hover:text-brand-600"
            aria-label={`Editar ${row.name}`}
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="cursor-pointer text-ink-soft hover:text-red-600"
            aria-label={`Eliminar ${row.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-2xl font-semibold text-ink">Productos</h2>
        <Button as={Link} to="/admin/productos/nuevo">
          <Plus size={18} />
          Nuevo producto
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">Todos los productos</option>
          <option value="active">Sólo activos</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            emptyMessage="No se encontraron productos con estos filtros."
          />
          <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
