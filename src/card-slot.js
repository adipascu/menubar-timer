export const createCardSlot = () => {
  let live = null
  let shown = null

  const alive = () => (live && !live.isDestroyed() ? live : null)

  const forget = () => {
    live = null
    shown = null
  }

  const close = () => {
    const window = alive()
    forget()
    window?.close()
  }

  return {
    open: (window, card) => {
      close()
      live = window
      shown = card
    },
    window: alive,
    card: () => shown,
    isEmpty: () => alive() === null,
    closed: (window) => {
      if (window === live) forget()
    },
    close,
  }
}
