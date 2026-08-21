// Content sourced from the Qoyl privacy policy document (dated July 28,
// 2026). Rendered as scoped raw HTML/CSS rather than converted to JSX to
// preserve the legal text exactly as authored - selectors are scoped
// under .privacy-doc so they can't leak into the rest of the app (the
// original document's own bare `body{...}` rule would otherwise override
// the site-wide dark theme). Font-family declarations reuse the same
// Cormorant Garamond/DM Sans already loaded via next/font in the root
// layout instead of loading Google Fonts a second time.

const PRIVACY_STYLES = `
.privacy-doc * {margin:0;padding:0;box-sizing:border-box}
.privacy-doc {background:#F5F0EA;font-family: var(--font-dm-sans), sans-serif;color:#1C1612;padding:2rem}
.privacy-doc .page {max-width:680px;margin:0 auto;background:white;padding:0}
.privacy-doc .top-bar {height:4px;background:linear-gradient(90deg,#9C7B5A,#C4A882,#9C7B5A)}
.privacy-doc .header {background:#1C1612;padding:1.5rem 2rem}
.privacy-doc .wordmark {font-family: var(--font-cormorant), serif;font-size:1.8rem;font-weight:600;color:#F5F0EA}
.privacy-doc .wordmark span {color:#C4A882;font-style:italic}
.privacy-doc .doc-label {font-size:0.65rem;color:#9C7B5A;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px}
.privacy-doc .body {padding:2rem}
.privacy-doc .effective {background:#F5F0EA;border-radius:6px;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.8rem;color:#7A6A5A;line-height:1.6}
.privacy-doc .effective strong {color:#1C1612}
.privacy-doc h2 {font-family: var(--font-cormorant), serif;font-size:1.2rem;font-weight:400;color:#1C1612;margin:1.5rem 0 0.5rem;padding-top:1rem;border-top:1px solid #EDE5D8}
.privacy-doc h2:first-of-type {border-top:none;margin-top:0}
.privacy-doc h3 {font-size:0.85rem;font-weight:600;color:#1C1612;margin:1rem 0 0.3rem}
.privacy-doc p {font-size:0.83rem;color:#3A2E28;line-height:1.75;margin-bottom:0.75rem}
.privacy-doc ul {margin:0.5rem 0 0.75rem 1.2rem}
.privacy-doc li {font-size:0.83rem;color:#3A2E28;line-height:1.7;margin-bottom:0.3rem}
.privacy-doc a {color:#9C7B5A;text-decoration:none}
.privacy-doc a:hover {text-decoration:underline}
.privacy-doc .highlight {background:#F5F0EA;border-left:3px solid #9C7B5A;padding:0.75rem 1rem;border-radius:0 6px 6px 0;margin:1rem 0;font-size:0.82rem;color:#3A2E28;line-height:1.65}
.privacy-doc .footer {background:#1C1612;padding:1rem 2rem;margin-top:0}
.privacy-doc .footer-text {font-size:0.68rem;color:#5A4A3A;line-height:1.8}
`;

