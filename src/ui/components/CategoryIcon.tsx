import { createElement } from 'react'
import { categoryIcon } from '../categoryIcons'

export function CategoryIcon({
  name,
  size = 16,
}: {
  name: string
  size?: number
}) {
  return createElement(categoryIcon(name), {
    size,
    'aria-hidden': true,
    className: 'text-muted shrink-0',
  })
}
