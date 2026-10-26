import React from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import './Actions.css';

export default class NewRequest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loanTypes: [],
      loanTypeId: '',
      amount: '',
      purpose: '',
      error: '',
      busy: false,
      done: false,
    };
  }

  async componentDidMount() {
    try {
      const loanTypes = await api('/loantypes');
      this.setState({ loanTypes });
    } catch (err) {
      this.setState({ error: err.message });
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: '', busy: true });

    try {
      await api('/fundingrequests', {
        method: 'POST',
        body: JSON.stringify({
          loanTypeId: Number(this.state.loanTypeId),
          requestedAmountSDR: Number(this.state.amount),
          purpose: this.state.purpose,
        }),
      });
      this.setState({ done: true });
    } catch (err) {
      this.setState({ error: err.message, busy: false });
    }
  };

  render() {
    if (this.state.done) {
      return <Navigate to="/requests" replace />;
    }

    const { loanTypes, loanTypeId, amount, purpose, error, busy } = this.state;
    const selected = loanTypes.find((l) => String(l.loanTypeId) === loanTypeId);

    return (
      <>
        <div className="page-banner">
          <div className="container">
            <h1>New funding request</h1>
            <p>Submit a request for financial support on behalf of your country.</p>
          </div>
        </div>

        <form className="auth-card wide" onSubmit={this.handleSubmit}>
          {error && <p className="error-text">{error}</p>}

          <div className="field">
            <label htmlFor="loanTypeId">Loan type</label>
            <select id="loanTypeId" name="loanTypeId" value={loanTypeId}
                    onChange={this.handleChange} required>
              <option value="">Select a loan type</option>
              {loanTypes.map((l) => (
                <option key={l.loanTypeId} value={l.loanTypeId}>{l.code} - {l.name}</option>
              ))}
            </select>
            {selected && <p className="field-hint">{selected.description}</p>}
          </div>

          <div className="field">
            <label htmlFor="amount">Amount requested (SDR)</label>
            <input id="amount" type="number" name="amount" min="0.01" step="0.01"
                   value={amount} onChange={this.handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="purpose">Purpose</label>
            <textarea id="purpose" name="purpose" rows="4" maxLength="1000"
                      value={purpose} onChange={this.handleChange} required />
          </div>

          <button className="btn-primary" type="submit" disabled={busy}>Submit request</button>
        </form>
      </>
    );
  }
}