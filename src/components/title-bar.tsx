'use client';

import React from 'react';

export default function TitleBar() {
  return (
    <div
      style={{
        height: '32px',
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'drag', // allows the window to be dragged
        padding: '0 12px',
        userSelect: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 500 }}>⚡ StudyVerse</span>
      <div style={{ WebkitAppRegion: 'no-drag' }}>
        {/* You can later add custom window control buttons here (minimize, maximize, close) */}
      </div>
    </div>
  );
}
