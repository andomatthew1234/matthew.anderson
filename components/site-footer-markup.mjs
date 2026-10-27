const joinSitePath = (siteRoot, path = "") => {
  if (siteRoot instanceof URL) return new URL(path, siteRoot).href;
  return `${siteRoot}${path}`;
};

export function footerMarkup({ siteRoot, year = new Date().getFullYear() }) {
  const siteHref = (path = "") => joinSitePath(siteRoot, path);

  return `
    <footer class="editorial-footer" aria-labelledby="site-footer-title">
      <div class="editorial-footer__inner">
        <div class="editorial-footer__statement footer-reveal" style="--reveal-delay: 0ms">
          <p class="editorial-footer__eyebrow">BuiltByMatthew</p>
          <h2 id="site-footer-title">Websites built <em>properly.</em></h2>
        </div>

        <section class="editorial-footer__contact footer-reveal" id="contact" aria-labelledby="site-footer-contact-title" style="--reveal-delay: 80ms">
          <h3 id="site-footer-contact-title">Have something in mind?</h3>
          <div class="editorial-footer__contact-copy">
            <p>Let's make your next website happen.</p>
            <a class="editorial-footer__email-cta" href="mailto:matthew@andomail.com">
              <span>Email me</span> <span aria-hidden="true">↗</span>
            </a>
            <a class="editorial-footer__email-address" href="mailto:matthew@andomail.com">matthew@andomail.com</a>
          </div>
        </section>

        <nav class="editorial-footer__navigation footer-reveal" aria-label="Footer navigation" style="--reveal-delay: 150ms">
          <section aria-labelledby="site-footer-explore">
            <h3 id="site-footer-explore">Explore</h3>
            <ul>
              <li><a href="${siteHref("")}">Home</a></li>
              <li><a href="${siteHref("#work")}">My work</a></li>
              <li><a href="${siteHref("build-your-site/")}">Build your site</a></li>
              <li><span class="editorial-footer__future" id="about">About <small>Coming soon</small></span></li>
            </ul>
          </section>

          <section aria-labelledby="site-footer-information">
            <h3 id="site-footer-information">Information</h3>
            <ul>
              <li><span class="editorial-footer__future">How it works <small>Coming soon</small></span></li>
              <li><span class="editorial-footer__future">Frequently asked questions <small>Coming soon</small></span></li>
              <li><a href="${siteHref("terms/")}">Terms &amp; conditions</a></li>
              <li><span class="editorial-footer__future">Privacy policy <small>Coming soon</small></span></li>
            </ul>
          </section>

          <section aria-labelledby="site-footer-contact-navigation">
            <h3 id="site-footer-contact-navigation">Contact</h3>
            <ul>
              <li><a href="mailto:matthew@andomail.com">Email me</a></li>
            </ul>
          </section>
        </nav>

        <div class="editorial-footer__final footer-reveal" style="--reveal-delay: 210ms">
          <p>© <span data-footer-year>${year}</span> BuiltByMatthew.</p>
          <p>Designed &amp; developed by Matthew.</p>
        </div>
      </div>
    </footer>
  `;
}
