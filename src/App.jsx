import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { clearSession, getToken, getUser } from './api';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: getToken() ? getUser() : null };
  }

  handleLogin = (user) => {
    this.setState({ user });
  };

  handleLogout = () => {
    clearSession();
    this.setState({ user: null });
  };

  render() {
    const { user } = this.state;

    return (
      <div className="app-shell">
        <Navbar user={user} onLogout={this.handleLogout} />

        <main className="app-main">
          <Routes>
            <Route path="/login" element={<Login onLogin={this.handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/requests"
              element={user ? <Requests user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/requests/new"
              element={
                user?.role === 'CountryRep' ? <NewRequest /> : <Navigate to="/requests" replace />
              }
            />
            <Route
              path="*"
              element={<Navigate to={user ? '/requests' : '/login'} replace />}
            />
          </Routes>
        </main>

      </div>
    );
  }
}
