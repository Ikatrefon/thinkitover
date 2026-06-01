'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return null }
      return r.json()
    }).then(d => {
      if (!d) return
      setEmail(d.email)
      setName(d.name || d.email)
      setNameInput(d.name || '')
    })
  }, [router])

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameSaving(true)
    setNameMsg('')
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput }),
    })
    const data = await res.json()
    setNameSaving(false)
    if (res.ok) {
      setName(data.name || data.email)
      setNameMsg('Saved!')
    } else {
      setNameMsg(data.error || 'Error')
    }
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return }
    setPwSaving(true)
    setPwMsg('')
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setPwSaving(false)
    if (res.ok) {
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwMsg('Password changed!')
    } else {
      setPwMsg(data.error || 'Error')
    }
    setTimeout(() => setPwMsg(''), 4000)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/boards" className="text-gray-500 hover:text-white transition-colors text-sm">
          ← Boards
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {name[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-medium">{name}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-8">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Display name */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Profile</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email (read-only)</label>
            <div className="text-sm text-gray-400 bg-gray-800 rounded-lg px-3 py-2">{email}</div>
          </div>
          <form onSubmit={saveName} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Display name</label>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Your name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={nameSaving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {nameSaving ? 'Saving…' : 'Save name'}
              </button>
              {nameMsg && (
                <span className={`text-xs ${nameMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>
                  {nameMsg}
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Change password</h2>
          <form onSubmit={savePassword} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pwSaving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {pwSaving ? 'Saving…' : 'Change password'}
              </button>
              {pwMsg && (
                <span className={`text-xs ${pwMsg === 'Password changed!' ? 'text-green-400' : 'text-red-400'}`}>
                  {pwMsg}
                </span>
              )}
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
