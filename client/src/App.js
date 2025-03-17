import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TodoList from './components/TodoList';
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import NewPassword from './components/NewPassword';
import './App.css';

// Composant principal de l'application (affiché quand l'utilisateur est authentifié)
// ou l'interface d'authentification (Login, Register, ResetPassword) quand l'utilisateur n'est pas connecté.
const AppContent = () => {
  const [token, setToken] = useState(null);
  const [lists, setLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState({});
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/lists', {
        headers: { 'Authorization': token },
      })
        .then(response => response.json())
        .then(data => {
          setLists(data);
          if (data.length > 0) {
            setSelectedList(data[0].id);
          }
        });

      fetch('/api/shared-lists', {
        headers: { 'Authorization': token },
      })
        .then(response => response.json())
        .then(data => setSharedLists(data));

      fetch('/api/users', {
        headers: { 'Authorization': token },
      })
        .then(response => response.json())
        .then(data => setUsers(data));
    }
  }, [token]);

  const handleLogin = (token) => {
    setToken(token);
  };

  // Permet de revenir depuis Register vers Login
  const handleRegister = () => {
    setIsRegistering(false);
  };

  const handleLogout = () => {
    setToken(null);
    setLists([]);
    setSharedLists([]);
    setSelectedList(null);
  };

  // Active l'affichage du composant ResetPassword (pour demander l'email de réinitialisation)
  const handleShowResetPassword = () => {
    setIsResettingPassword(true);
  };

  // Envoie la requête de réinitialisation du mot de passe (pour l'envoi de l'email)
  const handleResetPassword = async (email) => {
    if (typeof email !== "string") {
      console.error("L'email n'est pas une chaîne de caractères :", email);
      alert("Veuillez entrer une adresse email valide.");
      return;
    }
  
    try {
      const response = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
  
      if (response.ok) {
        setEmailSent(true);
      } else {
        alert('Erreur lors de la demande de réinitialisation.');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      alert('Une erreur est survenue.');
    }
  };

  const addList = async () => {
    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ name: newListName }),
    });
    const { listId, listName } = await response.json();
    setLists([...lists, { id: listId, name: listName }]);
    setSelectedList(listId);
    setNewListName('');
  };

  const deleteList = async (listId) => {
    await fetch(`/api/lists/${listId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token },
    });
    setLists(lists.filter(list => list.id !== listId));
    if (selectedList === listId) setSelectedList(null);
  };

  const editList = (listId, name) => {
    setEditingListId(listId);
    setEditingListName(name);
  };

  const saveList = async (listId) => {
    await fetch(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ name: editingListName }),
    });
    setLists(lists.map(list =>
      list.id === listId ? { ...list, name: editingListName } : list
    ));
    setEditingListId(null);
    setEditingListName('');
  };

  const shareList = async (listId) => {
    const userId = selectedUserIds[listId];
    if (!userId) {
      alert('Veuillez sélectionner un utilisateur à qui partager');
      return;
    }
    const response = await fetch(`/api/lists/${listId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ userId }),
    });
    if (response.ok) {
      alert('Liste partagée avec succès');
    } else {
      alert('Échec du partage de la liste');
    }
  };

  const handleUserSelect = (listId, userId) => {
    setSelectedUserIds(prevState => ({ ...prevState, [listId]: userId }));
  };

  // Si l'utilisateur n'est pas authentifié, on affiche l'interface d'authentification.
  if (!token) {
    return (
      <div className="auth-container">
        {isResettingPassword ? (
          <>
            <ResetPassword onReset={handleResetPassword} emailSent={emailSent} />
            <button onClick={() => setIsResettingPassword(false)}>
              Retour à la page de connexion
            </button>
          </>
        ) : isRegistering ? (
          <>
            <Register onRegister={handleRegister} />
            <button onClick={() => setIsRegistering(false)}>
              Retour à la page de connexion
            </button>
          </>
        ) : (
          <>
            <Login onLogin={handleLogin} onForgotPassword={handleShowResetPassword} />
            <button className="btn-outline" onClick={() => setIsRegistering(true)}>
              S'inscrire
            </button>
          </>
        )}
      </div>
    );
  }
    
  return (
    <div className="app-container">
      <h1>Mes listes de tâches</h1>
      <div className="logout-container">
        <button onClick={handleLogout}>Se déconnecter</button>
      </div>
      <div className="add-list-container">
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="Nom de la nouvelle liste"
        />
        <button onClick={addList}>Ajouter la liste</button>
      </div>
      <div className="lists-panel">
        <h2>Vos listes :</h2>
        <ul>
          {lists.map(list => (
            <li
              key={list.id}
              className={`list-item ${selectedList === list.id ? 'selected' : ''}`}
              onClick={() => setSelectedList(list.id)}
            >
              {editingListId === list.id ? (
                <>
                  <input
                    type="text"
                    value={editingListName}
                    onChange={(e) => setEditingListName(e.target.value)}
                  />
                  <button onClick={() => saveList(list.id)}>Enregistrer</button>
                </>
              ) : (
                <>
                  {list.name}
                  <button onClick={() => editList(list.id, list.name)}>Modifier</button>
                  <button onClick={() => deleteList(list.id)}>Supprimer</button>
                  <button onClick={() => shareList(list.id)}>Partager</button>
                  <select
                    onChange={(e) => handleUserSelect(list.id, e.target.value)}
                    value={selectedUserIds[list.id] || ''}
                  >
                    <option value="" disabled>Sélectionner un utilisateur</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.first_name} {user.last_name})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </li>
          ))}
        </ul>
        <h2>Listes partagées :</h2>
        <ul>
          {sharedLists.map(list => (
            <li
              key={list.id}
              className={`list-item ${selectedList === list.id ? 'selected' : ''}`}
              onClick={() => setSelectedList(list.id)}
            >
              {list.name}
            </li>
          ))}
        </ul>
      </div>
      {selectedList && <TodoList listId={selectedList} token={token} />}
    </div>
  );
};

// Le composant AppWrapper gère la navigation via React Router.
// La route "/reset-password/:token" affiche le composant NewPassword,
// qui inclut la redirection vers la page de connexion après un reset réussi.
// Toutes les autres routes (ici "/*") affichent l'application principale.
const AppWrapper = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password/:token" element={<NewPassword />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppWrapper;
