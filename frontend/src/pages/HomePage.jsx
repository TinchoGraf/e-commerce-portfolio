import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Camera,
  Gamepad2,
  ArrowRight,
  Truck,
  CreditCard,
} from 'lucide-react';
import * as categoriesApi from '../api/categories';
import * as productsApi from '../api/products';
import ProductGrid from '../components/product/ProductGrid';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CATEGORY_STYLES = [
  { Icon: Smartphone, className: 'from-brand-500 to-brand-700' },
  { Icon: Laptop, className: 'from-accent-500 to-accent-600' },
  { Icon: Headphones, className: 'from-brand-400 to-brand-600' },
  { Icon: Watch, className: 'from-accent-400 to-brand-600' },
  { Icon: Camera, className: 'from-brand-600 to-brand-900' },
  { Icon: Gamepad2, className: 'from-accent-500 to-brand-700' },
];

export default function HomePage() {
  useDocumentTitle();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [newProducts, setNewProducts] = useState([]);
  const [newLoading, setNewLoading] = useState(true);

  useEffect(() => {
    categoriesApi
      .getCategories()
      .then((response) => setCategories(response.data.filter((category) => !category.parent_id)))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));

    productsApi
      .getProducts({ is_featured: true, page_size: 8 })
      .then((response) => setFeaturedProducts(response.data.items))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setFeaturedLoading(false));

    productsApi
      .getProducts({ sort_by: 'created_at', sort_order: 'desc', page_size: 8 })
      .then((response) => setNewProducts(response.data.items))
      .catch(() => setNewProducts([]))
      .finally(() => setNewLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-16 pb-16 sm:gap-20">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0, transparent 35%), radial-gradient(circle at 80% 60%, white 0, transparent 30%)',
          }}
        />
        <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Tecnología para tu vida
          </h1>
          <p className="max-w-xl text-lg text-brand-100">
            Encontrá los mejores dispositivos, accesorios y gadgets con la mejor relación
            precio-calidad. Todo en un solo lugar.
          </p>
          <div>
            <Button as={Link} to="/catalogo" size="lg" variant="secondary" className="!bg-white !text-brand-700 hover:!bg-brand-50">
              Ver catálogo
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Categorías destacadas */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-semibold text-ink sm:text-3xl">
          Explorá por categoría
        </h2>

        {categoriesLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-brand-600" />
          </div>
        ) : categories.length === 0 ? null : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((category, index) => {
              const style = CATEGORY_STYLES[index % CATEGORY_STYLES.length];
              const { Icon } = style;
              return (
                <Link
                  key={category.id}
                  to={`/categoria/${category.slug}`}
                  className={`group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br p-4 text-center text-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md ${style.className}`}
                >
                  <Icon size={28} strokeWidth={1.5} />
                  <span className="text-sm font-semibold">{category.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Productos destacados */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Lo más destacado</h2>
          <Link to="/catalogo" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Ver todos
          </Link>
        </div>

        {featuredLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-brand-600" />
          </div>
        ) : featuredProducts.length === 0 ? null : (
          <ProductGrid products={featuredProducts} />
        )}
      </section>

      {/* Banner promocional */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 p-8 text-ink sm:grid-cols-2 sm:p-12">
          {/* Nota de contraste: sobre este degradé claro, el texto blanco/accent-50
              no alcanza 4.5:1 (falla WCAG AA). Se usa text-ink, que sí cumple
              en todo el rango del degradé (accent-500 → accent-600). */}
          <div className="flex items-center gap-4">
            <Truck size={36} strokeWidth={1.5} />
            <div>
              <p className="font-display text-xl font-bold">Envío gratis</p>
              <p className="text-ink">En compras mayores a $50.000</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CreditCard size={36} strokeWidth={1.5} />
            <div>
              <p className="font-display text-xl font-bold">Hasta 12 cuotas</p>
              <p className="text-ink">Sin interés con tarjetas seleccionadas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos nuevos */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Recién llegados</h2>
          <Link to="/catalogo" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Ver todos
          </Link>
        </div>

        {newLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-brand-600" />
          </div>
        ) : newProducts.length === 0 ? null : (
          <ProductGrid products={newProducts} />
        )}
      </section>
    </div>
  );
}