const PRIVACY_CONTENT = `
<div class="top-bar"></div>

<div class="header">
  <div class="wordmark">Q<span>oyl</span></div>
  <div class="doc-label">Privacy Policy</div>
</div>

<div class="body">

<div class="effective">
  <strong>Effective date:</strong> July 28, 2026 &nbsp;·&nbsp; <strong>Last updated:</strong> July 28, 2026<br/>
  Questions about this policy? Contact us at <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>
</div>

<h2>1. Who we are</h2>
<p>Qoyl is a free hair care intelligence platform operated by Qoyl LLC, based in Chicago, Illinois. Our consumer app is available at <a href="https://qoyl-beta-alpha.vercel.app">qoyl-beta-alpha.vercel.app</a> and our marketing site is at <a href="https://qoyl.live">qoyl.live</a>. Our brand intelligence platform is available at <a href="https://business.qoyl.live">business.qoyl.live</a>.</p>
<p>Qoyl provides cosmetic hair care recommendations only and does not provide medical advice, diagnose conditions, or address health-related hair loss or scalp disorders.</p>
<p>This Privacy Policy explains what personal information we collect, how we use it, and the choices you have. It applies to all Qoyl products and services.</p>

<h2>2. What information we collect</h2>

<h3>Information you give us directly</h3>
<ul>
  <li><strong>Account information:</strong> Your email address and password when you create an account</li>
  <li><strong>Hair profile data:</strong> Curl type, porosity level, scalp condition, strand thickness, zip code, hair concerns, shower filter use, color treatment status, extension use, budget range, and any notes you choose to provide</li>
  <li><strong>Name:</strong> First and last name if you choose to provide them</li>
  <li><strong>Payment information:</strong> Processed by Stripe. We do not store your full card number - Stripe handles payment data under their own privacy policy</li>
  <li><strong>Product evaluation requests:</strong> Product name, brand, where purchased, ingredient list, and email when you submit a product for evaluation</li>
  <li><strong>Survey responses:</strong> Optional feedback you submit through in-app surveys</li>
</ul>

<h3>Information we collect automatically</h3>
<ul>
  <li><strong>Product search logs:</strong> The products you search, the brands you look up, the compatibility scores returned, and your hair profile variables at the time of search</li>
  <li><strong>Usage data:</strong> Pages visited, features used, and general interaction patterns within the app</li>
  <li><strong>Device information:</strong> Browser type, operating system, and general location derived from your IP address</li>
</ul>

<div class="highlight">
  <strong>A note on your hair profile data:</strong> Your hair profile is personal and sensitive. We treat it accordingly. We use it exclusively to generate personalized compatibility scores and routine recommendations for you. We never sell individual hair profile data. When we share data with brand partners through our B2B dashboard, it is always aggregated and anonymized - no individual profile is ever identifiable.
</div>

<h2>3. How we use your information</h2>

<h3>To provide the service</h3>
<ul>
  <li>Generate personalized hair product compatibility scores based on your hair profile</li>
  <li>Create personalized routine recommendations and wash day calendars</li>
  <li>Build and deliver your travel kit product recommendations</li>
  <li>Process payments for subscription and one-time purchases via Stripe</li>
  <li>Respond to product evaluation requests you submit</li>
</ul>

<h3>To improve the platform</h3>
<ul>
  <li>Understand which products and ingredients are most frequently searched</li>
  <li>Identify gaps in our ingredient database and prioritize expansion</li>
  <li>Improve the accuracy of our compatibility scoring algorithm</li>
  <li>Develop new features based on usage patterns</li>
</ul>

<h3>To communicate with you</h3>
<ul>
  <li>Send your personalized routine via email when you subscribe</li>
  <li>Respond to product evaluation requests within 48 hours</li>
  <li>Send important updates about the service or your account</li>
  <li>Send optional seasonal hair care updates if you opt in</li>
</ul>

<h3>For brand intelligence (B2B)</h3>
<ul>
  <li>Provide brand partners with aggregated, anonymized data about how their products score across different hair profile segments</li>
  <li>Generate consumer demand signals showing which product types and ingredients are most searched - never tied to individual users</li>
</ul>

<h2>4. How we share your information</h2>

<p>We do not sell your personal information. We share information only in these limited circumstances:</p>

<h3>Service providers</h3>
<ul>
  <li><strong>Supabase:</strong> Our database provider - stores your account, hair profile, and app data</li>
  <li><strong>Stripe:</strong> Payment processing for subscriptions and one-time purchases</li>
  <li><strong>Vercel:</strong> Hosts the Qoyl application</li>
  <li><strong>Resend:</strong> Email delivery for routine emails and notifications</li>
  <li><strong>Open Beauty Facts:</strong> An open-source cosmetic product database we query to retrieve ingredient lists for products you search. Your search queries are sent to their API.</li>
</ul>

<h3>Brand partners (B2B dashboard)</h3>
<p>Brands who subscribe to our intelligence dashboard see aggregated, anonymized data about how products in their category score across different hair profile segments. This data never identifies individual users. For example, a brand may see "34% of high-porosity users in humid climates scored your product below 50" - but never which specific users those are.</p>

<h3>Legal requirements</h3>
<p>We may disclose your information if required by law, court order, or to protect the safety of our users or the public.</p>

<h2>5. Data retention</h2>
<ul>
  <li><strong>Account and hair profile data:</strong> Retained while your account is active. You can request deletion at any time by emailing <a href="mailto:hey@qoyl.live">hey@qoyl.live</a></li>
  <li><strong>Product search logs:</strong> Retained for up to 24 months to improve our scoring algorithm</li>
  <li><strong>Payment records:</strong> Retained as required by Stripe and applicable tax laws</li>
  <li><strong>Deleted accounts:</strong> We delete your personal data within 30 days of an account deletion request</li>
</ul>

<h2>6. Your choices and rights</h2>

<h3>Access and correction</h3>
<p>You can view and update your hair profile at any time by logging into your account and visiting the My Profile page. You can update your profile once every 30 days.</p>

<h3>Deletion</h3>
<p>You can request deletion of your account and all associated personal data by emailing <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>. We will process your request within 30 days.</p>

<h3>Email communications</h3>
<p>You can unsubscribe from non-essential emails at any time using the unsubscribe link in any email we send, or by emailing <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>. We will still send essential account communications such as password resets.</p>

<h3>California residents (CCPA)</h3>
<p>California residents have the right to know what personal information we collect, the right to delete it, and the right to opt out of the sale of personal information. We do not sell personal information. To exercise your rights, contact us at <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>.</p>

<h3>European residents (GDPR)</h3>
<p>If you are located in the European Economic Area, you have rights including access, rectification, erasure, restriction of processing, and data portability. Our legal basis for processing your data is your consent (given when you create an account and hair profile) and the performance of our contract with you (delivering the service you signed up for). To exercise your rights, contact us at <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>.</p>

<h2>7. Security</h2>
<p>We use industry-standard security practices to protect your data, including encrypted connections (HTTPS), row-level security on our database ensuring users can only access their own data, and secure third-party payment processing through Stripe. No system is perfectly secure - if you believe your account has been compromised, contact us immediately at <a href="mailto:hey@qoyl.live">hey@qoyl.live</a>.</p>

<h2>8. Children's privacy</h2>
<p>Qoyl is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child under 13, contact us at <a href="mailto:hey@qoyl.live">hey@qoyl.live</a> and we will delete it promptly. Qoyl does provide hair care content and recommendations relevant to babies and children - this content is directed at parents and caregivers, not children themselves.</p>

<h2>9. Third-party links</h2>
<p>Qoyl's product search results and recommendations include links to third-party retailers and affiliate shopping platforms including Shopper.com, Ulta Beauty, and Sephora. These sites have their own privacy policies and we are not responsible for their practices. We recommend reviewing the privacy policy of any third-party site you visit through our links.</p>

<h2>10. Cookies and tracking</h2>
<p>We use essential cookies and local storage to maintain your login session and remember your hair profile ID between visits. We do not use third-party advertising cookies or tracking pixels. We do not participate in cross-site tracking.</p>

<h2>11. Changes to this policy</h2>
<p>We may update this Privacy Policy as Qoyl grows and our practices evolve. We will notify you of material changes by email (if you have an account) or by posting a notice in the app. The effective date at the top of this page always reflects when the policy was last updated.</p>

<h2>12. Contact us</h2>
<p>If you have questions, concerns, or requests related to this Privacy Policy or your personal data:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:hey@qoyl.live">hey@qoyl.live</a></li>
  <li><strong>Mailing address:</strong> Qoyl LLC, Chicago, Illinois</li>
  <li><strong>Response time:</strong> We aim to respond to all privacy-related requests within 5 business days</li>
</ul>

</div>

<div class="footer">
  <div class="footer-text">
    Qoyl · Privacy Policy · Effective July 28, 2026<br/>
    <a href="https://qoyl-beta-alpha.vercel.app" style="color:#9C7B5A">Consumer app</a> ·
    <a href="https://business.qoyl.live" style="color:#9C7B5A">Brand portal</a> ·
    <a href="mailto:hey@qoyl.live" style="color:#9C7B5A">hey@qoyl.live</a>
  </div>
</div>
`;

export const metadata = {
  title: "Privacy Policy - Qoyl",
};

export default function PrivacyPage() {
  return (
    <div className="privacy-doc">
      <style dangerouslySetInnerHTML={{ __html: PRIVACY_STYLES }} />
      <div className="page" dangerouslySetInnerHTML={{ __html: PRIVACY_CONTENT }} />
    </div>
  );
}
