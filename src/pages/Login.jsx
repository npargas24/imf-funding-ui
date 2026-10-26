import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, saveSession } from '../api';

export default class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { email: '', password: '', error: '', loggedIn: false };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: '' });

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: this.state.email, password: this.state.password }),
      });
      saveSession(data.token, data.user);
      this.props.onLogin(data.user);
      this.setState({ loggedIn: true });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    if (this.state.loggedIn) {
      return <Navigate to="/requests" replace />;
    }

    return (
      <>
        <div className="page-banner">
          <div className="container">
            <h1>Log in</h1>
            <p>Access funding requests for your country or your assigned caseload.</p>
          </div>
        </div>

        <form className="auth-card" onSubmit={this.handleSubmit}>
          {this.state.error && <p className="error-text">{this.state.error}</p>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email"
                   value={this.state.email} onChange={this.handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password"
                   value={this.state.password} onChange={this.handleChange} required />
          </div>

          <button className="btn-primary" type="submit">Log in</button>
          <p className="switch">
            New country representative? <Link to="/register">Register</Link>
          </p>
        </form>
      </>
    );
  }
}