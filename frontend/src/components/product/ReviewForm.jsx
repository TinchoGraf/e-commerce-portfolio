import { useState } from 'react';
import clsx from 'clsx';
import StarRating from '../ui/StarRating';
import Input from '../ui/Input';
import Button from '../ui/Button';
import * as reviewsApi from '../../api/reviews';
import { useToastStore } from '../../stores/toastStore';

export default function ReviewForm({ productId, onSubmit, className }) {
  const addToast = useToastStore((state) => state.addToast);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Elegí una calificación de 1 a 5 estrellas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewsApi.createReview({
        product_id: productId,
        rating,
        title: title.trim() || null,
        comment: comment.trim() || null,
      });
      addToast('¡Gracias por tu reseña!', 'success');
      setRating(0);
      setTitle('');
      setComment('');
      onSubmit?.();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Ya dejaste una reseña para este producto.');
      } else {
        setError('No se pudo enviar tu reseña. Intentá de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'flex flex-col gap-4 rounded-xl border border-ink-soft/10 bg-white p-5',
        className,
      )}
    >
      <h3 className="font-semibold text-ink">Dejá tu reseña</h3>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Calificación</span>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>

      <Input
        label="Título (opcional)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Resumí tu experiencia"
      />

      <Input
        as="textarea"
        label="Comentario (opcional)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Contanos qué te pareció el producto"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={isSubmitting} className="self-start">
        Enviar reseña
      </Button>
    </form>
  );
}
