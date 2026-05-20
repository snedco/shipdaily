'use client';

import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';

export default function AppPage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserClient();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false }).limit(50);
    setItems(data ?? []);
    setLoading(false);
  }

  async function add() {
    if (!title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/?signin=1'; return; }
    await supabase.from('items').insert({ user_id: user.id, title });
    setTitle('');
    load();
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-light mb-8">TheEntryLevelDevJobsAreD</h1>
      <div className="flex gap-2 mb-8">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add something..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-4 py-2 focus:border-emerald-600 outline-none"
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button
          onClick={add}
          className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded text-white font-medium"
        >
          Add
        </button>
      </div>
      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-500">No items yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="bg-zinc-900 border border-zinc-800 rounded px-4 py-3">
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
