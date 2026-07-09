import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import clsx from 'clsx';
import * as reviewsApi from '../../api/reviews';
import StarRating from '../ui/StarRating';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

const PAGE_SIZE = 10;

/**
 * Lista paginada de reseñas de un producto. `avgRating`/`reviewCount` son
 * opcionales: si se pasan (por ejemplo desde `ProductResponse.avg_rating` /
 * `review_count`), se usan para el encabezado en vez del total de esta
 * página, ya que `PaginatedReviewResponse` no trae el promedio general.
 */
export default function ReviewList({ productId, avgRating, reviewCount, refreshKey, className }) {
  const currentUser = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [productId, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    reviewsApi
      .getProductReviews(productId, { page, page_size: PAGE_SIZE })
      .then((response) => {
        if (!isMounted) return;
        setReviews(response.data.items);
        setTotal(response.data.total);
        setPages(response.data.pages);
      })
      .catch(() => {
        if (!isMounted) return;
        setReviews([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, page, refreshKey]);

  const displayAvg = typeof avgRating === 'number' ? avgRating : 0;
  const displayTotal = typeof reviewCount === 'number' ? reviewCount : total;

  async function handleDelete(reviewId) {
    if (!window.confirm('¿Eliminar tu reseña? Esta acción no se puede deshacer.')) return;
    setDeletingId(reviewId);
    try {
      await reviewsApi.deleteReview(reviewId);
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      setTotal((prev) => Math.max(prev - 1, 0));
      addToast('Reseña eliminada', 'success');
    } catch {
      addToast('No se pudo eliminar la reseña', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      <div className="flex items-center gap-4">
        <span className="font-display text-4xl font-bold text-ink">{displayAvg.toFixed(1)}</span>
        <div className="flex flex-col gap-1">
          <StarRating rating={displayAvg} size={20} />
          <span className="text-sm text-ink-soft">
            {displayTotal} {displayTotal === 1 ? 'reseña' : 'reseñas'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand-600" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay reseñas para este producto.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-6">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-ink-soft/10 pb-6 last:border-0">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{review.user_name}</span>
                    {review.is_verified_purchase && (
                      <Badge variant="green">Compra verificada</Badge>
                    )}
                  </div>
                  {currentUser?.id === review.user_id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      aria-label="Eliminar mi reseña"
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <StarRating rating={review.rating} size={14} />
                  <span className="text-xs text-ink-soft">{formatDate(review.created_at)}</span>
                </div>
                {review.title && <p className="mb-1 font-semibold text-ink">{review.title}</p>}
                {review.comment && <p className="text-sm text-ink-soft">{review.comment}</p>}
              </li>
            ))}
          </ul>
          <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
