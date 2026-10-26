import React from 'react';
import { api } from '../api';
import './Actions.css';

// "UnderNegotiation" -> "Under Negotiation"
const statusLabel = (s) => s.replace(/([A-Z])/g, ' $1').trim();

// The API sends UTC timestamps without a "Z", so add one before formatting
const toDate = (iso) => new Date(iso + 'Z');
const toDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString();

// What IMF staff can do from each status (mirrors the API's rules)
const STAFF_ACTIONS = {
  Submitted: [
    { to: 'UnderNegotiation', label: 'Start negotiation' },
    { to: 'Rejected', label: 'Reject', danger: true },
  ],
  UnderNegotiation: [
    { to: 'BoardReview', label: 'Send to Board review' },
    { to: 'Rejected', label: 'Reject', danger: true },
  ],
  BoardReview: [
    { to: 'Approved', label: 'Approve' },
    { to: 'Rejected', label: 'Reject', danger: true },
  ],
};

const WITHDRAWABLE = ['Submitted', 'UnderNegotiation', 'BoardReview'];
const HAS_DISBURSEMENTS = ['Approved', 'Completed'];

export default class RequestDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [],
      disbursements: [],
      comment: '',
      approvedAmount: '',
      editing: false,
      editLoanTypeId: '',
      editAmount: '',
      editPurpose: '',
      trancheAmount: '',
      trancheDate: '',
      error: '',
      busy: false,
    };
  }

  componentDidMount() {
    this.loadAll();
  }

  // When the status changes (an action, or the last tranche being released), reload everything
  componentDidUpdate(prevProps) {
    if (prevProps.request.status !== this.props.request.status) {
      this.setState({ editing: false, comment: '', approvedAmount: '' });
      this.loadAll();
    }
  }

  get id() {
    return this.props.request.requestId;
  }

  loadAll = () => {
    this.loadHistory();
    this.loadDisbursements();
  };

  loadHistory = async () => {
    try {
      const history = await api(`/fundingrequests/${this.id}/history`);
      this.setState({ history });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  loadDisbursements = async () => {
    if (!HAS_DISBURSEMENTS.includes(this.props.request.status)) {
      this.setState({ disbursements: [] });
      return;
    }
    try {
      const disbursements = await api(`/fundingrequests/${this.id}/disbursements`);
      this.setState({ disbursements });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  // Runs an action with a busy flag, and shows any error the API returns
  run = async (action) => {
    this.setState({ busy: true, error: '' });
    try {
      await action();
    } catch (err) {
      this.setState({ error: err.message });
    }
    this.setState({ busy: false });
  };

  changeStatus = (to) =>
    this.run(async () => {
      const body = { newStatus: to, comment: this.state.comment || null };
      if (to === 'Approved') body.approvedAmountSDR = Number(this.state.approvedAmount);

      await api(`/fundingrequests/${this.id}/status`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      this.props.onChanged();
    });

  startEdit = () => {
    const r = this.props.request;
    this.setState({
      editing: true,
      error: '',
      editLoanTypeId: String(r.loanTypeId),
      editAmount: String(r.requestedAmountSDR),
      editPurpose: r.purpose,
    });
  };

  saveEdit = (e) => {
    e.preventDefault();
    this.run(async () => {
      await api(`/fundingrequests/${this.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          loanTypeId: Number(this.state.editLoanTypeId),
          requestedAmountSDR: Number(this.state.editAmount),
          purpose: this.state.editPurpose,
        }),
      });
      this.setState({ editing: false });
      this.props.onChanged();
    });
  };

  deleteRequest = () => {
    if (!window.confirm('Delete this request? This cannot be undone.')) return;
    this.run(async () => {
      await api(`/fundingrequests/${this.id}`, { method: 'DELETE' });
      this.props.onChanged();
    });
  };

  scheduleTranche = (e) => {
    e.preventDefault();
    this.run(async () => {
      await api(`/fundingrequests/${this.id}/disbursements`, {
        method: 'POST',
        body: JSON.stringify({
          amountSDR: Number(this.state.trancheAmount),
          scheduledDate: this.state.trancheDate,
        }),
      });
      this.setState({ trancheAmount: '', trancheDate: '' });
      await this.loadDisbursements();
    });
  };

  release = (disbursementId) =>
    this.run(async () => {
      await api(`/fundingrequests/${this.id}/disbursements/${disbursementId}/release`, {
        method: 'POST',
      });
      await this.loadDisbursements();
      this.props.onChanged(); // releasing the last tranche completes the request
    });

  render() {
    const { request: r, user, loanTypes } = this.props;
    const { history, disbursements, editing, error, busy } = this.state;

    const isStaff = user.role === 'IMFStaff';
    const staffActions = isStaff ? (STAFF_ACTIONS[r.status] ?? []) : [];
    const canEdit = !isStaff && r.status === 'Submitted';
    const canWithdraw = !isStaff && WITHDRAWABLE.includes(r.status);
    const hasStatusActions = staffActions.length > 0 || canWithdraw;

    const scheduledTotal = disbursements.reduce((sum, d) => sum + d.amountSDR, 0);
    const remaining = (r.approvedAmountSDR ?? 0) - scheduledTotal;

    return (
      <div className="row-detail">
        {error && <p className="error-text">{error}</p>}

        {editing ? (
          <form className="inline-form" onSubmit={this.saveEdit}>
            <div className="field">
              <label htmlFor={`editLoan-${r.requestId}`}>Loan type</label>
              <select
                id={`editLoan-${r.requestId}`}
                name="editLoanTypeId"
                value={this.state.editLoanTypeId}
                onChange={this.handleChange}
                required
              >
                {loanTypes.map((l) => (
                  <option key={l.loanTypeId} value={l.loanTypeId}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`editAmount-${r.requestId}`}>Amount requested (SDR)</label>
              <input
                id={`editAmount-${r.requestId}`}
                type="number"
                name="editAmount"
                min="0.01"
                step="0.01"
                value={this.state.editAmount}
                onChange={this.handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor={`editPurpose-${r.requestId}`}>Purpose</label>
              <textarea
                id={`editPurpose-${r.requestId}`}
                name="editPurpose"
                rows="3"
                maxLength="1000"
                value={this.state.editPurpose}
                onChange={this.handleChange}
                required
              />
            </div>

            <div className="button-row">
              <button className="row-button" type="submit" disabled={busy}>
                Save changes
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => this.setState({ editing: false })}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="detail-grid">
              <div>
                <dt>Country</dt>
                <dd>{r.countryName}</dd>
              </div>
              <div>
                <dt>Loan type</dt>
                <dd>{r.loanTypeCode}</dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{r.requestedAmountSDR.toLocaleString()} SDR</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>
                  {r.approvedAmountSDR != null
                    ? `${r.approvedAmountSDR.toLocaleString()} SDR`
                    : 'Pending'}
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{toDate(r.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>

            <h4>Purpose</h4>
            <p>{r.purpose}</p>
          </>
        )}

        {!editing && (hasStatusActions || canEdit) && (
          <div className="actions-block">
            <h4>Actions</h4>

            {hasStatusActions && (
              <div className="field">
                <label htmlFor={`comment-${r.requestId}`}>Comment (optional)</label>
                <input
                  id={`comment-${r.requestId}`}
                  name="comment"
                  maxLength="500"
                  placeholder="Add a note for the status history"
                  value={this.state.comment}
                  onChange={this.handleChange}
                />
              </div>
            )}

            {isStaff && r.status === 'BoardReview' && (
              <div className="field">
                <label htmlFor={`approved-${r.requestId}`}>
                  Approved amount (SDR), needed to approve
                </label>
                <input
                  id={`approved-${r.requestId}`}
                  type="number"
                  name="approvedAmount"
                  min="0.01"
                  step="0.01"
                  value={this.state.approvedAmount}
                  onChange={this.handleChange}
                />
              </div>
            )}

            <div className="button-row">
              {staffActions.map((a) => (
                <button
                  key={a.to}
                  type="button"
                  disabled={busy}
                  className={a.danger ? 'btn-danger' : 'row-button'}
                  onClick={() => this.changeStatus(a.to)}
                >
                  {a.label}
                </button>
              ))}

              {canEdit && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={this.startEdit}
                >
                  Edit
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={busy}
                  onClick={this.deleteRequest}
                >
                  Delete
                </button>
              )}
              {canWithdraw && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => this.changeStatus('Withdrawn')}
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        )}

        {HAS_DISBURSEMENTS.includes(r.status) && (
          <>
            <h4>Disbursements</h4>
            {disbursements.length === 0 && (
              <p className="list-note">No tranches scheduled yet.</p>
            )}

            <ul className="tranche-list">
              {disbursements.map((d) => (
                <li key={d.disbursementId}>
                  <span>
                    <strong>Tranche {d.trancheNo}</strong> &middot;{' '}
                    {d.amountSDR.toLocaleString()} SDR
                  </span>
                  <span className="timeline-meta">
                    {d.status === 'Released'
                      ? `Released ${toDay(d.releasedDate)}`
                      : `Scheduled for ${toDay(d.scheduledDate)}`}
                  </span>
                  <span className={`status-badge tranche-${d.status}`}>{d.status}</span>
                  {isStaff && d.status === 'Scheduled' && (
                    <button
                      type="button"
                      className="row-button"
                      disabled={busy}
                      onClick={() => this.release(d.disbursementId)}
                    >
                      Release
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {isStaff &&
              r.status === 'Approved' &&
              (remaining > 0 ? (
                <form className="inline-form" onSubmit={this.scheduleTranche}>
                  <p className="field-hint">{remaining.toLocaleString()} SDR left to schedule</p>

                  <div className="field">
                    <label htmlFor={`tAmount-${r.requestId}`}>Tranche amount (SDR)</label>
                    <input
                      id={`tAmount-${r.requestId}`}
                      type="number"
                      name="trancheAmount"
                      min="0.01"
                      step="0.01"
                      value={this.state.trancheAmount}
                      onChange={this.handleChange}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`tDate-${r.requestId}`}>Scheduled date</label>
                    <input
                      id={`tDate-${r.requestId}`}
                      type="date"
                      name="trancheDate"
                      value={this.state.trancheDate}
                      onChange={this.handleChange}
                      required
                    />
                  </div>

                  <button className="row-button" type="submit" disabled={busy}>
                    Schedule tranche
                  </button>
                </form>
              ) : (
                <p className="field-hint">The full approved amount is scheduled.</p>
              ))}
          </>
        )}

        <h4>Status history</h4>
        <ol className="timeline">
          {history.map((h) => (
            <li key={h.historyId}>
              <strong>{statusLabel(h.toStatus)}</strong>
              <span className="timeline-meta">
                {h.changedBy} &middot; {toDate(h.changedAt).toLocaleString()}
              </span>
              {h.comment && <span className="timeline-comment">{h.comment}</span>}
            </li>
          ))}
        </ol>
      </div>
    );
  }
}
