// import React from 'react';

// const TodoItem = ({ todo, toggleComplete, deleteTodo, editTodo, saveTodo, editingTodoId, editingTodoText, setEditingTodoText }) => {
//   const handleCheckboxChange = () => {
//     toggleComplete(todo.id);
//   };

//   return (
//     <div>
//       <input
//         type="checkbox"
//         checked={todo.completed}
//         onChange={handleCheckboxChange}
//       />
//       {editingTodoId === todo.id ? (
//         <>
//           <input
//             type="text"
//             value={editingTodoText}
//             onChange={(e) => setEditingTodoText(e.target.value)}
//           />
//           <button onClick={() => saveTodo(todo.id)}>Enregistrer</button>
//         </>
//       ) : (
//         <>
//           <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
//             {todo.text}
//           </span>
//           <button onClick={() => editTodo(todo.id, todo.text)}>Modifier</button>
//         </>
//       )}
//       <button onClick={() => deleteTodo(todo.id)}>Supprimer</button>
//     </div>
//   );
// };

// export default TodoItem;




import React from 'react';

const TodoItem = ({
  todo,
  toggleComplete,
  deleteTodo,
  editTodo,
  saveTodo,
  editingTodoId,
  editingTodoText,
  setEditingTodoText,
}) => {
  const handleCheckboxChange = () => {
    toggleComplete(todo.id);
  };

  return (
    <div className="todo-item">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleCheckboxChange}
      />
      {editingTodoId === todo.id ? (
        <>
          <input
            type="text"
            value={editingTodoText}
            onChange={(e) => setEditingTodoText(e.target.value)}
          />
          <button onClick={() => saveTodo(todo.id)}>Enregistrer</button>
        </>
      ) : (
        <>
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
          <div className="todo-actions">
            <button onClick={() => editTodo(todo.id, todo.text)}>Modifier</button>
            <button onClick={() => deleteTodo(todo.id)}>Supprimer</button>
          </div>
        </>
      )}
    </div>
  );
};

export default TodoItem;
