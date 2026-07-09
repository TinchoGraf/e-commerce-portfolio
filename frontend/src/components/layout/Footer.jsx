import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-ink-soft/10 bg-surface-alt">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-xl font-bold text-brand-700">
            Tech<span className="text-accent-600">Store</span>
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Tienda de tecnología con lo último en dispositivos y accesorios. Proyecto de
            portfolio construido con React y FastAPI.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Navegación</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            <li>
              <Link to="/" className="hover:text-brand-600">
                Home
              </Link>
            </li>
            <li>
              <Link to="/catalogo" className="hover:text-brand-600">
                Catálogo
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Ayuda</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            <li>
              <span
                title="Próximamente disponible"
                className="cursor-default text-ink-soft/60"
              >
                Preguntas frecuentes
              </span>
            </li>
            <li>
              <span
                title="Próximamente disponible"
                className="cursor-default text-ink-soft/60"
              >
                Contacto
              </span>
            </li>
            <li>
              <span
                title="Próximamente disponible"
                className="cursor-default text-ink-soft/60"
              >
                Términos y condiciones
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Contacto</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
            <li>contacto@techstore.com</li>
            <li>+54 11 5555-5555</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-soft/10 px-4 py-4 text-center text-xs text-ink-soft sm:px-6 lg:px-8">
        © 2026 TechStore. Proyecto de portfolio.
      </div>
    </footer>
  );
}
