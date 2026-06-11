import { useEffect, useState } from 'react';
import {
  useCreateJobReviewMutation,
  useDeleteJobReviewMutation,
  useGetJobReviewQuery,
  useUpdateJobReviewMutation
} from '../api/jobsApi';
import { InsetCard } from '../../../components/InsetCard';
import { ActionButton } from '../../../components/ActionButton';

interface ReviewPanelProps {
  jobId: number;
}

export const ReviewPanel = ({ jobId }: ReviewPanelProps) => {
  const { data: review } = useGetJobReviewQuery(jobId);
  const [createReview] = useCreateJobReviewMutation();
  const [updateReview] = useUpdateJobReviewMutation();
  const [deleteReview] = useDeleteJobReviewMutation();

  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (review) {
      setRating(String(review.rating));
      setComment(review.comment ?? '');
    }
  }, [review]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const payload = {
      rating: Number(rating),
      comment: comment || null
    };

    if (review) {
      await updateReview({ jobId, payload }).unwrap();
      setMessage('Review updated.');
    } else {
      await createReview({ jobId, payload }).unwrap();
      setMessage('Review submitted.');
    }
  };

  const handleDelete = async () => {
    await deleteReview(jobId).unwrap();
    setRating('5');
    setComment('');
    setMessage('Review deleted.');
  };

  return (
    <InsetCard className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Leave a review</p>
        {message && <span className="text-xs text-emerald-600">{message}</span>}
      </div>
      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <label className="text-xs text-slate-600">
          Rating
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Comment
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-1 h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <ActionButton type="submit" tone="primary">
            {review ? 'Update review' : 'Submit review'}
          </ActionButton>
          {review && (
            <ActionButton type="button" onClick={handleDelete} tone="danger">
              Delete review
            </ActionButton>
          )}
        </div>
      </form>
    </InsetCard>
  );
};
