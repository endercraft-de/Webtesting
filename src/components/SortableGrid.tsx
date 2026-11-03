import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type ReactNode } from 'react'
import { cx } from './ui'

function Item({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('touch-manipulation cursor-grab active:cursor-grabbing', isDragging && 'opacity-30')}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export function SortableGrid<T extends { id: string }>({
  items,
  onChange,
  render,
  className,
}: {
  items: T[]
  onChange: (items: T[]) => void
  render: (item: T, index: number, overlay?: boolean) => ReactNode
  className: string
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [active, setActive] = useState<string | null>(null)
  const onEnd = (e: DragEndEvent) => {
    setActive(null)
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((x) => x.id === e.active.id)
    const to = items.findIndex((x) => x.id === e.over!.id)
    onChange(arrayMove(items, from, to))
  }
  const activeIndex = items.findIndex((x) => x.id === active)
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActive(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
      <SortableContext items={items.map((x) => x.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((it, i) => (
            <Item key={it.id} id={it.id}>
              {render(it, i)}
            </Item>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>{activeIndex >= 0 ? <div className="rotate-2 scale-105 cursor-grabbing drop-shadow-xl">{render(items[activeIndex], activeIndex, true)}</div> : null}</DragOverlay>
    </DndContext>
  )
}

/** Spread on interactive elements inside a sortable item so they don't start a drag. */
export const noDrag = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
}
