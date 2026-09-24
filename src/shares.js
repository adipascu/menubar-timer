const sum = (values) => values.reduce((total, value) => total + value, 0)

const liveOf = (categories) => categories.filter(({ archived }) => !archived)

export const shareTotal = (categories) => sum(liveOf(categories).map(({ share }) => share))

export const proportional = (weights, target) => {
  const weight = sum(weights)
  const exact = weights.map((value) => (weight === 0 ? target / weights.length : (value * target) / weight))
  const whole = exact.map(Math.floor)
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - whole[index] }))
    .sort((first, second) => second.remainder - first.remainder || first.index - second.index)
  const short = target - sum(whole)
  for (const { index } of byRemainder.slice(0, short)) whole[index] += 1
  return whole
}

const rescaled = (categories, target) => {
  const live = liveOf(categories)
  const shares = proportional(
    live.map(({ share }) => share),
    target,
  )
  return categories.map((category) =>
    category.archived ? category : { ...category, share: shares[live.indexOf(category)] },
  )
}

export const archived = (categories, id) => {
  const before = shareTotal(categories)
  const marked = categories.map((category) =>
    category.id === id && !category.archived
      ? { ...category, archived: true, archivedShare: category.share, share: 0 }
      : category,
  )
  return rescaled(marked, before)
}

export const restored = (categories, id) =>
  categories.map((category) => {
    if (category.id !== id || !category.archived) return category
    const { archivedShare, ...rest } = category
    return { ...rest, archived: false, share: archivedShare ?? 0 }
  })

export const redistributed = (categories) => rescaled(categories, 100)
