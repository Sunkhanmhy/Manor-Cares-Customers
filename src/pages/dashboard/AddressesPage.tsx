import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { Spinner } from '../../components/Spinner';
import Icon from '../../components/Icon';
import type { Address } from '../../types/database';

const EMPTY_FORM = {
  address_type: 'home' as Address['address_type'],
  address_line: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  is_default: false,
  property_name: '',
  building_name: '',
  landmark: '',
  delivery_notes: '',
};

export function AddressesPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
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
      property_name: '',
      building_name: '',
      landmark: '',
      delivery_notes: '',
    });
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
      const payload = {
        profile_id: profile.id,
        address_type: form.address_type,
        address_line: form.address_line.trim(),
        city: form.city.trim(),
        state: form.state.trim() || null,
        country: form.country.trim(),
        postal_code: form.postal_code.trim() || null,
        is_default: form.is_default,
      };

      if (editingId) {
        const { error } = await supabase.from('addresses').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Address updated.');
      } else {
        const { error } = await supabase.from('addresses').insert(payload);
        if (error) throw error;
        toast.success('Address added.');
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      toast.error('We could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(address: Address) {
    if (!profile) return;
    await supabase.from('addresses').update({ is_default: false }).eq('profile_id', profile.id);
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
      await load();
    } catch {
      toast.error('We could not remove this address.');
    } finally {
      setDeleting(false);
    }
  }

  const tableRows = useMemo(() => addresses.map((address) => ({ ...address })), [addresses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 16, background: '#000000' }} strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#f4c95d', fontSize: '1.15rem', lineHeight: 1 }}>★</span>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.84375rem' }}>
            Manage the addresses used for your cleaning bookings and property records.
          </p>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: 20 }} strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="location" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{editingId ? 'Edit Address' : 'Personal Details'}</h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Address Type</span>
                <select
                  className="input"
                  value={form.address_type}
                  onChange={(e) => setForm({ ...form, address_type: e.target.value as Address['address_type'] })}
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Street Address / Property Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="location" size={18} />
                  <input
                    className="input"
                    value={form.address_line}
                    onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>City</span>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </label>

              <label className="field">
                <span>State / Region</span>
                <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </label>

              <label className="field">
                <span>Country</span>
                <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
              </label>

              <label className="field">
                <span>Postal Code</span>
                <input className="input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </label>

              <label className="field">
                <span>Property / Building Name</span>
                <input className="input" value={form.building_name} onChange={(e) => setForm({ ...form, building_name: e.target.value })} />
              </label>

              <label className="field">
                <span>Landmark</span>
                <input className="input" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Delivery Notes</span>
                <textarea className="input" rows={3} value={form.delivery_notes} onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })} />
              </label>
            </div>

            <label className="checkbox-row">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Set as default address
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
                Clear
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size={16} /> : editingId ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </form>
        </GlassCard>

        <GlassCard style={{ padding: 20 }} strong>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="calendar" size={18} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Registered Addresses</h3>
            </div>
            <button className="btn btn-primary" onClick={openAddForm}>+ Add</button>
          </div>

          <div className="scroll-x">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text-muted)', padding: '18px 14px' }}>Loading addresses…</td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '18px 14px' }}>
                      No data available. Update your record, now!
                    </td>
                  </tr>
                ) : (
                  tableRows.map((address) => (
                    <tr key={address.id} onClick={() => setSelectedAddress(address)} style={{ cursor: 'pointer' }}>
                      <td style={{ textTransform: 'capitalize' }}>{address.address_type}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{address.address_line}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{address.city}, {address.state ? `${address.state}, ` : ''}{address.country}</div>
                      </td>
                      <td>{address.is_default ? <span className="badge badge-green">Default</span> : <span className="badge badge-gray">Optional</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {!address.is_default && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleSetDefault(address);
                              }}
                              style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(address);
                            }}
                            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {selectedAddress && (
        <div
          onClick={() => setSelectedAddress(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(4, 10, 20, 0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 90vw)', background: 'rgba(15,15,20,0.96)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{selectedAddress.address_type.toUpperCase()} Address</h3>
              <button className="btn btn-ghost" onClick={() => setSelectedAddress(null)}>Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8125rem' }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Street Address</label>
                <div className="input" style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>{selectedAddress.address_line}</div>
              </div>
              <div className="field">
                <label>City</label>
                <div className="input" style={{ minHeight: 44 }}>{selectedAddress.city}</div>
              </div>
              <div className="field">
                <label>State</label>
                <div className="input" style={{ minHeight: 44 }}>{selectedAddress.state ?? '—'}</div>
              </div>
              <div className="field">
                <label>Country</label>
                <div className="input" style={{ minHeight: 44 }}>{selectedAddress.country}</div>
              </div>
              <div className="field">
                <label>Postal Code</label>
                <div className="input" style={{ minHeight: 44 }}>{selectedAddress.postal_code ?? '—'}</div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Default Address</label>
                <div className="input" style={{ minHeight: 44 }}>{selectedAddress.is_default ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => { setSelectedAddress(null); openEditForm(selectedAddress); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => { setDeleteTarget(selectedAddress); setSelectedAddress(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(4, 10, 20, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 90vw)', background: 'rgba(15,15,20,0.96)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 22 }}>
            <h3 style={{ marginTop: 0 }}>Delete address?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>This will permanently remove this saved address from your profile.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting} onClick={async () => { await handleDelete(); setDeleteTarget(null); }}>
                {deleting ? <Spinner size={14} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
