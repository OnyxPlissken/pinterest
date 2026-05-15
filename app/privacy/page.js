export const metadata = {
  title: "Privacy Policy | ISAIA SharePoint Pinterest Manager",
  description:
    "Privacy Policy for ISAIA SharePoint Pinterest Manager and its Pinterest API integration."
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <section className="legal-card">
        <header className="legal-hero">
          <div className="legal-brand">
            <div className="legal-logo">ISAIA</div>
            <div>
              <div className="legal-kicker">Privacy Policy</div>
              <h1>ISAIA SharePoint Pinterest Manager</h1>
              <p className="legal-updated">Last updated: May 15, 2026</p>
            </div>
          </div>

          <div className="compliance-strip" aria-label="Compliance summary">
            <span>Internal ISAIA use only</span>
            <span>Official Pinterest API</span>
            <span>OAuth authorization</span>
            <span>No Pinterest affiliation</span>
            <span>No resale or redistribution</span>
            <span>Disconnect cleanup within 30 days</span>
          </div>
        </header>

        <p>
          ISAIA SharePoint Pinterest Manager is an internal web application used by
          ISAIA Napoli to prepare and manage brand-owned visual assets from Microsoft
          SharePoint for publishing and organization on Pinterest.
        </p>

        <h2>Pinterest API Usage</h2>
        <p>
          This application uses the official Pinterest API to connect an authorized
          ISAIA Pinterest account through OAuth, read Pinterest account, board, board
          section, and Pin metadata, and perform publishing or management operations
          where Pinterest API permissions are available.
        </p>
        <p>
          This site and application are not approved by, endorsed by, sponsored by,
          or affiliated with Pinterest. Pinterest is a trademark of Pinterest, Inc.
        </p>

        <h2>Data We Process</h2>
        <p>
          The application is used only by authorized ISAIA staff. It does not collect
          consumer data from Pinterest users. When connected through OAuth, the app may
          process Pinterest-derived data needed for the internal workflow, including
          Pinterest account identifiers, board and board section identifiers and names,
          Pin identifiers, Pin titles, descriptions, links, privacy status, image
          preview URLs, and API response metadata required to prevent duplicates and
          reconcile published content.
        </p>

        <h2>How Pinterest-Derived Data Is Used</h2>
        <p>
          Pinterest-derived data is used only to operate ISAIA&apos;s internal content
          workflow: browsing the connected account, matching SharePoint assets to
          Pinterest boards and sections, avoiding duplicate Pins, preparing CSV
          imports, and managing published brand-owned content where API permissions
          allow it.
        </p>
        <p>
          We do not sell, resell, rent, redistribute, or make available Pinterest
          content or Pinterest-derived data to third parties. We do not use
          Pinterest-derived data for advertising resale, data brokerage, user
          profiling, or any consumer-facing analytics product.
        </p>

        <h2>Storage and Access</h2>
        <p>
          Application settings, OAuth tokens, and operational sync metadata are stored
          server-side in encrypted administrative storage controlled by ISAIA. Access
          is limited to authorized ISAIA team members and service components required
          to operate the application.
        </p>

        <h2>Disconnecting Pinterest</h2>
        <p>
          If the connected Pinterest account is disconnected, OAuth tokens are removed
          from the application&apos;s server-side configuration. Pinterest-derived
          operational data that is no longer required for the workflow is deleted or
          anonymized within 30 days, unless a longer retention period is required for
          security, troubleshooting, audit, or legal obligations.
        </p>
        <p>
          ISAIA may also delete Pinterest-derived metadata earlier upon administrative
          request or when the connected Pinterest account access is revoked.
        </p>

        <h2>Compliance References</h2>
        <p>
          This policy is designed to address Pinterest API review requirements and
          Pinterest&apos;s developer policy principles around transparency, OAuth
          authorization, credential protection, API data restrictions, and not selling
          or sharing Pinterest-derived data with third parties.
        </p>
        <p>
          The references below are provided for review transparency only. They do not
          imply that this application is approved, certified, sponsored, or affiliated
          with Pinterest.
        </p>
        <div className="compliance-links">
          <a href="https://policy.pinterest.com/en/developer-guidelines" target="_blank" rel="noreferrer">
            <span>Developer Guidelines</span>
            <strong>Transparency, OAuth authorization, API data restrictions, and API credential handling.</strong>
          </a>
          <a href="https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/" target="_blank" rel="noreferrer">
            <span>OAuth Documentation</span>
            <strong>Authorization code flow, redirect URI, scopes, access tokens, and refresh tokens.</strong>
          </a>
          <a href="https://developers.pinterest.com/docs/key-concepts/access-tiers/" target="_blank" rel="noreferrer">
            <span>API Access Tiers</span>
            <strong>Trial and Standard API access expectations, review steps, and common denial reasons.</strong>
          </a>
        </div>

        <h2>SharePoint Assets</h2>
        <p>
          SharePoint images and metadata processed by this application are brand-owned
          ISAIA assets. The application does not upload or process third-party user
          content except where it is already part of ISAIA&apos;s authorized internal
          asset libraries.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy or data handling questions related to this internal application,
          contact ISAIA&apos;s internal application administrator or your ISAIA business
          contact.
        </p>

        <a className="legal-back" href="/login">
          Back to application
        </a>
      </section>
    </main>
  );
}
