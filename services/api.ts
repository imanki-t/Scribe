import { Folder, Note, SearchResult, Stats, Tag } from '../types';

const BASE = '/api';

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(BASE + url, {
    headers: { ...headers, ...(opts.headers as any) },
    credentials: 'include', // send cookies
    ...opts,
  });

  if (res.status === 401) {
    window.location.href = '/app';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    me:             ()                         => req<any>('/auth/me'),
    login:          (u: string, p: string)     => req<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
    register:       (u: string, p: string, d?: string) => req<any>('/auth/register', { method: 'POST', body: JSON.stringify({ username: u, password: p, displayName: d }) }),
    logout:         ()                         => req<any>('/auth/logout', { method: 'POST' }),
    updateProfile:  (data: any)               => req<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    changePassword: (cur: string, next: string) => req<any>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: cur, newPassword: next }) }),
    googleUrl:      () => '/api/auth/google',
  },

  folders: {
    list:   ()                        => req<Folder[]>('/folders'),
    create: (data: Partial<Folder>)   => req<Folder>('/folders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Folder>) => req<Folder>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string)              => req<{ success: boolean }>(`/folders/${id}`, { method: 'DELETE' }),
  },

  notes: {
    list: (params?: { folderId?: string | null; tag?: string; favorite?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.folderId !== undefined) qs.set('folderId', params.folderId === null ? 'null' : params.folderId);
      if (params?.tag) qs.set('tag', params.tag);
      if (params?.favorite) qs.set('favorite', 'true');
      return req<Note[]>(`/notes?${qs.toString()}`);
    },
    listAll: () => req<Note[]>('/notes/all'),
    recent:  () => req<Note[]>('/notes/recent'),
    get:     (id: string) => req<Note>(`/notes/${id}`),
    create:  (data: Partial<Note>) => req<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id: string, data: Partial<Note>) => req<Note>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete:  (id: string) => req<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
    move:    (id: string, folderId: string | null) => req<Note>(`/notes/${id}/move`, { method: 'PATCH', body: JSON.stringify({ folderId }) }),
    addImage:(id: string, data: string, mimeType: string, name: string) => req<{ id: string; url: string }>(`/notes/${id}/images`, { method: 'POST', body: JSON.stringify({ data, mimeType, name }) }),
    versions:(id: string) => req<any[]>(`/notes/${id}/versions`),
    version: (id: string, idx: number) => req<any>(`/notes/${id}/versions/${idx}`),
    share:   (id: string, enable: boolean) => req<any>(`/notes/${id}/share`, { method: 'POST', body: JSON.stringify({ enable }) }),
  },

  search: (q: string, opts?: { folderId?: string; tag?: string; caseSensitive?: boolean }) => {
    const qs = new URLSearchParams({ q });
    if (opts?.folderId) qs.set('folderId', opts.folderId);
    if (opts?.tag) qs.set('tag', opts.tag);
    if (opts?.caseSensitive) qs.set('caseSensitive', 'true');
    return req<SearchResult[]>(`/search?${qs.toString()}`);
  },

  tags:  () => req<Tag[]>('/tags'),
  stats: () => req<Stats>('/stats'),
};
