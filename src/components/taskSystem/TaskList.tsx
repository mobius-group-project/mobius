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

interface Props {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
  onReorderTasks: (tasks: ITask[]) => void;
}

const SortableTaskItem = ({ 
  task, 
  onToggle, 
  onDelete, 
  onUpdateTask 
}: { 
  task: ITask;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
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
        dragHandleProps={listeners}
      />
    </div>
  );
};

const TaskList: React.FC<Props> = ({ tasks, onToggleTask, onAddTask, onDelete, onUpdateTask, onReorderTasks }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
    onAddTask(title, deadline, description, priority);
    setIsAdding(false); 
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over?.id);
      
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks(newTasks);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => onToggleTask(task.id)}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
              />
            ))
          ) : (
            <>
              <div className="task-item-empty" />
              <div className="task-item-empty" />
            </>
          )}

          <div className="task-list-footer">
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
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TaskList;