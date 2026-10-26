import React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import RequestDetail from './RequestDetail';
import './Requests.css';
import './Actions.css';

const STATUSES = [
  'Submitted',
  'UnderNegotiation',
  'BoardReview',
  'Approved',
  'Completed',
  'Rejected',
  'Withdrawn',
];

// "UnderNegotiation" -> "Under Negotiation"
const statusLabel = (s) => s.replace(/([A-Z])/g, ' $1').trim();

export default class Requests extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      requests: [],
      loanTypes: [],
      countries: [],
      status: '',
      loanTypeId: '',
      countryId: '',
      expandedId: null,
      error: '',
      loading: true,
    };
  }

  async componentDidMount() {
    try {
      const loanTypes = await api('/loantypes');
      this.setState({ loanTypes });

      // Only staff can filter by country, so only they need the list
      if (this.props.user.role === 'IMFStaff') {
        const countries = await api('/country');
        this.setState({ countries });
      }
    } catch (err) {
      this.setState({ error: err.message });
    }

    this.loadRequests();
  }

  loadRequests = async () => {
    this.setState({ loading: true, error: '' });

    // Only send the filters that have a value
    const params = new URLSearchParams();
    if (this.state.status) params.append('status', this.state.status);
    if (this.state.loanTypeId) params.append('loanTypeId', this.state.loanTypeId);
    if (this.state.countryId) params.append('countryId', this.state.countryId);
    const query = params.toString();

    try {
      const requests = await api(`/fundingrequests${query ? `?${query}` : ''}`);

      // Collapse the open row if it's no longer in the list (filtered out or deleted)
      const stillThere = requests.some((r) => r.requestId === this.state.expandedId);
      this.setState({
        requests,
        loading: false,
        expandedId: stillThere ? this.state.expandedId : null,
      });
    } catch (err) {
      this.setState({ error: err.message, loading: false });
    }
  };

  // Update the filter, then reload the list with it
  handleFilter = (e) => {
    this.setState({ [e.target.name]: e.target.value }, this.loadRequests);
  };

  toggle = (id) => {
    this.setState((s) => ({ expandedId: s.expandedId === id ? null : id }));
  };

  render() {
    const { user } = this.props;
    const { requests, loanTypes, countries, expandedId, loading, error } = this.state;
    const isStaff = user.role === 'IMFStaff';

    return (
      <>
        <div className="page-banner">
          <div className="container">
            <h1>Funding requests</h1>
            <p>
              {isStaff
                ? 'Requests from all member countries.'
                : 'Requests submitted by your country.'}
            </p>
          </div>
        </div>

        <div className="container requests-page">
          <div className="filters-bar">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={this.state.status}
                onChange={this.handleFilter}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="loanTypeId">Loan type</label>
              <select
                id="loanTypeId"
                name="loanTypeId"
                value={this.state.loanTypeId}
                onChange={this.handleFilter}
              >
                <option value="">All loan types</option>
                {loanTypes.map((l) => (
                  <option key={l.loanTypeId} value={l.loanTypeId}>
                    {l.code}
                  </option>
                ))}
              </select>
            </div>

            {isStaff && (
              <div className="field">
                <label htmlFor="countryId">Country</label>
                <select
                  id="countryId"
                  name="countryId"
                  value={this.state.countryId}
                  onChange={this.handleFilter}
                >
                  <option value="">All countries</option>
                  {countries.map((c) => (
                    <option key={c.countryId} value={c.countryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading && <p className="list-note">Loading...</p>}

          {!loading && !error && (
            <div className="list-header">
              <h2 className="list-heading">
                {requests.length === 0
                  ? 'No requests found'
                  : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
              </h2>
              {!isStaff && (
                <Link to="/requests/new" className="row-button">
                  New request
                </Link>
              )}
            </div>
          )}

          <div className="requests-list">
            {requests.map((r) => {
              const open = r.requestId === expandedId;

              return (
                <section className={`request-row status-${r.status}`} key={r.requestId}>
                  <div className="row-main">
                    <div className="row-text">
                      <h3>
                        Request #{r.requestId} &middot; {r.countryName} &middot;{' '}
                        {r.loanTypeCode}
                      </h3>
                      <p>{r.requestedAmountSDR.toLocaleString()} SDR requested</p>
                    </div>

                    <div className="row-actions">
                      <span className="status-badge">{statusLabel(r.status)}</span>
                      <button className="row-button" onClick={() => this.toggle(r.requestId)}>
                        {open ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <RequestDetail
                      request={r}
                      user={user}
                      loanTypes={loanTypes}
                      onChanged={this.loadRequests}
                    />
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </>
    );
  }
}
