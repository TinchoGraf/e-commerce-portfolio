import { useEffect, useState } from 'react';
import { Search, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import * as adminApi from '../../api/admin';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { formatDate } from '../../utils/formatters';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  useDocumentTitle('Usuarios');
  const addToast = useToastStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  function fetchUsers() {
    let isMounted = true;
    setIsLoading(true);

    const params = {
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      is_active: statusFilter === '' ? undefined : statusFilter === 'true',
    };

    adminApi
      .getUsers(params)
      .then((response) => {
        if (!isMounted) return;
        setUsers(response.data.items);
        setPages(response.data.pages);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar los usuarios.');
        setUsers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }

  useEffect(() => {
    const cleanup = fetchUsers();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  async function handleToggleRole(user) {
    const newRole = user.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    const fullName = `${user.first_name} ${user.last_name}`;
    if (!window.confirm(`¿Convertir a ${fullName} en ${newRole === 'ADMIN' ? 'Admin' : 'Cliente'}?`)) {
      return;
    }
    try {
      await adminApi.updateUserRole(user.id, { role: newRole });
      addToast('Rol actualizado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      addToast(error.response?.data?.detail || 'No se pudo actualizar el rol', 'error');
    }
  }

  async function handleToggleStatus(user) {
    const fullName = `${user.first_name} ${user.last_name}`;
    const action = user.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Querés ${action} a ${fullName}?`)) return;
    try {
      await adminApi.updateUserStatus(user.id, { is_active: !user.is_active });
      addToast('Estado del usuario actualizado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      addToast(error.response?.data?.detail || 'No se pudo actualizar el estado', 'error');
    }
  }

  const columns = [
    {
      key: 'full_name',
      header: 'Nombre completo',
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Rol',
      render: (row) =>
        row.role === 'ADMIN' ? (
          <Badge variant="purple">Admin</Badge>
        ) : (
          <Badge variant="blue">Cliente</Badge>
        ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (row) =>
        row.is_active ? (
          <Badge variant="green">Activo</Badge>
        ) : (
          <Badge variant="gray">Inactivo</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Fecha de registro',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => {
        const isSelf = currentUser && row.id === currentUser.id;
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSelf}
              onClick={() => handleToggleRole(row)}
              title={isSelf ? 'No podés cambiar tu propio rol' : 'Cambiar rol'}
              className="cursor-pointer text-ink-soft hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-soft/30 disabled:hover:text-ink-soft/30"
              aria-label={`Cambiar rol de ${row.first_name} ${row.last_name}`}
            >
              {row.role === 'ADMIN' ? <ShieldOff size={16} /> : <Shield size={16} />}
            </button>
            <button
              type="button"
              disabled={isSelf}
              onClick={() => handleToggleStatus(row)}
              title={isSelf ? 'No podés desactivar tu propia cuenta' : row.is_active ? 'Desactivar' : 'Activar'}
              className="cursor-pointer text-ink-soft hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-soft/30 disabled:hover:text-ink-soft/30"
              aria-label={`${row.is_active ? 'Desactivar' : 'Activar'} a ${row.first_name} ${row.last_name}`}
            >
              {row.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-2xl font-semibold text-ink">Usuarios</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos los roles</option>
          <option value="CUSTOMER">Cliente</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            emptyMessage="No se encontraron usuarios con estos filtros."
          />
          <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
