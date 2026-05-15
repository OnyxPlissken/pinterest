export const metadata = {
  title: "Privacy Policy | ISAIA SharePoint Pinterest Manager",
  description:
    "Privacy Policy for ISAIA SharePoint Pinterest Manager and its Pinterest API integration."
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <section className="legal-card">
        <div className="legal-kicker">Privacy Policy</div>
        <h1>ISAIA SharePoint Pinterest Manager</h1>
        <p className="legal-updated">Last updated: May 15, 2026</p>

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
