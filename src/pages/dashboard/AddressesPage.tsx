import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Spinner } from '../../components/Spinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Address } from '../../types/database';

const EMPTY_FORM = {
  address_type: 'home' as Address['address_type'],
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  is_default: false,
};

export function AddressesPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profile.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(address: Address) {
    setEditingId(address.id);
    setForm({
      address_type: address.address_type,
      address_line: address.address_line,
      city: address.city,
      state: address.state ?? '',
      country: address.country,
      postal_code: address.postal_code ?? '',
      is_default: address.is_default,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || saving) return;

    if (!form.address_line.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error('Please fill in address, city and country.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('addresses').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('Address updated.');
      } else {
        const { error } = await supabase.from('addresses').insert({ ...form, profile_id: profile.id });
        if (error) throw error;
        toast.success('Address added.');
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error('We could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(address: Address) {
    await supabase.from('addresses').update({ is_default: false }).eq('profile_id', profile!.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', address.id);
    toast.success('Default address updated.');
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Address removed.');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('We could not remove this address.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem' }}>Manage the addresses used for your cleaning bookings.</p>
        <button className="btn btn-primary" onClick={openAddForm}>
          + Add Address
        </button>
      </div>

      {showForm && (
        <GlassCard style={{ padding: 22 }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: 16 }}>{editingId ? 'Edit Address' : 'Add New Address'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  className="input"
                  value={form.address_line}
                  onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  className="input"
                  value={form.address_type}
                  onChange={(e) => setForm({ ...form, address_type: e.target.value as Address['address_type'] })}
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>City</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div className="field">
                <label>State</label>
                <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="field">
                <label>Country</label>
                <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
              </div>
              <div className="field">
                <label>Postal Code</label>
                <input className="input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Set as default address
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size={16} /> : 'Save Address'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <GlassCard style={{ padding: 10 }}>
          <EmptyState icon="📍" title="No addresses yet" message="Add an address to make booking a cleaning faster." />
        </GlassCard>
      ) : (
        <div className="card-grid">
          {addresses.map((address) => (
            <GlassCard key={address.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span className="badge badge-blue">{address.address_type}</span>
                {address.is_default && <span className="badge badge-green">Default</span>}
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>{address.address_line}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                {address.city}, {address.state ? `${address.state}, ` : ''}
                {address.country} {address.postal_code}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => openEditForm(address)} style={{ padding: '8px 14px', fontSize: '0.8125rem' }}>
                  Edit
                </button>
                {!address.is_default && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleSetDefault(address)}
                    style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                  >
                    Set Default
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => setDeleteTarget(address)}
                  style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                >
                  Delete
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
