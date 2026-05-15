export const metadata = {
  title: "Privacy Policy | ISAIA SharePoint Pin Manager",
  description:
    "Privacy Policy for ISAIA SharePoint Pin Manager and its Pinterest API integration."
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <section className="legal-card">
        <header className="legal-hero">
          <div className="legal-brand">
            <div className="legal-logo" aria-label="ISAIA Napoli">
              <img className="legal-logo-image" src="/assets/logo_isaia.png" alt="ISAIA Napoli" />
            </div>
            <div>
              <div className="legal-kicker">Privacy Policy</div>
              <h1>ISAIA SharePoint Pin Manager</h1>
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
            <span>GDPR-oriented notice</span>
          </div>
        </header>

        <p className="legal-intro">
          ISAIA SharePoint Pin Manager is an internal web application used by
          authorized ISAIA personnel to prepare, publish, reconcile, and manage
          ISAIA-owned visual assets from Microsoft SharePoint on the connected ISAIA
          Pinterest account. This Privacy Policy explains how the application handles
          Pinterest API data and internal operational metadata.
        </p>

        <h2>Relationship With ISAIA&apos;s Main Privacy Policy</h2>
        <p>
          This notice supplements the broader ISAIA website privacy policy available
          at <a href="https://www.isaia.it/privacy-policy" target="_blank" rel="noreferrer">www.isaia.it/privacy-policy</a>.
          The public ISAIA policy describes general privacy practices for ISAIA
          services, including the identity of the data controller, contact details,
          categories of personal data, legal bases, retention, user rights, and DPO
          contact channels. This page adds the Pinterest API-specific information
          required for this internal integration.
        </p>

        <h2>Controller, Contacts, and Internal Scope</h2>
        <p>
          The data controller identified in ISAIA&apos;s public privacy policy is
          Isaia&amp;Isaia S.p.A., Via Toledo 106, 80134 Naples, Italy. Privacy requests
          may be directed to privacy@isaia.it. The public ISAIA policy also identifies
          Agilae S.r.l. as Data Protection Officer contact at privacy@agilae.it.
        </p>
        <p>
          This tool is not a consumer service and is not intended for public user
          registration. Access is restricted to authorized ISAIA team members and
          service components that need to operate the SharePoint-to-Pinterest workflow.
        </p>

        <h2>Pinterest API Usage</h2>
        <p>
          The application uses the official Pinterest API to connect an authorized
          ISAIA Pinterest account through OAuth, read account, board, board section,
          and Pin metadata, and perform publishing or management operations where the
          Pinterest API permissions granted to the application allow it.
        </p>
        <p>
          The integration is used for the following operational purposes: preparing
          CSV imports, creating Pins from ISAIA-owned SharePoint images, checking
          whether a Pin has already been published, avoiding duplicate Pins, detecting
          changed assets, managing Pinterest boards and sections, and deleting or
          updating published Pins when the API access tier and granted scopes allow
          those operations.
        </p>
        <p>
          This site and application are not approved by, endorsed by, sponsored by,
          or affiliated with Pinterest. Pinterest is a trademark of Pinterest, Inc.
          Any Pinterest names, API scopes, endpoint descriptions, or policy links are
          used only to describe the technical integration and compliance context.
        </p>

        <h2>Data We Process</h2>
        <p>
          The application does not collect consumer data from Pinterest users. When
          connected through OAuth, the app may process Pinterest-derived data required
          for the internal workflow, including Pinterest account identifiers, board
          and board section identifiers and names, Pin identifiers, Pin titles,
          descriptions, destination links, privacy status, image preview URLs, and API
          response metadata needed to reconcile published content.
        </p>
        <p>
          The application may also process ISAIA operational data, including selected
          SharePoint folders, SharePoint file names, generated titles and descriptions,
          CSV generation history, sync decisions, administrative settings, audit logs,
          and the minimum user/account information needed to authenticate authorized
          ISAIA personnel.
        </p>

        <h2>Legal Bases and Applicable Privacy Framework</h2>
        <p>
          Where personal data is processed, the application is operated with reference
          to Regulation (EU) 2016/679 (GDPR), the Italian Privacy Code
          (Legislative Decree 196/2003 as amended by Legislative Decree 101/2018),
          and the principles described in ISAIA&apos;s public privacy policy.
        </p>
        <ul className="legal-list">
          <li>
            <strong>GDPR Article 6(1)(b):</strong> processing may be necessary to
            provide the internal service requested by authorized ISAIA users.
          </li>
          <li>
            <strong>GDPR Article 6(1)(f):</strong> ISAIA may rely on legitimate
            interest to organize, protect, and manage brand-owned digital assets and
            official social publishing workflows.
          </li>
          <li>
            <strong>GDPR Article 6(1)(c):</strong> certain retention or disclosure may
            be required to comply with legal, audit, security, or regulatory duties.
          </li>
          <li>
            <strong>GDPR Articles 5, 25, and 32:</strong> the application is designed
            around minimization, purpose limitation, access control, and reasonable
            technical and organizational security measures.
          </li>
        </ul>

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
          profiling, consumer analytics, or any product made available to external
          customers.
        </p>

        <h2>Storage, Security, and Access Control</h2>
        <p>
          Application settings, OAuth tokens, API credentials, and operational sync
          metadata are stored server-side in administrative storage controlled by
          ISAIA. Sensitive configuration values are not exposed in clear text to
          regular users after storage. Access is limited to authorized personnel and
          service components required to run the application.
        </p>
        <p>
          Reasonable technical and organizational measures include server-side token
          handling, restricted administrative access, use of HTTPS, limited UI display
          of secrets, role-based application access, operational logging for
          troubleshooting, and review of permissions requested from Pinterest.
        </p>

        <h2>Processors, Service Providers, and Transfers</h2>
        <p>
          The application may rely on infrastructure and platform providers needed to
          operate the workflow, including Microsoft SharePoint for source assets,
          Pinterest for API operations, and Vercel or equivalent hosting services for
          the application runtime. These providers process data only as needed for the
          service or as governed by their own applicable contractual terms.
        </p>
        <p>
          If operational data is transferred outside the European Economic Area,
          ISAIA evaluates the transfer in light of GDPR Chapter V, including adequacy
          decisions, standard contractual clauses, or other appropriate safeguards
          where required.
        </p>

        <h2>Retention and Deletion</h2>
        <p>
          OAuth tokens are retained only while the Pinterest account remains connected
          and the integration is needed. If the connected Pinterest account is
          disconnected, OAuth tokens are removed from the application&apos;s server-side
          configuration.
        </p>
        <p>
          Pinterest-derived operational data that is no longer required for the
          workflow is deleted or anonymized within 30 days, unless a longer retention
          period is required for security, troubleshooting, audit, legal obligations,
          or to prevent duplicate publishing during a defined reconciliation period.
          ISAIA may also delete Pinterest-derived metadata earlier upon administrative
          request or when Pinterest account access is revoked.
        </p>

        <h2>Cookies, Analytics, and Automated Decisions</h2>
        <p>
          The application uses only technical session mechanisms required for login,
          authorization, security, and normal application operation. It is not designed
          to place marketing cookies, run third-party advertising tracking, or create
          external user profiles from Pinterest-derived data.
        </p>
        <p>
          The application does not make decisions that produce legal effects or
          similarly significant effects on individuals through automated profiling.
          CSV and sync recommendations are operational suggestions for ISAIA staff and
          remain subject to authorized user action.
        </p>

        <h2>Rights of Data Subjects</h2>
        <p>
          Where GDPR applies, data subjects may have rights of access, rectification,
          erasure, restriction, portability, objection, and rights related to automated
          decision-making under GDPR Articles 15 to 22. Requests can be sent through
          the contact channels indicated in ISAIA&apos;s public privacy policy. Data
          subjects may also lodge a complaint with the Italian Data Protection
          Authority, the Garante per la protezione dei dati personali.
        </p>

        <h2>SharePoint Assets</h2>
        <p>
          SharePoint images and metadata processed by this application are brand-owned
          ISAIA assets. The application does not upload or process third-party user
          content except where it is already part of ISAIA&apos;s authorized internal
          asset libraries.
        </p>

        <h2>Legal and Compliance References</h2>
        <p>
          This policy is designed to address Pinterest API review requirements and
          Pinterest&apos;s developer policy principles around transparency, OAuth
          authorization, credential protection, API data restrictions, and not selling
          or sharing Pinterest-derived data with third parties. The references below
          are provided for review transparency only and do not imply that this
          application is approved, certified, sponsored, or affiliated with Pinterest.
        </p>
        <div className="compliance-links compliance-links-wide">
          <a href="https://www.isaia.it/privacy-policy" target="_blank" rel="noreferrer">
            <span>ISAIA Website Privacy Policy</span>
            <strong>General ISAIA privacy notice, controller details, DPO contact, user rights, and retention principles.</strong>
          </a>
          <a href="https://www.garanteprivacy.it/regolamentoue" target="_blank" rel="noreferrer">
            <span>GDPR - Regulation (EU) 2016/679</span>
            <strong>EU privacy framework covering lawful basis, transparency, rights, security, and accountability.</strong>
          </a>
          <a href="https://www.garanteprivacy.it/codice" target="_blank" rel="noreferrer">
            <span>Italian Privacy Code</span>
            <strong>Italian national privacy framework and amendments aligning local law with the GDPR.</strong>
          </a>
          <a href="https://policy.pinterest.com/en/developer-guidelines" target="_blank" rel="noreferrer">
            <span>Pinterest Developer Guidelines</span>
            <strong>Transparency, OAuth authorization, API data restrictions, and API credential handling.</strong>
          </a>
          <a href="https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/" target="_blank" rel="noreferrer">
            <span>Pinterest OAuth Documentation</span>
            <strong>Authorization code flow, redirect URI, scopes, access tokens, and refresh tokens.</strong>
          </a>
          <a href="https://developers.pinterest.com/docs/key-concepts/access-tiers/" target="_blank" rel="noreferrer">
            <span>Pinterest API Access Tiers</span>
            <strong>Trial and Standard API access expectations, review steps, and common denial reasons.</strong>
          </a>
        </div>

        <h2>Contact</h2>
        <p>
          For privacy or data handling questions related to this internal application,
          contact ISAIA&apos;s internal application administrator, privacy@isaia.it, or
          the DPO contact listed in the public ISAIA website privacy policy.
        </p>

        <a className="legal-back" href="/login">
          Back to application
        </a>
      </section>
    </main>
  );
}
