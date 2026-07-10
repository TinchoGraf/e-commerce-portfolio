import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as adminApi from '../../api/admin';
import { getCategories } from '../../api/categories';
import { getBrands } from '../../api/brands';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ProductImagesManager from '../../components/admin/ProductImagesManager';
import ProductVariantsManager from '../../components/admin/ProductVariantsManager';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../stores/toastStore';

const EMPTY_FORM = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  sku: '',
  category_id: '',
  brand_id: '',
  price: '',
  compare_at_price: '',
  cost_price: '',
  stock: '0',
  low_stock_threshold: '5',
  weight: '',
  is_featured: false,
  is_active: true,
};

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const isEditMode = Boolean(id);
  useDocumentTitle(isEditMode ? 'Editar producto' : 'Nuevo producto');

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [productId, setProductId] = useState(id || null);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const applyProductData = useCallback((data) => {
    setForm({
      name: data.name || '',
      slug: data.slug || '',
      short_description: data.short_description || '',
      description: data.description || '',
      sku: data.sku || '',
      category_id: data.category_id || '',
      brand_id: data.brand_id || '',
      price: data.price != null ? String(data.price) : '',
      compare_at_price: data.compare_at_price != null ? String(data.compare_at_price) : '',
      cost_price: data.cost_price != null ? String(data.cost_price) : '',
      stock: data.stock != null ? String(data.stock) : '0',
      low_stock_threshold: data.low_stock_threshold != null ? String(data.low_stock_threshold) : '5',
      weight: data.weight != null ? String(data.weight) : '',
      is_featured: Boolean(data.is_featured),
      is_active: data.is_active ?? true,
    });
    setImages(data.images || []);
    setVariants(data.variants || []);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((response) => {
        if (isMounted) setCategories(response.data);
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });
    getBrands()
      .then((response) => {
        if (isMounted) setBrands(response.data);
      })
      .catch(() => {
        if (isMounted) setBrands([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);

    adminApi
      .getAdminProductById(id)
      .then((response) => {
        if (!isMounted) return;
        applyProductData(response.data);
        setProductId(id);
        setLoadError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError('No se pudo cargar el producto.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, applyProductData]);

  const refetchProduct = useCallback(async () => {
    if (!productId) return;
    const response = await adminApi.getAdminProductById(productId);
    applyProductData(response.data);
  }, [productId, applyProductData]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNameBlur() {
    if (!form.slug.trim() && form.name.trim()) {
      updateField('slug', slugify(form.name));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const priceNum = Number(form.price);
    const stockNum = Number(form.stock);
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'El nombre es obligatorio';
    if (!form.price || Number.isNaN(priceNum) || priceNum <= 0) {
      nextErrors.price = 'El precio debe ser mayor a 0';
    }
    if (form.stock === '' || Number.isNaN(stockNum) || stockNum < 0) {
      nextErrors.stock = 'El stock no puede ser negativo';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || null,
      short_description: form.short_description.trim() || null,
      price: priceNum,
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      sku: form.sku.trim() || null,
      stock: stockNum,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      weight: form.weight ? Number(form.weight) : null,
    };

    setIsSaving(true);
    try {
      if (isEditMode) {
        const response = await adminApi.updateProduct(productId, payload);
        applyProductData(response.data);
        addToast('Producto actualizado correctamente', 'success');
      } else {
        const response = await adminApi.createProduct(payload);
        applyProductData(response.data);
        setProductId(response.data.id);
        addToast('Producto creado correctamente', 'success');
        navigate(`/admin/productos/${response.data.id}/editar`, { replace: true });
      }
    } catch (err) {
      addToast(err?.response?.data?.detail || 'No se pudo guardar el producto', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-display text-2xl font-semibold text-ink">
        {isEditMode ? 'Editar producto' : 'Nuevo producto'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            onBlur={handleNameBlur}
            error={errors.name}
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => updateField('slug', event.target.value)}
            placeholder="se-genera-automaticamente"
          />
        </div>

        <Input
          label="Descripción corta"
          value={form.short_description}
          onChange={(event) => updateField('short_description', event.target.value)}
        />

        <Input
          as="textarea"
          label="Descripción completa"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="SKU"
            value={form.sku}
            onChange={(event) => updateField('sku', event.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="category_id">
              Categoría
            </label>
            <select
              id="category_id"
              value={form.category_id}
              onChange={(event) => updateField('category_id', event.target.value)}
              className="w-full rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="brand_id">
              Marca
            </label>
            <select
              id="brand_id"
              value={form.brand_id}
              onChange={(event) => updateField('brand_id', event.target.value)}
              className="w-full rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Sin marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input
            label="Precio"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
            error={errors.price}
          />
          <Input
            label="Precio anterior"
            type="number"
            step="0.01"
            value={form.compare_at_price}
            onChange={(event) => updateField('compare_at_price', event.target.value)}
          />
          <Input
            label="Precio de costo"
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(event) => updateField('cost_price', event.target.value)}
          />
          <Input
            label="Peso (kg)"
            type="number"
            step="0.01"
            value={form.weight}
            onChange={(event) => updateField('weight', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input
            label="Stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => updateField('stock', event.target.value)}
            error={errors.stock}
          />
          <Input
            label="Umbral de stock bajo"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={(event) => updateField('low_stock_threshold', event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) => updateField('is_featured', event.target.checked)}
              className="h-4 w-4 rounded border-ink-soft/25 text-brand-600 focus:ring-brand-500"
            />
            Destacado
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
              className="h-4 w-4 rounded border-ink-soft/25 text-brand-600 focus:ring-brand-500"
            />
            Activo
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isSaving}>
            Guardar
          </Button>
          <Button as={Link} to="/admin/productos" variant="ghost">
            Cancelar
          </Button>
        </div>
      </form>

      {productId ? (
        <div className="flex flex-col gap-8">
          <section className="rounded-xl bg-surface p-5 shadow-sm">
            <h3 className="mb-4 font-display text-lg font-semibold text-ink">Imágenes</h3>
            <ProductImagesManager productId={productId} images={images} onRefetch={refetchProduct} />
          </section>

          <section className="rounded-xl bg-surface p-5 shadow-sm">
            <h3 className="mb-4 font-display text-lg font-semibold text-ink">Variantes</h3>
            <ProductVariantsManager productId={productId} variants={variants} onRefetch={refetchProduct} />
          </section>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Guardá el producto para poder agregar imágenes y variantes.
        </p>
      )}
    </div>
  );
}
