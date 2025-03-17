import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const NewPassword = () => {
  const { token } = useParams(); // Récupère le token depuis l'URL
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (response.ok) {
        setMessage("Mot de passe réinitialisé avec succès, vous allez être redirigé vers la page de connexion.");
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setMessage("Erreur lors de la réinitialisation du mot de passe.");
      }
    } catch (error) {
      setMessage("Erreur réseau lors de la réinitialisation.");
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Réinitialiser le mot de passe</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmer le nouveau mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Réinitialiser</button>
      </form>
    </div>
  );
};

export default NewPassword;
