'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  apiAddBookmark,
  apiCheckBookmark,
  apiRemoveBookmark,
  type BookmarkTargetType,
} from '@/lib/api';

interface BookmarkButtonProps {
  targetType: BookmarkTargetType;
  targetId: string;
}

export default function BookmarkButton({ targetType, targetId }: BookmarkButtonProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const refreshCheck = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      const res = await apiCheckBookmark(targetType, targetId);
      setBookmarked(res.bookmarked);
      setBookmarkId(res.bookmarkId);
    } catch {
      setBookmarked(false);
      setBookmarkId(null);
    } finally {
      setChecking(false);
    }
  }, [user, targetType, targetId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBookmarked(false);
      setBookmarkId(null);
      return;
    }
    void refreshCheck();
  }, [authLoading, user, refreshCheck]);

  async function handleToggle() {
    if (!user || loading) return;
    setLoading(true);
    try {
      if (bookmarked && bookmarkId) {
        await apiRemoveBookmark(bookmarkId);
        setBookmarked(false);
        setBookmarkId(null);
      } else {
        const created = await apiAddBookmark(targetType, targetId);
        setBookmarked(true);
        setBookmarkId(created.id);
      }
    } catch {
      await refreshCheck();
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        <span aria-hidden>☆</span>
        Увійдіть, щоб зберегти
      </Link>
    );
  }

  const label = loading
    ? '…'
    : checking
      ? '…'
      : bookmarked
        ? 'Збережено'
        : 'Зберегти';

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={loading || checking}
      aria-pressed={bookmarked}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 8,
        border: bookmarked ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--border)',
        background: bookmarked ? 'rgba(245,158,11,0.12)' : 'transparent',
        color: bookmarked ? '#fbbf24' : 'var(--text-dim)',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading || checking ? 'wait' : 'pointer',
      }}
    >
      <span aria-hidden>{bookmarked ? '★' : '☆'}</span>
      {label}
    </button>
  );
}
