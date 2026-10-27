import {t} from './i18n.js';
export const footerHTML = (l) => `<footer class="full-page-footer unframe-footer-final" data-nav-color="dark">
        <svg style="display: none;">
            <symbol id="icon-cube" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path><path d="M2 7v10M12 12v10M22 7v10"></path></symbol>
        </svg>

        <div class="footer-grid">
            <div class="footer-column">
                <div class="logo-area"><div class="footer-logo">UNFRAME</div></div>
                <span class="section-title"><svg class="cube-icon"><use xlink:href="#icon-cube"/></svg> ${t('footer.visit',{},l)}</span>
                <hr class="section-line">
                <ul class="info-list">
                    <li>${t('footer.address',{},l)}</li>
                    <li>${t('footer.hours',{},l)}</li>
                    <li>T. 0502-5553-6671</li>
                </ul>
            </div>
            <div class="footer-column">
                <div class="logo-area"></div>
                <span class="section-title"><svg class="cube-icon"><use xlink:href="#icon-cube"/></svg> ${t('footer.company',{},l)}</span>
                <hr class="section-line">
                <ul class="info-list">
                    <li>${t('footer.ceo',{},l)}</li>
                    <li>${t('footer.privacyOfficer',{},l)}</li>
                    <li>${t('footer.businessNo',{},l)}</li>
                    <li>${t('footer.mailOrderNo',{},l)}</li>
                </ul>
            </div>
            <div class="footer-column">
                <div class="logo-area"></div>
                <span class="section-title"><svg class="cube-icon"><use xlink:href="#icon-cube"/></svg> ${t('footer.policies',{},l)}</span>
                <hr class="section-line">
                <ul class="info-list">
                    <li><a href="https://unframe.kr/1" class="legal-link-item">${t('footer.terms',{},l)}</a></li>
                    <li><a href="https://unframe.kr/2" class="legal-link-item">${t('footer.privacy',{},l)}</a></li>
                </ul>
            </div>
        </div>
        <div class="social-container">
            <a aria-label="${t('footer.instagram',{},l)}" href="https://www.instagram.com/unframe.kr" target="_blank" rel="noopener" class="social-icon hover:scale-110 transition-transform"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
            <a aria-label="${t('footer.youtube',{},l)}" href="https://www.youtube.com/@unframe_kr" target="_blank" rel="noopener" class="social-icon hover:scale-110 transition-transform"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
        </div>

        <div class="footer-center-content">
            <div class="footer-slogan">Breaking frames, Building resonance.</div>
            <div class="footer-copyright">
                Copyright © ${new Date().getFullYear()} UNFRAME. All rights reserved.
            </div>
        </div>
    </footer>`;
