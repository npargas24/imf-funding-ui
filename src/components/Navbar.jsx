import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default class Navbar extends React.Component {
  render() {
    const { user, onLogout } = this.props;
    const roleLabel =
      user && (user.role === 'IMFStaff' ? 'IMF Staff' : 'Country Representative');

    return (
      <header className="site-header">
        {user && (
          <div className="container utility-row">
            <div className="utility-user">
              <span>
                {user.fullName} &middot; {roleLabel}
              </span>
              <button className="link-button" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        )}

        <div className="container">
          <Link to="/" className="site-title">
            Funding Request Tracker
          </Link>
        </div>

        <nav className="main-nav">
          <div className="container nav-links">
            {user ? (
              <>
                <NavLink to="/requests" end>
                  Requests
                </NavLink>
                {user.role === 'CountryRep' && (
                  <NavLink to="/requests/new">New request</NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
    );
  }
}
