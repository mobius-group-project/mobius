/**
 * Task list page component with drag-and-drop reordering.
 *
 * Uses dnd-kit (DndContext + SortableContext) for drag-and-drop.
 * SortableTaskItem is a local wrapper that adds dnd-kit sortable props to TaskItem;
 * it has no other consumers and is defined here to keep the drag logic contained.
 * The "Add task" button toggles an inline AddTaskForm in place of itself.
 */
import React, { useState } from 'react';
import TaskItem, { type ITask } from './TaskItem';
import TaskForm from './AddTaskForm';
import { Plus } from 'lucide-react';
import './styles/TaskList.css';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type useActivityTracker } from '../../hooks/useActivityTracker';

/**
 * Props for the {@link TaskList} component.
 */
interface Props {
  /** All tasks to display. */
  tasks: ITask[];
  /** Called when a task's checkbox is toggled. */
  onToggleTask: (id: string) => void;
  /** Called when a new task is submitted via the form. */
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  /** Called when a task is deleted. */
  onDelete: (id: string) => void;
  /** Called when a task is updated via inline edit. */
  onUpdateTask: (task: ITask) => void;
  /** Called when a comment is added. */
  onAddComment: (taskId: string, comment: string) => void | Promise<void>;
  /** Called when a comment is deleted. */
  onDeleteComment: (taskId: string, commentId: number) => void | Promise<void>;
  /** Called with the reordered task array after a drag-and-drop operation. */
  onReorderTasks: (tasks: ITask[]) => void;
  /** The activity tracker hook return value for per-task time control. */
  activityTracker: ReturnType<typeof useActivityTracker>;
}

/**
 * Wraps a {@link TaskItem} with dnd-kit sortable functionality.
 * Renders the item inside a div that provides drag-and-drop context.
 */
const SortableTaskItem = ({ 
  task, 
  onToggle, 
  onDelete, 
  onUpdateTask,
  onAddComment,
  onDeleteComment,
  activityTracker,
}: { 
  task: ITask;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
  onAddComment: (taskId: string, comment: string) => void | Promise<void>;
  onDeleteComment: (taskId: string, commentId: number) => void | Promise<void>;
  activityTracker: ReturnType<typeof useActivityTracker>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItem
        task={task}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdateTask={onUpdateTask}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        dragHandleProps={listeners}
        activityTracker={activityTracker}
      />
    </div>
  );
};

/**
 * Task list component with drag-and-drop reordering via dnd-kit.
 *
 * Contains an inline add-task form and renders each task as a {@link SortableTaskItem}.
 */
const TaskList: React.FC<Props> = ({ 
  tasks, 
  onToggleTask, 
  onAddTask, 
  onDelete, 
  onUpdateTask, 
  onAddComment, 
  onDeleteComment, 
  onReorderTasks,
  activityTracker 
}) => {
  const [isAdding, setIsAdding] = useState(false);

  /** Wraps the add callback to close the form after submission. */
  const handleAdd = (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
    onAddTask(title, deadline, description, priority);
    setIsAdding(false);
  };

  /** Handles the end of a drag event, reordering tasks via {@link onReorderTasks}. */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over?.id);
      onReorderTasks(arrayMove(tasks, oldIndex, newIndex));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          <div className="tasklist-add-header">
            {isAdding ? (
              <TaskForm
                onAdd={handleAdd}
                onCancel={() => setIsAdding(false)}
              />
            ) : (
              <button className="add-task-btn" onClick={() => setIsAdding(true)}>
                <Plus size={18} className="plus-icon" />
                <span>Add task</span>
              </button>
            )}
          </div>

          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onToggle={() => onToggleTask(task.id)}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                activityTracker={activityTracker}
              />
            ))
          ) : (
            <>
              <div className="task-item-empty" />
              <div className="task-item-empty" />
            </>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;