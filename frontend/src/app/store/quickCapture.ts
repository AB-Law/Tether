import { create } from 'zustand'

type QuickCaptureState = {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

export const useQuickCaptureStore = create<QuickCaptureState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
