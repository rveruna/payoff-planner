export const colors = {
  background: '#f5f7fb',
  card: '#ffffff',
  text: '#1d2433',
  muted: '#4a5568',
  accent: '#17805a',
  accentSoft: '#e6f4ee',
  line: '#d9dee7',
  danger: '#b3261e',
  warn: '#fff4e0',
  onAccent: '#ffffff',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;

/** The smallest size of anything that can be tapped, in points (Apple and Google both ask for about this). */
export const MIN_TARGET = 48;

export const font = { small: 13, body: 16, title: 20, big: 32 } as const;
