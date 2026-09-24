const cleaned = (value) => (typeof value === 'string' ? value.trim() : '')

export const withLabel = (labels, categoryId, label) => {
  const rest = { ...labels }
  delete rest[categoryId]
  const kept = cleaned(label)
  return kept ? { ...rest, [categoryId]: kept } : rest
}

export const storedLabels = (stored, activeCategoryId) => {
  if (stored?.labels && typeof stored.labels === 'object') {
    return Object.entries(stored.labels).reduce((labels, [id, label]) => withLabel(labels, id, label), {})
  }
  return withLabel({}, activeCategoryId, stored?.label)
}

export const pickerLabel = (...parts) => parts.filter(Boolean).join(' · ')
