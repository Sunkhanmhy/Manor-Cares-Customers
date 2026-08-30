import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Spinner } from '../../components/Spinner';
import { formatDate } from '../../lib/format';
import type { Booking, ServiceReview } from '../../types/database';

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', fontSize: 20, padding: 0 }}
          aria-label={`${n} star`}
        >
          {n <= value ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const { customerProfile } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [reviewableBookings, setReviewableBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!customerProfile) return;
    setLoading(true);
    const [reviewsRes, completedRes] = await Promise.all([
      supabase
        .from('service_reviews')
        .select('*, bookings(*, cleaning_services(*))')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('*, cleaning_services(*)')
        .eq('customer_id', customerProfile.id)
        .eq('booking_status', 'completed'),
    ]);

    const reviewedBookingIds = new Set((reviewsRes.data ?? []).map((r) => r.booking_id));
    setReviews((reviewsRes.data as ServiceReview[]) ?? []);
    setReviewableBookings(((completedRes.data as Booking[]) ?? []).filter((b) => !reviewedBookingIds.has(b.id)));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile]);

  async function handleSubmitReview(bookingId: number) {
    if (!customerProfile || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('service_reviews').insert({
        customer_id: customerProfile.id,
        booking_id: bookingId,
        rating,
        review: reviewText.trim() || null,
      });
      if (error) throw error;
      toast.success('Thank you for your review!');
      setActiveBookingId(null);
      setRating(5);
      setReviewText('');
      load();
    } catch {
      toast.error('We could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card-grid">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {reviewableBookings.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Completed Services Awaiting Your Review</h3>
          <div className="card-grid">
            {reviewableBookings.map((b) => (
              <GlassCard key={b.id} style={{ padding: 18 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.booking_number}</p>
                <h4 style={{ fontSize: 14.5, marginBottom: 6 }}>{b.cleaning_services?.name}</h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>{formatDate(b.booking_date)}</p>

                {activeBookingId === b.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Stars value={rating} onChange={setRating} />
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Share your experience…"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleSubmitReview(b.id)} disabled={submitting}>
                        {submitting ? <Spinner size={14} /> : 'Submit Review'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setActiveBookingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setActiveBookingId(b.id)}>
                    Leave a Review
                  </button>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Your Reviews</h3>
        {reviews.length === 0 ? (
          <GlassCard style={{ padding: 10 }}>
            <EmptyState icon="⭐" title="No reviews yet" message="Reviews you leave for completed services will appear here." />
          </GlassCard>
        ) : (
          <div className="card-grid">
            {reviews.map((r) => (
              <GlassCard key={r.id} style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 14 }}>{r.bookings?.cleaning_services?.name}</h4>
                  <Stars value={r.rating} />
                </div>
                {r.review && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>&ldquo;{r.review}&rdquo;</p>}
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
