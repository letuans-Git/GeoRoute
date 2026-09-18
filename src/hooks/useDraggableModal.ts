import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UseDraggableModalOptions {
  isOpen?: boolean;
}

export function useDraggableModal(options: UseDraggableModalOptions = { isOpen: true }) {
  // Fix forms in place: do not allow moving/dragging
  return {
    position: { x: 0, y: 0 },
    isDragging: false,
    handleMouseDown: () => {},
    handleTouchStart: () => {},
    resetPosition: () => {},
    dragStyle: {},
    headerProps: {
      className: 'select-none',
    },
  };
}
