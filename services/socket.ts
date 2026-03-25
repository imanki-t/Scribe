type Handler = (msg: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentNoteId: string | null = null;
  private userId: string;
  private userName: string;
  private shouldReconnect = true;
  private pendingMessages: string[] = [];

  constructor() {
    this.userId   = localStorage.getItem('scribe_user_id')   || crypto.randomUUID();
    this.userName = localStorage.getItem('scribe_user_name') || 'Anonymous';
    localStorage.setItem('scribe_user_id', this.userId);
  }

  setUserName(name: string) {
    this.userName = name;
    localStorage.setItem('scribe_user_name', name);
  }

  getUserId()   { return this.userId; }
  getUserName() { return this.userName; }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev    = (import.meta as any).env?.DEV ?? false;
    const url      = isDev
      ? `${protocol}//${window.location.hostname}:4000`
      : `${protocol}//${window.location.host}`;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.emit('connected', null);
      while (this.pendingMessages.length) this.ws!.send(this.pendingMessages.shift()!);
      if (this.currentNoteId) this.joinNote(this.currentNoteId);
    };
    this.ws.onmessage = (e) => {
      try { const msg = JSON.parse(e.data); this.emit(msg.type, msg); } catch {}
    };
    this.ws.onclose = () => {
      this.emit('disconnected', null);
      if (this.shouldReconnect) this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(); this.ws = null;
  }

  private send(msg: object) {
    const str = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(str);
    else this.pendingMessages.push(str);
  }

  joinNote(noteId: string) {
    this.currentNoteId = noteId;
    this.send({ type: 'join_note', noteId, userId: this.userId, userName: this.userName });
  }

  leaveNote() {
    if (this.currentNoteId) { this.send({ type: 'leave_note' }); this.currentNoteId = null; }
  }

  sendNoteUpdate(title: string, content: string, tags: string[]) {
    this.send({ type: 'note_update', title, content, tags });
  }

  sendCursorUpdate(position: number) {
    this.send({ type: 'cursor_update', position });
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler) { this.handlers.get(event)?.delete(handler); }
  private emit(event: string, data: any) { this.handlers.get(event)?.forEach((h) => h(data)); }
}

export const socket = new SocketService();
