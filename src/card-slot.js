export const createCardSlot = (onClosed = () => {}) => {
  let live = null
  let shown = null

  const alive = () => (live && !live.isDestroyed() ? live : null)

  const forget = (reason) => {
    const card = shown
    live = null
    shown = null
    if (card) onClosed(card, reason)
  }

  const close = (reason) => {
    const window = alive()
    forget(reason)
    window?.close()
  }

  return {
    open: (window, card) => {
      close('replaced')
      live = window
      shown = card
    },
    window: alive,
    card: () => shown,
    isEmpty: () => alive() === null,
    closed: (window) => {
      if (window === live) forget('window-closed')
    },
    close,
  }
}
