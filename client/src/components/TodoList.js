import React, { useEffect, useState } from 'react';
import TodoItem from './TodoItem';
import AddTodo from './AddTodo';

const TodoList = ({ listId, token }) => {
  const [todos, setTodos] = useState([]);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  useEffect(() => {
    fetch(`/api/lists/${listId}/todos`, {
      headers: {
        'Authorization': token,
      },
    })
      .then(response => response.json())
      .then(data => setTodos(data));
  }, [listId, token]);

  const addTodo = async (text) => {
    const response = await fetch(`/api/lists/${listId}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ text }),
    });
    const newTodo = await response.json();
    setTodos([...todos, newTodo]);
  };

  const toggleComplete = async (id) => {
    await fetch(`/api/lists/${listId}/todos/${id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
    });
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = async (id) => {
    await fetch(`/api/lists/${listId}/todos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
      },
    });
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const editTodo = (todoId, text) => {
    setEditingTodoId(todoId);
    setEditingTodoText(text);
  };

  const saveTodo = async (todoId) => {
    await fetch(`/api/lists/${listId}/todos/${todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ text: editingTodoText }),
    });
    setTodos(todos.map(todo =>
      todo.id === todoId ? { ...todo, text: editingTodoText } : todo
    ));
    setEditingTodoId(null);
  };

  return (
    <div>
      <h2>Liste des tâches</h2>
      <AddTodo addTodo={addTodo} />
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          toggleComplete={toggleComplete}
          deleteTodo={deleteTodo}
          editTodo={editTodo}
          saveTodo={saveTodo}
          editingTodoId={editingTodoId}
          editingTodoText={editingTodoText}
          setEditingTodoText={setEditingTodoText}
        />
      ))}
    </div>
  );
};

export default TodoList;
