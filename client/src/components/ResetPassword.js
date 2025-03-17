import React, { useState } from 'react';

const ResetPassword = ({ onReset, emailSent }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onReset(email);
  };

  return (
    <div>
      {emailSent ? (
        <p>Vérifiez votre adresse email pour le lien de réinitialisation.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Entrez votre adresse email"
            required
          />
          <button type="submit">Réinitialiser le mot de passe</button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
