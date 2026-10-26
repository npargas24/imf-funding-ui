import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';

export default class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      countries: [],
      fullName: '',
      email: '',
      password: '',
      countryId: '',
      error: '',
      registered: false,
    };
  }

  // Loads the country dropdown when the page first appears
  async componentDidMount() {
    try {
      const countries = await api('/country');
      this.setState({ countries });
    } catch (err) {
      this.setState({ error: err.message });
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: '' });

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: this.state.fullName,
          email: this.state.email,
          password: this.state.password,
          countryId: Number(this.state.countryId),
        }),
      });
      this.setState({ registered: true });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    if (this.state.registered) {
      return <Navigate to="/login" replace />;
    }

    return (
      <>
        <div className="page-banner">
          <div className="container">
            <h1>Register</h1>
            <p>Create an account to submit and track funding requests for your country.</p>
          </div>
        </div>

        <form className="auth-card" onSubmit={this.handleSubmit}>
          {this.state.error && <p className="error-text">{this.state.error}</p>}

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName"
                   value={this.state.fullName} onChange={this.handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email"
                   value={this.state.email} onChange={this.handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="password">Password (8+ characters)</label>
            <input id="password" type="password" name="password"
                   value={this.state.password} onChange={this.handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="countryId">Country</label>
            <select id="countryId" name="countryId"
                    value={this.state.countryId} onChange={this.handleChange} required>
              <option value="">Select your country</option>
              {this.state.countries.map((c) => (
                <option key={c.countryId} value={c.countryId}>{c.name}</option>
              ))}
            </select>
          </div>

          <button className="btn-primary" type="submit">Register</button>
          <p className="switch">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </form>
      </>
    );
  }
}