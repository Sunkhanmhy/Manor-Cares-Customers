import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { Spinner } from '../../components/Spinner';
import { formatDateTime } from '../../lib/format';
import type { SupportTicket, SupportTicketMessage, TicketPriority } from '../../types/database';

export function SupportPage() {
  const { customerProfile, profile } = useAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [submitting, setSubmitting] = useState(false);

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  async function load() {
    if (!customerProfile) return;
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('customer_id', customerProfile.id)
      .order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!customerProfile || submitting) return;
    if (!subject.trim() || !description.trim()) {
      toast.error('Please provide a subject and description.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        customer_id: customerProfile.id,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      if (error) throw error;
      toast.success('Support ticket created. Our team will respond shortly.');
      setSubject('');
      setDescription('');
      setPriority('normal');
      setShowNewForm(false);
      load();
    } catch {
      toast.error('We could not create your support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openTicket(ticket: SupportTicket) {
    setActiveTicket(ticket);
    const { data } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages((data as SupportTicketMessage[]) ?? []);
  }

  async function handleReply() {
    if (!activeTicket || !profile || !reply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const { error } = await supabase.from('support_ticket_messages').insert({
        ticket_id: activeTicket.id,
        profile_id: profile.id,
        sender_type: 'customer',
        message: reply.trim(),
      });
      if (error) throw error;
      setReply('');
      openTicket(activeTicket);
    } catch {
      toast.error('We could not send your reply.');
    } finally {
      setSendingReply(false);
    }
  }

  if (activeTicket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setActiveTicket(null)}>
          ← Back to tickets
        </button>
        <GlassCard style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 16 }}>{activeTicket.subject}</h3>
            <StatusBadge status={activeTicket.status} kind="ticket" />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{activeTicket.description}</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Priority: {activeTicket.priority} · Assigned to: {activeTicket.assigned_to ?? 'Unassigned'}
          </p>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
            {messages.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No replies yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender_type === 'customer' ? 'flex-end' : 'flex-start',
                    background: m.sender_type === 'customer' ? 'rgba(21,101,192,0.3)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    maxWidth: '80%',
                  }}
                >
                  <p style={{ fontSize: 13 }}>{m.message}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(m.created_at)}</p>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Type a reply…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <button className="btn btn-primary" onClick={handleReply} disabled={sendingReply || !reply.trim()}>
              {sendingReply ? <Spinner size={14} /> : 'Send'}
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Need help? Create a ticket or reach us via any channel below.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowNewForm((v) => !v)}>
            + New Ticket
          </button>
          <a className="btn btn-ghost" href={`mailto:support@manor-cares.com?subject=Support%20Request`}>Send Mail</a>
          <a className="btn btn-ghost" href={`https://wa.me/2340000000000?text=I%20need%20help`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn btn-ghost" href={`https://t.me/ManorCaresSupport`} target="_blank" rel="noreferrer">Telegram</a>
          <a className="btn btn-ghost" href={`https://instagram.com/manor-cares`} target="_blank" rel="noreferrer">Instagram</a>
          <a className="btn btn-ghost" href={`https://facebook.com/manor-cares`} target="_blank" rel="noreferrer">Facebook</a>
        </div>
      </div>

      {showNewForm && (
        <GlassCard style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Create Support Ticket</h3>
          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Subject</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="field">
              <label>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
              {submitting ? <Spinner size={16} /> : 'Submit Ticket'}
            </button>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <GlassCard style={{ padding: 10 }}>
          <EmptyState icon={<Icon name="support" size={40} />} title="No data available. Update your record, now!" message="Need help? Create a ticket and our team will assist you." />
        </GlassCard>
      ) : (
        <div className="card-grid">
          {tickets.map((t) => (
            <GlassCard key={t.id} style={{ padding: 18, cursor: 'pointer' }} onClick={() => openTicket(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ fontSize: 14.5 }}>{t.subject}</h4>
                <StatusBadge status={t.status} kind="ticket" />
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {t.description}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(t.created_at)}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
