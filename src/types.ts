export type ViewMode   = 'edit' | 'preview' | 'split';
export type Theme      = 'dark' | 'light' | 'system';
export type SortKey    = 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
export type FontFamily = 'jakarta' | 'mono' | 'serif' | 'cursive';

export interface Note {
  _id:          string;
  title:        string;
  content:      string;
  folderId:     string | null;
  tags:         string[];
  color:        string | null;
  isPinned:     boolean;
  isFavorite:   boolean;
  wordCount:    number;
  charCount:    number;
  isPublic:     boolean;
  shareToken:   string | null;
  template:     string | null;
  versionCount: number;
  createdAt:    string;
  updatedAt:    string;
}

export interface Folder {
  _id:       string;
  name:      string;
  color:     string;
  parentId:  string | null;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag { name: string; count: number; }

export interface Collaborator { userId: string; userName: string; color: string; }

export interface SearchResult {
  _id: string; title: string; content: string; snippet: string;
  folderId: string | null; tags: string[]; isPinned: boolean;
  isFavorite: boolean; wordCount: number; updatedAt: string; createdAt: string;
}

export interface Stats {
  noteCount: number; folderCount: number; pinnedCount: number;
  favoriteCount: number; totalWords: number; totalChars: number;
  streak: number; readingTime: number;
}

export interface Settings {
  fontSize:      number;
  lineHeight:    number;
  fontFamily:    FontFamily;
  tabSize:       number;
  spellCheck:    boolean;
  defaultView:   ViewMode;
  autosaveDelay: number;
  showWordCount: boolean;
  accentColor:   string;
  focusMode:     boolean;
  typewriterMode:boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize:       15,
  lineHeight:     1.75,
  fontFamily:     'jakarta',
  tabSize:        2,
  spellCheck:     true,
  defaultView:    'edit',
  autosaveDelay:  800,
  showWordCount:  true,
  accentColor:    '#f59e0b',
  focusMode:      false,
  typewriterMode: false,
};

export interface User {
  id: string; username: string; displayName: string;
  email: string; avatar: string; accentColor: string;
  streak: number; totalWords: number; settings: Record<string, any>;
  hasGoogle: boolean; createdAt: string;
}

export const NOTE_TEMPLATES: Record<string, { label: string; icon: string; content: string }> = {
  blank:      { label: 'Blank',         icon: '📄', content: '' },
  meeting:    { label: 'Meeting Notes',  icon: '🤝', content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:**\n\n## Agenda\n\n## Discussion\n\n## Action Items\n- [ ] \n\n## Next Steps\n` },
  journal:    { label: 'Daily Journal',  icon: '📓', content: `# ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n\n## How I'm feeling\n\n## What happened today\n\n## Gratitude\n- \n\n## Tomorrow's goals\n- \n` },
  todo:       { label: 'To-Do List',    icon: '✅', content: `# To-Do\n\n## High Priority\n- [ ] \n\n## Medium Priority\n- [ ] \n\n## Low Priority\n- [ ] \n` },
  brainstorm: { label: 'Brainstorm',    icon: '💡', content: `# Brainstorm: \n\n## Core Idea\n\n## Possibilities\n- \n\n## Constraints\n- \n\n## Next Steps\n- \n` },
};
