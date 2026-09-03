import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import Icon from '../../components/Icon';
import { Spinner } from '../../components/Spinner';
import { formatDateTime } from '../../lib/format';
import type { Address, SupportTicket, TicketPriority } from '../../types/database';

function extractTicketMeta(description: string) {
  const department = description.split('Department: ')[1]?.split('\n')[0]?.trim() || 'General';
  const requestType = description.split('Request type: ')[1]?.split('\n')[0]?.trim() || 'General enquiry';
  return { department, requestType };
}

export function SupportPage() {
  const { customerProfile, profile, user } = useAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOptions, setBookingOptions] = useState<Array<{ id: number; property_type: string; property_address: string }>>([]);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(customerProfile?.id ?? null);

  const [ticketForm, setTicketForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    department: 'IT Admin',
    request_type: 'Technical Support',
    priority: 'normal' as TicketPriority,
    subject: '',
    details: '',
  });

  const [reviewForm, setReviewForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    service_name: '',
    rating: '5',
    satisfaction: 'Excellent',
    comments: '',
  });

  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const activeCustomerName = useMemo(() => {
    return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || user?.email?.split('@')[0] || 'Customer';
  }, [profile, user]);

  async function load() {
    const authEmail = (user?.email ?? profile?.email ?? '').trim().toLowerCase();

    if (!authEmail) {
      setTickets([]);
      setBookingOptions([]);
      setResolvedCustomerId(null);
      setLoading(false);
      return;
    }

    const { data: profileRow } = await supabase.from('profiles').select('*').ilike('email', authEmail).maybeSingle();

    const profileId = profileRow?.id ?? profile?.id ?? null;
    if (!profileId) {
      setTickets([]);
      setBookingOptions([]);
      setResolvedCustomerId(null);
      setLoading(false);
      return;
    }

    const { data: customerRow } = await supabase.from('customer_profiles').select('id').eq('profile_id', profileId).maybeSingle();
    const customerId = customerRow?.id ?? customerProfile?.id ?? null;

    setResolvedCustomerId(customerId);

    if (!customerId) {
      setTickets([]);
      setBookingOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [ticketRes, addressRes, bookingRes] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('addresses').select('*').eq('profile_id', profileId).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('bookings').select('id, property_type, property_address').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20),
    ]);

    setTickets((ticketRes.data as SupportTicket[]) ?? []);
    setBookingOptions((bookingRes.data ?? []) as Array<{ id: number; property_type: string; property_address: string }>);

    const defaults = (addressRes.data as Address[]) ?? [];
    const defaultAddress = defaults.find((item) => item.is_default) ?? defaults[0];
    const defaultAddressText = defaultAddress ? [defaultAddress.address_line, defaultAddress.city, defaultAddress.state, defaultAddress.country].filter(Boolean).join(', ') : '';

    setTicketForm((prev) => ({
      ...prev,
      full_name: activeCustomerName,
      phone: profileRow.phone ?? profile?.phone ?? '',
      email: profileRow.email ?? profile?.email ?? user?.email ?? '',
      address: defaultAddressText,
    }));

    const newestBooking = ((bookingRes.data ?? []) as Array<{ id: number; property_type: string; property_address: string }>)[0];

    setReviewForm((prev) => ({
      ...prev,
      full_name: activeCustomerName,
      phone: profileRow.phone ?? profile?.phone ?? '',
      email: profileRow.email ?? profile?.email ?? user?.email ?? '',
      address: defaultAddressText,
      service_name: newestBooking?.property_type ?? 'General Service',
    }));

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile, profile, user]);

  async function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedCustomerId || submittingTicket) return;
    if (!ticketForm.subject.trim() || !ticketForm.details.trim()) {
      toast.error('Please fill in the subject and issue details.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const descriptionText = [
        `Customer: ${ticketForm.full_name}`,
        `Email: ${ticketForm.email}`,
        `Phone: ${ticketForm.phone}`,
        `Address: ${ticketForm.address || 'Not provided'}`,
        `Department: ${ticketForm.department}`,
        `Request type: ${ticketForm.request_type}`,
        `Issue details: ${ticketForm.details.trim()}`,
      ].join('\n');

      const { error } = await supabase.from('support_tickets').insert({
        customer_id: resolvedCustomerId,
        subject: `${ticketForm.department} - ${ticketForm.subject.trim()}`,
        description: descriptionText,
        priority: ticketForm.priority,
        status: 'open',
      });

      if (error) throw error;
      toast.success('Your support request has been submitted successfully.');
      setTicketForm((prev) => ({ ...prev, subject: '', details: '' }));
      await load();
    } catch {
      toast.error('We could not submit your support request. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedCustomerId || submittingReview) return;
    if (!reviewForm.comments.trim()) {
      toast.error('Please leave a review comment before submitting.');
      return;
    }

    const bookingId = bookingOptions[0]?.id;
    if (!bookingId) {
      toast.error('No previous booking is available yet for this review. Please create a booking first.');
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewText = [
        `Customer: ${reviewForm.full_name}`,
        `Email: ${reviewForm.email}`,
        `Phone: ${reviewForm.phone}`,
        `Address: ${reviewForm.address || 'Not provided'}`,
        `Service: ${reviewForm.service_name || 'General Service'}`,
        `Satisfaction level: ${reviewForm.satisfaction}`,
        `Comments: ${reviewForm.comments.trim()}`,
      ].join('\n');

      const { error } = await supabase.from('service_reviews').insert({
        customer_id: resolvedCustomerId,
        booking_id: bookingId,
        rating: Number(reviewForm.rating),
        review: reviewText,
      });

      if (error) throw error;
      toast.success('Your review has been saved successfully.');
      setReviewForm((prev) => ({ ...prev, comments: '', service_name: bookingOptions[0]?.property_type ?? 'General Service' }));
    } catch {
      toast.error('We could not submit your review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 18, background: '#000000' }} strong>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-muted)' }}>Need help? Create a ticket or reach us via any channel below.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="button">+ New Ticket</button>
            <a className="btn btn-ghost" href="mailto:support@manor-cares.com?subject=Support%20Request">Send Mail</a>
            <a className="btn btn-ghost" href="https://wa.me/2340000000000?text=I%20need%20help" target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn btn-ghost" href="https://t.me/ManorCaresSupport" target="_blank" rel="noreferrer">Telegram</a>
            <a className="btn btn-ghost" href="https://instagram.com/manor-cares" target="_blank" rel="noreferrer">Instagram</a>
            <a className="btn btn-ghost" href="https://facebook.com/manor-cares" target="_blank" rel="noreferrer">Facebook</a>
          </div>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Icon name="support" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Ticket / Enquiry Form</h3>
          </div>

          <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Full Name</span>
                <input className="input" value={ticketForm.full_name} onChange={(e) => setTicketForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              </label>
              <label className="field">
                <span>Phone Number</span>
                <input className="input" value={ticketForm.phone} onChange={(e) => setTicketForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Email Address</span>
                <input className="input" type="email" value={ticketForm.email} onChange={(e) => setTicketForm((prev) => ({ ...prev, email: e.target.value }))} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Address</span>
                <input className="input" value={ticketForm.address} onChange={(e) => setTicketForm((prev) => ({ ...prev, address: e.target.value }))} />
              </label>
              <label className="field">
                <span>Department</span>
                <select className="input" value={ticketForm.department} onChange={(e) => setTicketForm((prev) => ({ ...prev, department: e.target.value }))}>
                  <option value="Finance">Finance</option>
                  <option value="HR">HR</option>
                  <option value="IT Admin">IT Admin</option>
                  <option value="Legal">Legal</option>
                  <option value="Customer Care">Customer Care</option>
                </select>
              </label>
              <label className="field">
                <span>Request Type</span>
                <select className="input" value={ticketForm.request_type} onChange={(e) => setTicketForm((prev) => ({ ...prev, request_type: e.target.value }))}>
                  <option value="Technical Support">Technical Support</option>
                  <option value="IT Help">IT Help</option>
                  <option value="Query">Query</option>
                  <option value="Request">Request</option>
                </select>
              </label>
              <label className="field">
                <span>Priority</span>
                <select className="input" value={ticketForm.priority} onChange={(e) => setTicketForm((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="field">
                <span>Subject</span>
                <input className="input" value={ticketForm.subject} onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Issue / Request Details</span>
                <textarea className="input" rows={6} value={ticketForm.details} onChange={(e) => setTicketForm((prev) => ({ ...prev, details: e.target.value }))} />
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submittingTicket} style={{ alignSelf: 'flex-start' }}>
              {submittingTicket ? <Spinner size={16} /> : 'Submit Ticket'}
            </button>
          </form>
        </GlassCard>

        <GlassCard style={{ padding: 20, background: '#000000' }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Icon name="star" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Review Form</h3>
          </div>

          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Full Name</span>
                <input className="input" value={reviewForm.full_name} onChange={(e) => setReviewForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              </label>
              <label className="field">
                <span>Phone Number</span>
                <input className="input" value={reviewForm.phone} onChange={(e) => setReviewForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Email Address</span>
                <input className="input" type="email" value={reviewForm.email} onChange={(e) => setReviewForm((prev) => ({ ...prev, email: e.target.value }))} />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Address</span>
                <input className="input" value={reviewForm.address} onChange={(e) => setReviewForm((prev) => ({ ...prev, address: e.target.value }))} />
              </label>
              <label className="field">
                <span>Service / Product</span>
                <input className="input" value={reviewForm.service_name} onChange={(e) => setReviewForm((prev) => ({ ...prev, service_name: e.target.value }))} />
              </label>
              <label className="field">
                <span>Rating</span>
                <select className="input" value={reviewForm.rating} onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very Good</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Poor</option>
                </select>
              </label>
              <label className="field">
                <span>Satisfaction</span>
                <select className="input" value={reviewForm.satisfaction} onChange={(e) => setReviewForm((prev) => ({ ...prev, satisfaction: e.target.value }))}>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Satisfied">Very Satisfied</option>
                  <option value="Satisfied">Satisfied</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Dissatisfied">Dissatisfied</option>
                </select>
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Your Review / Comments</span>
                <textarea className="input" rows={6} value={reviewForm.comments} onChange={(e) => setReviewForm((prev) => ({ ...prev, comments: e.target.value }))} />
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submittingReview} style={{ alignSelf: 'flex-start' }}>
              {submittingReview ? <Spinner size={16} /> : 'Submit Review'}
            </button>
          </form>
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon name="support" size={18} />
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Submitted Enquiries & Ticket Report</h3>
        </div>

        <div className="scroll-x">
          <table className="table-clean">
            <thead>
              <tr>
                <th>S/No.</th>
                <th>Ticket Details</th>
                <th>Department</th>
                <th>Ticket Type</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '14px 12px' }}><SkeletonCard /></td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '18px 14px' }}>
                    No data available. Update your record, now!
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, index) => {
                  const meta = extractTicketMeta(ticket.description);
                  return (
                    <tr key={ticket.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ticket.subject}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78125rem' }}>#{ticket.id} • {formatDateTime(ticket.created_at)}</div>
                        <div style={{ marginTop: 4 }}>
                          <span className={`badge ${ticket.status === 'closed' ? 'badge-green' : ticket.status === 'resolved' ? 'badge-blue' : 'badge-amber'}`}>
                            {ticket.status}
                          </span>
                        </div>
                      </td>
                      <td>{meta.department}</td>
                      <td>{meta.requestType}</td>
                      <td style={{ textTransform: 'capitalize' }}>{ticket.priority}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
