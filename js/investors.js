      /* Wait for window.load — page scripts (Swiper, Leaflet, etc.)
         are at the bottom of body, so they load AFTER this inline
         script is parsed. Defer init until everything's ready. */
      window.addEventListener('load', function () {
        /* Monthly investor-update carousel — mobile prev/next nav,
           plus refresh-on-visibility so YouTube's pause UI never
           lingers when the user returns from another tab. */
        (function () {
          var loop = document.querySelector('[data-loop]');
          var prev = document.querySelector('[data-loop-prev]');
          var next = document.querySelector('[data-loop-next]');
          if (!loop) return;
          if (prev && next) {
            function step (dir) {
              var card = loop.querySelector('.inv-video');
              if (!card) return;
              var width = card.getBoundingClientRect().width + 16;
              loop.scrollBy({ left: width * dir, behavior: 'smooth' });
            }
            prev.addEventListener('click', function () { step(-1); });
            next.addEventListener('click', function () { step(1); });
          }
          // Force-play hook: after each iframe loads (or on tab return)
          // postMessage the YouTube IFrame API command to play. Belt-and-
          // braces for when one of the three muted autoplays gets
          // throttled by the browser and shows the big red play overlay.
          function forcePlay (f) {
            try {
              f.contentWindow.postMessage(
                '{"event":"command","func":"playVideo","args":""}',
                '*'
              );
            } catch (e) {}
          }
          var iframes = loop.querySelectorAll('iframe.inv-video-iframe');
          iframes.forEach(function (f) {
            f.addEventListener('load', function () {
              if (f.src === 'about:blank' || !f.src) return; // hasn't been hydrated yet
              setTimeout(function () { forcePlay(f); }, 400);
              setTimeout(function () { forcePlay(f); }, 1200);
              setTimeout(function () { forcePlay(f); }, 2400);
            });
          });
          // On returning to the tab, reload only hydrated iframes' src
          // so YouTube's pause overlay doesn't linger after backgrounding.
          document.addEventListener('visibilitychange', function () {
            if (document.hidden) return;
            iframes.forEach(function (f) {
              if (!f.src || f.src === 'about:blank') return;
              var src = f.src;
              f.src = '';
              f.src = src;
            });
          });

          function hydrateAll () {
            iframes.forEach(function (f) {
              if (f.src === 'about:blank' && f.dataset.src) f.src = f.dataset.src;
            });
          }
          function nudgeVisible () {
            iframes.forEach(function (f) {
              if (f.src === 'about:blank' || !f.src) return;
              var r = f.getBoundingClientRect();
              if (r.top < window.innerHeight && r.bottom > 0) forcePlay(f);
            });
          }

          // Lazy-hydrate the YouTube embeds. Observe the loop CONTAINER
          // (not individual iframes — they have `transform: scale(1.6)`
          // which throws off per-element thresholds). When the section
          // approaches the viewport (200px rootMargin), hydrate all
          // three. After that, the section-IO doubles as a keep-alive
          // gate so the periodic play-nudge only runs while the
          // section is visible.
          var keepAliveTimer = null;
          if (typeof IntersectionObserver !== 'undefined') {
            var sectionIO = new IntersectionObserver(function (entries) {
              var inView = entries[0] && entries[0].isIntersecting;
              if (inView) {
                hydrateAll();
                // chase any throttle in the first ~2 s after hydrate
                setTimeout(nudgeVisible, 600);
                setTimeout(nudgeVisible, 1600);
                if (!keepAliveTimer) {
                  keepAliveTimer = setInterval(nudgeVisible, 4000);
                }
              } else if (keepAliveTimer) {
                clearInterval(keepAliveTimer);
                keepAliveTimer = null;
              }
            }, { threshold: 0, rootMargin: '200px 0px' });
            sectionIO.observe(loop);
          } else {
            // No-IO fallback: hydrate immediately.
            hydrateAll();
          }
        })();

        /* Hero founder-video lightbox */
        (function () {
          var trigger = document.querySelector('[data-hero-video-open]');
          var modal   = document.querySelector('[data-hero-video-modal]');
          if (!trigger || !modal) return;
          var frame   = modal.querySelector('[data-hero-video-frame]');
          var YT_SRC  = 'https://www.youtube.com/embed/8BnSsEMkTjw?autoplay=1&rel=0&modestbranding=1';

          function openVid () {
            frame.innerHTML = '<iframe src="' + YT_SRC + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Founder intro video"></iframe>';
            modal.hidden = false;
            document.body.classList.add('inv-hero-modal-open');
            var closeBtn = modal.querySelector('.inv-hero-modal-close');
            if (closeBtn) closeBtn.focus();
          }
          function closeVid () {
            modal.hidden = true;
            frame.innerHTML = ''; // stop playback
            document.body.classList.remove('inv-hero-modal-open');
          }
          trigger.addEventListener('click', openVid);
          modal.addEventListener('click', function (e) {
            if (e.target.closest('[data-hero-video-close]')) closeVid();
          });
          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.hidden) closeVid();
          });
        })();

        /* §01 Geo / Expertise toggle */
        var capTabs   = document.querySelectorAll('#inv-toggle [data-inv-tab]');
        var capPanels = document.querySelectorAll('#inv-toggle [data-inv-panel]');
        function setCap(name) {
          capTabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.invTab === name ? 'true' : 'false'); });
          capPanels.forEach(function (p) { p.classList.toggle('active', p.dataset.invPanel === name); });
          if (name === 'geo' && window.__invMap && typeof window.__invMap.invalidateSize === 'function') {
            setTimeout(function () { window.__invMap.invalidateSize(); }, 60);
          }
        }
        capTabs.forEach(function (b) { b.addEventListener('click', function () { setCap(b.dataset.invTab); }); });

        /* §01 Wall-of-investors — click any card to open the bio modal */
        (function () {
          var modal = document.querySelector('[data-wall-modal]');
          if (!modal) return;
          var photoEl    = modal.querySelector('[data-modal-photo]');
          var nameEl     = modal.querySelector('[data-modal-name]');
          var roleEl     = modal.querySelector('[data-modal-role]');
          var coEl       = modal.querySelector('[data-modal-company]');
          var locEl      = modal.querySelector('[data-modal-location]');
          var bringEl    = modal.querySelector('[data-modal-bring]');
          var bioEl      = modal.querySelector('[data-modal-bio]');
          function openModal(card) {
            var d = card.dataset;
            var photo = card.querySelector('.inv-wall-card-photo');
            if (photoEl && photo) { photoEl.src = photo.src; photoEl.alt = d.name || ''; }
            if (nameEl)  nameEl.textContent  = d.name     || '';
            if (roleEl)  roleEl.textContent  = d.role     || '';
            if (coEl)    coEl.textContent    = d.company  || '';
            if (locEl)   locEl.textContent   = d.location || '';
            if (bringEl) bringEl.textContent = d.bring    || '';
            if (bioEl)   bioEl.textContent   = d.bio      || '';
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
          }
          function closeModal() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
          }
          document.querySelectorAll('[data-investor]').forEach(function (card) {
            card.addEventListener('click', function () { openModal(card); });
          });
          modal.querySelectorAll('[data-wall-close]').forEach(function (el) {
            el.addEventListener('click', closeModal);
          });
          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
          });
        })();

        /* §02 Time / Money — accordion: any one open at a time, the
           first (time) open by default. Clicking the already-active
           one collapses it; clicking the other opens that one and
           closes the previous. Passing `null` collapses everything. */
        var askTabs   = document.querySelectorAll('#inv-ask-tabs [data-inv-asktab]');
        var askPanels = document.querySelectorAll('[data-inv-askpanel]');
        var fills     = document.querySelectorAll('#inv-ladder .inv-ladder-fill');
        function setAsk(name) {
          askTabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.invAsktab === name ? 'true' : 'false'); });
          askPanels.forEach(function (p) { p.classList.toggle('active', p.dataset.invAskpanel === name); });
          if (name === 'money') {
            fills.forEach(function (el) { el.style.width = '0%'; });
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                fills.forEach(function (el) { el.style.width = (el.dataset.fill || '0') + '%'; });
              });
            });
          } else {
            fills.forEach(function (el) { el.style.width = '0%'; });
          }
        }
        askTabs.forEach(function (b) {
          b.addEventListener('click', function () {
            var isOpen = b.getAttribute('aria-pressed') === 'true';
            setAsk(isOpen ? null : b.dataset.invAsktab);
          });
        });

        // Mobile-only: turn the two asks into an accordion. We do this
        // by moving each panel into .inv-ask-tabs RIGHT AFTER its trigger
        // button — the active panel then expands inline below its tab,
        // collapsing the other (since inactive panels are display:none).
        (function () {
          if (window.innerWidth >= 768) return;
          askTabs.forEach(function (tab) {
            var name  = tab.dataset.invAsktab;
            var panel = document.querySelector('[data-inv-askpanel="' + name + '"]');
            if (panel) tab.insertAdjacentElement('afterend', panel);
          });
        })();

        /* §02 Investor-row auto-cycle (mobile): for time-slides
           with 2+ investors stacked, cycle them one at a time every
           1.8s with dot pagination. Purely passive — no swipe; the
           reader doesn't have to interact.
           Performance: pauses while the tab is hidden, AND only runs
           while the time-slide section is in the viewport (no point
           cycling when the user has scrolled past). */
        (function () {
          if (window.innerWidth >= 768) return;
          var groups = [];
          var hostSection = null;
          document.querySelectorAll('.inv-time-investor').forEach(function (container) {
            var rows = container.querySelectorAll('.inv-time-investor-row');
            if (rows.length < 2) return;
            container.classList.add('has-cycle');
            rows[0].classList.add('is-active');
            var dotsEl = document.createElement('div');
            dotsEl.className = 'inv-time-investor-dots';
            dotsEl.setAttribute('aria-hidden', 'true');
            for (var i = 0; i < rows.length; i++) {
              var d = document.createElement('span');
              d.className = 'inv-time-investor-dot' + (i === 0 ? ' is-active' : '');
              dotsEl.appendChild(d);
            }
            container.appendChild(dotsEl);
            groups.push({ rows: rows, dots: dotsEl.children, idx: 0 });
            if (!hostSection) hostSection = container.closest('section') || container;
          });
          if (!groups.length) return;
          function tick () {
            if (document.hidden) return;
            groups.forEach(function (g) {
              g.idx = (g.idx + 1) % g.rows.length;
              for (var i = 0; i < g.rows.length; i++) {
                g.rows[i].classList.toggle('is-active', i === g.idx);
                g.dots[i].classList.toggle('is-active', i === g.idx);
              }
            });
          }
          var timer = null;
          function start () { if (!timer) timer = setInterval(tick, 1800); }
          function stop  () { if (timer) { clearInterval(timer); timer = null; } }
          if (hostSection && typeof IntersectionObserver !== 'undefined') {
            var io = new IntersectionObserver(function (entries) {
              if (entries[0].isIntersecting) start(); else stop();
            }, { threshold: 0 });
            io.observe(hostSection);
          } else {
            start();
          }
        })();

        /* §02 Time carousel (Swiper) */
        if (typeof Swiper !== 'undefined') {
          // Use the existing hairline below the image (the top border of
          // .inv-time-nav) as the progress loader — no extra UI element.
          var navEl = document.querySelector('.inv-time-nav');
          var timeSwiper = new Swiper('#inv-time-swiper', {
            slidesPerView: 1, spaceBetween: 32, speed: 600, grabCursor: true,
            loop: true,
            autoplay: {
              delay: 11000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }
          });
          var prev = document.getElementById('inv-time-prev');
          var next = document.getElementById('inv-time-next');
          var cur  = document.getElementById('inv-time-cur');
          prev && prev.addEventListener('click', function () { timeSwiper.slidePrev(); });
          next && next.addEventListener('click', function () { timeSwiper.slideNext(); });
          timeSwiper.on('slideChange', function () {
            if (cur) cur.textContent = String(timeSwiper.realIndex + 1).padStart(2, '0');
          });
          // Drive the orange fill via a CSS custom property on the nav
          // wrapper — CSS handles the actual fill visually via ::after.
          timeSwiper.on('autoplayTimeLeft', function (s, timeLeft, progress) {
            if (navEl) navEl.style.setProperty('--time-progress', ((1 - progress) * 100) + '%');
          });
          timeSwiper.on('slideChangeTransitionStart', function () {
            if (navEl) navEl.style.setProperty('--time-progress', '0%');
          });
        }

        /* §01 Geography map — clean SVG world + role-filtered bubbles +
           slide-in side panel. Data is placeholder; swap CITIES /
           INVESTORS arrays when real data lands. */
        (function () {
          var mapEl = document.querySelector('[data-geo-map]');
          if (!mapEl) return;

          // ─── Cloudinary URL helper ─────────────────────────────────
          // Wraps a Cloudinary URL with `f_auto,q_auto,w_<width>` so the
          // CDN serves an appropriately sized + format-negotiated image
          // (avif/webp on modern browsers) instead of the original
          // multi-MB source. Use the rendered pixel width (or 2× for
          // retina) as the target.
          function cldUrl (url, width) {
            if (!url || typeof url !== 'string') return url;
            if (url.indexOf('res.cloudinary.com') === -1) return url;
            // Already transformed? Leave as-is.
            if (/\/image\/upload\/[^/]*[a-z]_/.test(url)) return url;
            return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_' + width + '/');
          }

          // ─── Cities ────────────────────────────────────────────────
          // 'bay' is a placeholder bucket for any investor whose city isn't
          // known yet. The asterisk in the display name flags it for review.
          var CITIES = [
            { id:'sf',   name:'San Francisco', lat:37.77, lon:-122.42 },
            { id:'bay',  name:'Bay Area*',     lat:37.50, lon:-121.95 },
            { id:'mv',   name:'Mountain View', lat:37.39, lon:-122.08 },
            { id:'sc',   name:'Santa Clara',   lat:37.35, lon:-121.96 },
            { id:'rmd',  name:'Redmond',       lat:47.67, lon:-122.12 },
            { id:'nyc',  name:'New York',      lat:40.71, lon: -74.01 },
            { id:'aus',  name:'Austin',        lat:30.27, lon: -97.74 },
            { id:'rr',   name:'Round Rock',    lat:30.51, lon: -97.68 },
            { id:'tor',  name:'Toronto',       lat:43.65, lon: -79.38 },
            { id:'van',  name:'Vancouver',     lat:49.28, lon:-123.12 },
            { id:'blr',  name:'Bengaluru',     lat:12.97, lon:  77.59 },
            { id:'maa',  name:'Chennai',       lat:13.08, lon:  80.27 },
            { id:'bom',  name:'Mumbai',        lat:19.08, lon:  72.88 }
          ];

          // Real Shifu Investor roster (38 records).
          //
          // Per the user's overrides on this dataset:
          //   • Karthik Ramamoorthy → tag 'investor' (his personas were
          //     [Founder, Investor]; user picked Investor)
          //   • Prathiba, Kshitiz, Akshaya, Hemanth, Shreyam → tag 'operator'
          //     (their personas were [])
          //   • Akshaya Ravi designation → "Senior Founding SDR" (was null)
          //   • Sridhar Uppala + Prathiba Duvvuri → photo: null → falls
          //     back to the DiceBear caricature
          //   • Shenbhaga Pandi → city 'bay' (Bay Area*, marked with an
          //     asterisk because his real city wasn't in the source data)
          var INVESTORS_RAW = [
            // ── San Francisco (15) ─────────────────────────────────
            { name:'Karthik Ramamoorthy', role:'Co-Founder & CEO', company:'Numero', tag:'investor', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247073/52acaa2d-4c52-48ba-bc29-ceef6d307feb.png', linkedin:'https://www.linkedin.com/in/karthikramamoorthy5' },
            { name:'Raveen Sastry', role:'Founding Partner', company:'Multiply Ventures', tag:'investor', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778577160/43de1f07-7dc2-4ec9-a72d-d9870727ca18.png', linkedin:'https://www.linkedin.com/in/raveens/' },
            { name:'Ramprasad Reddy', role:'Staff Data Infrastructure Engineer', company:'Foresite Labs', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247143/ac592c01-ad7c-4623-9a32-46d1f38a9485.png', linkedin:'https://www.linkedin.com/in/ramprasad-reddy-akavaram' },
            { name:'Prateek Bondala', role:'Founder and CEO', company:'Open Legal Inc', tag:'founder', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769246953/55e3bf2d-28e7-4eef-9c2d-b3aa7bbad2e7.png', linkedin:'https://www.linkedin.com/in/prateekb' },
            { name:'Jay Pandya', role:'Engineering Manager', company:'Robinhood', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247395/5997413a-8463-4c8d-aff7-cd1d77ef05b9.png', linkedin:'https://www.linkedin.com/in/jay-pandya-b5b65330' },
            { name:'Sridhar Uppala', role:'Software Engineer', company:'', tag:'operator', city:'sf', photo:null, linkedin:'https://www.linkedin.com/in/sridharuppala' },
            { name:'Srivatsava Daruru', role:'Chief AI Officer', company:'eXlens.ai', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247429/c6e9b871-8ad5-4035-90ba-8cda1cfeaf43.png', linkedin:'https://www.linkedin.com/in/srivatsava-daruru-4abb269' },
            { name:'Nageswara Rao M', role:'Co-Founder', company:'Syft', tag:'founder', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247010/76d898de-9d6e-43bf-a303-a897057a7067.png', linkedin:'https://www.linkedin.com/in/naagas' },
            { name:'Sameer Shenai', role:'Staff Software Engineer', company:'LinkedIn', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769252426/05fc22ab-5b68-4f0e-b531-93bb19fb40ae.png', linkedin:'https://www.linkedin.com/in/shenais' },
            { name:'Aravind Karthik M', role:'Software Engineer', company:'Confluent', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769248719/3790e79f-0d0b-47f8-beca-2c5250d47837.png', linkedin:'https://www.linkedin.com/in/aravind-karthik-m-492144121' },
            { name:'Lalit Kundu', role:'Co-Founder', company:'delty', tag:'founder', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769246874/1d601758-f414-465b-973c-68990d0570a3.png', linkedin:'https://www.linkedin.com/in/lalitkundu' },
            { name:'Aravind K', role:'Director of Engineering', company:'LendingClub', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769248060/f8697bac-f6ec-404e-a6ea-73d0dbe112ef.png', linkedin:'https://www.linkedin.com/in/akalavagattu' },
            { name:'Aravind Selvan', role:'Software Engineer', company:'Notion', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769252503/94685839-20c8-4468-ad44-6710ad304d4d.png', linkedin:'https://www.linkedin.com/in/aravindselvan' },
            { name:'Prudhvi Dhulipalla', role:'Software Engineer', company:'Block', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769248574/b7ca43b9-dcc4-4546-81eb-a503cdbaaf12.png', linkedin:'https://www.linkedin.com/in/prudhvidhulipalla' },
            { name:'Sridhar Anumandla', role:'Software Engineering Manager', company:'Meta', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247890/0ebc9ebc-06be-49fc-ac71-2f6e8f0c59ce.png', linkedin:'https://www.linkedin.com/in/sridhar-anumandla' },
            { name:'Shreyam Natani', role:'Process Engineer', company:'Applied Materials', tag:'operator', city:'sf', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1771231698/Shreyam_Natani_yv4zeo.jpg', linkedin:'https://www.linkedin.com/in/shreyamnatani' },
            // ── Bay Area* (1, placeholder bucket) ──────────────────
            { name:'Shenbhaga Pandi', role:'Founder', company:'Towards AGI', tag:'founder', city:'bay', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769253940/d93d8c1b-d225-4c5c-86c3-bf734e4e62b7.png', linkedin:'https://www.linkedin.com/in/shenbhagapandian' },
            // ── Bengaluru (5) ──────────────────────────────────────
            { name:'Hitesh Gupta', role:'Senior Machine Learning Engineer', company:'Otter.ai', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247222/132759a5-cccf-4a2d-b114-861e742c7f2d.png', linkedin:'https://www.linkedin.com/in/hiteshag' },
            { name:'Sayyaparaju Sunil', role:'VP of Engineering', company:'Aerospike', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247348/d5d49981-1c33-4feb-bba7-dcf42205c45a.png', linkedin:'https://www.linkedin.com/in/sayyaparaju-sunil-8a82515' },
            { name:'Sandeep Kumar', role:'Senior Software Engineer', company:'Uber', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769249700/05669566-309a-40f6-b4f8-a4678ef4fb9d.png', linkedin:'https://www.linkedin.com/in/sandeep-kumar-iosdev' },
            { name:'Rohit Agarwal', role:'Enterprise Customer Success Manager', company:'Clari', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769240617/78da7db3-cd8e-46f0-9e2c-8e1ae6bf77e6.png', linkedin:'https://www.linkedin.com/in/ragarwal3348' },
            { name:'Muskaan Agarwal', role:'Senior Engineer', company:'Atlassian', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247188/72bce03a-9d2c-4b81-a166-9ed095a3c1f9.png', linkedin:'https://www.linkedin.com/in/muskaan-agarwal-0a4713178' },
            { name:'Harshit Agarwal', role:'CEO', company:'Appknox', tag:'founder', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778593419/75364554-433b-48ad-9d48-9d6d8c20db87.png', linkedin:'https://www.linkedin.com/in/agarwalharshit/' },
            { name:'Kesavan K', role:'Co-Founder & CEO', company:'Krita.ai', tag:'founder', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778593548/23bea57f-1797-477e-89ed-4a9d82c729b3.png', linkedin:'https://www.linkedin.com/in/kesavankk/' },
            { name:'Srihari BT', role:'Global VP Partnership', company:'Whatfix', tag:'operator', city:'blr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778593716/d24075ce-f4a2-4065-9cf1-fd9dace81ccb.png', linkedin:'https://www.linkedin.com/in/sriharibt/' },
            // ── New York (3) ───────────────────────────────────────
            { name:'Jaladheer Tummala', role:'VP of Product Management', company:'HelloFresh', tag:'operator', city:'nyc', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769248615/6f868638-be24-4454-bdf6-45d2105f93cb.png', linkedin:'https://www.linkedin.com/in/jaladheertummala' },
            { name:'Snigdha Mulukutla', role:'ex VP of Engineering', company:'DataBeat', tag:'operator', city:'nyc', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769246609/ce2cf07f-771e-48cc-a03b-f3bad794a84f.png', linkedin:'https://www.linkedin.com/in/sigimulukutla' },
            { name:'Deexit Saraff', role:'Executive Director, Corporate Treasury', company:'Morgan Stanley', tag:'operator', city:'nyc', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769249748/0a8b2ce1-5709-4b54-9f9d-c55b2d587597.png', linkedin:'https://www.linkedin.com/in/deexit-saraff-20287216' },
            // ── Austin (2) ─────────────────────────────────────────
            { name:'Sateesh Kadiyala', role:'Staff Software Engineer', company:'Procore Technologies', tag:'operator', city:'aus', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1771231005/Sateesh_Kadiyal_snajmb.jpg', linkedin:'https://www.linkedin.com/in/sateeshkadiyala' },
            { name:'Prathiba Duvvuri', role:'Data Scientist', company:'Apple', tag:'operator', city:'aus', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778576083/fde69cc0-4e55-4c5e-85e2-f393c6110441.png', linkedin:'https://www.linkedin.com/in/prathibaduvvuri' },
            // ── Singletons ─────────────────────────────────────────
            { name:'Hemanth Mantri', role:'Engineering Leader', company:'Harness.io', tag:'operator', city:'mv', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769252469/111cd9a0-0e6e-4d67-8b7c-fc8a16df8876.png', linkedin:'https://www.linkedin.com/in/mantri' },
            { name:'Kshitiz Bansal', role:'Research Scientist', company:'Blue River Technology', tag:'operator', city:'sc', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1778593803/0ba89d0c-644c-414d-9041-96341f420c01.png', linkedin:'https://www.linkedin.com/in/kshitiz-bansal-789869111' },
            { name:'YasoVardhan Reddy', role:'Senior Software Engineering Manager', company:'Microsoft', tag:'operator', city:'rmd', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247952/86f779ec-be73-441a-b4a7-6cdbf4c473ad.png', linkedin:'https://www.linkedin.com/in/yasovardhan' },
            { name:'Jayanth Reddy C', role:'Technical Staff Software Engineer', company:'Dell', tag:'operator', city:'rr', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1771231236/Jayanth_Reddy_Chintaparti_tzhws0.jpg', linkedin:'https://www.linkedin.com/in/jayanth-reddy-chintaparti-09919413' },
            { name:'Mahesh Salla', role:'Assistant Vice President', company:'Deutsche Bank', tag:'operator', city:'bom', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769247302/f78c99b4-6ff0-4bd1-a3fd-fc2d2092a799.png', linkedin:'https://www.linkedin.com/in/mahesh-salla-52773054' },
            { name:'Akshaya Ravi', role:'Senior Founding SDR', company:'Storylane', tag:'operator', city:'maa', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1774893935/1759501757582_b8yqey.jpg', linkedin:'https://www.linkedin.com/in/akshaya-ravi12' },
            { name:'Anusha Gopalacharya', role:'Program Manager', company:'AWS (Amazon)', tag:'operator', city:'tor', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1771231327/Anusha_Gopalacharya_ylgean.jpg', linkedin:'https://www.linkedin.com/in/anushagopalacharya' },
            { name:'Amit Koshal', role:'Founder and CEO', company:'Photon Legal', tag:'founder', city:'van', photo:'https://res.cloudinary.com/dkwqszhed/image/upload/v1769246834/54e2637a-ed37-4c28-886a-c1a2b726ee4c.png', linkedin:'https://www.linkedin.com/in/koshalamit' }
          ];
          var INVESTORS = INVESTORS_RAW.map(function (inv, i) {
            inv.id = inv.city + '-' + i;
            // Caricature fallback when the source has no headshot. Uses
            // DiceBear's avataaars-neutral style — plain, calm faces with
            // simple smile/neutral mouth and no quirky accessories.
            if (!inv.photo) {
              inv.photo = 'https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=' +
                          encodeURIComponent(inv.name) +
                          '&mouth=smile,default&backgroundColor=f6f3ec';
            }
            return inv;
          });

          // ─── Geometry ────────────────────────────────────────────
          var W = 1000, H = 500;
          function project(lon, lat) {
            return { x: (lon + 180) / 360 * W, y: (90 - lat) / 180 * H };
          }
          function bubbleRadius(count) {
            return 7 + Math.sqrt(count) * 2.4;
          }

          // Company → domain lookup (shared between the map marker badges
          // and the wall's bottom-right logo icon).
          var COMPANY_DOMAIN = {
            'Numero':                'numero.com',
            'Foresite Labs':         'foresite-labs.com',
            'Open Legal Inc':        'openlegal.ai',
            'Robinhood':             'robinhood.com',
            'eXlens.ai':             'exlens.ai',
            'Syft':                  'syft.com',
            'LinkedIn':              'linkedin.com',
            'Confluent':             'confluent.io',
            'delty':                 'delty.ai',
            'LendingClub':           'lendingclub.com',
            'Notion':                'notion.so',
            'Block':                 'block.xyz',
            'Meta':                  'meta.com',
            'Applied Materials':     'appliedmaterials.com',
            'Towards AGI':           'towardsagi.com',
            'Otter.ai':              'otter.ai',
            'Aerospike':             'aerospike.com',
            'Uber':                  'uber.com',
            'Clari':                 'clari.com',
            'Atlassian':             'atlassian.com',
            'HelloFresh':            'hellofresh.com',
            'DataBeat':              'databeat.com',
            'Morgan Stanley':        'morganstanley.com',
            'Procore Technologies':  'procore.com',
            'Apple':                 'apple.com',
            'Harness.io':            'harness.io',
            'Blue River Technology': 'bluerivertechnology.com',
            'Microsoft':             'microsoft.com',
            'Dell':                  'dell.com',
            'Deutsche Bank':         'db.com',
            'Storylane':             'storylane.io',
            'AWS (Amazon)':          'aws.amazon.com',
            'Photon Legal':          'photonlegal.com',
            'Multiply Ventures':     'multiply.vc',
            'Appknox':               'appknox.com',
            'Krita.ai':              'krita.ai',
            'Whatfix':               'whatfix.com'
          };
          // Specific companies whose favicon is poor / unavailable get a
          // hand-supplied logo file. Falls through to favicon otherwise.
          var COMPANY_LOGO_URL = {
            'Multiply Ventures': 'images/multiply-ventures.svg',
            'DataBeat':          'images/databeat.svg',
            'Towards AGI':       'images/towards-agi.svg'
          };
          function logoURL (company) {
            if (COMPANY_LOGO_URL[company]) return COMPANY_LOGO_URL[company];
            var d = COMPANY_DOMAIN[company];
            if (!d) return '';
            return 'images/co/' + d.replace(/\./g, '-') + '.png';
          }

          // City → country code → flag PNG.
          var CITY_COUNTRY = {
            sf:'us', bay:'us', mv:'us', sc:'us', rmd:'us', nyc:'us', aus:'us', rr:'us',
            tor:'ca', van:'ca',
            blr:'in', maa:'in', bom:'in'
          };
          function flagURL (city) {
            var c = CITY_COUNTRY[city];
            return c ? 'images/flags/' + c + '.png' : '';
          }

          // Credibility one-liners — drives the FOMO on every investor
          // card across the page. Crafted from the source JSON's
          // description field + public LinkedIn. Empty string falls
          // back to no bio rendered.
          var INVESTOR_BIO = {
            'Karthik Ramamoorthy': 'Bootstrapped Leeyo to $15M ARR. Exited to Zuora.',
            'Raveen Sastry':       '3x exited founder. Now Founding Partner at Multiply Ventures.',
            'Srivatsava Daruru':   'Got his company acquired by ServiceNow.',
            'Sridhar Anumandla':   'Pioneered Velox at Meta. 15+ years scaling data platforms.',
            'Sayyaparaju Sunil':   'Built Aerospike’s real-time DB. Billions of transactions daily.',
            'Ramprasad Reddy':     'Ex-Meta engineer. 1st hire at Foresite Labs venture studio.',
            'Srihari BT':          'Whatfix’s 2nd sales hire. Now Global VP Partnerships.',
            'Kesavan K':           'Founder & CEO at Krita.ai. Building AI-native productivity from India.',
            'Harshit Agarwal':     'Founder & CEO at Appknox. India’s leading mobile security platform.',
            'Prateek Bondala':     'Scaled engineering at Rippling, Lyft, and Scoop. Now building AI legal.',
            'Nageswara Rao M':     'One of Snapchat’s first 15 engineers. Now co-founding Syft.',
            'Shenbhaga Pandi':     '15+ year serial entrepreneur in AI, data, and risk.',
            'Lalit Kundu':         'Built Google Pay India’s payments backend. Ex-YouTube.',
            'Amit Koshal':         'Founder of Photon Legal ($1.5M ARR). 15+ years in legal and IP.',
            'Hitesh Gupta':        'Founding engineer at Otter.ai. $70M+ raised.',
            'Jay Pandya':          'Engineering at Robinhood. Ex-Meta, ex-Google.',
            'Jaladheer Tummala':   '20+ years driving digital transformation across retail and e-commerce.',
            'Sridhar Uppala':      'Software engineer with deep infrastructure chops.',
            'Sameer Shenai':       '15+ years in fintech, trading systems, and AI. Ex-founder.',
            'Aravind Karthik M':   '8+ years at Confluent and Amazon. Large-scale systems.',
            'Aravind K':           'Ex-Senior Engineering Manager at LendingClub ($1.9B+ valuation).',
            'Aravind Selvan':      'Search & AI infra at Notion. Ex-Airbnb, ex-Cloudera.',
            'Prudhvi Dhulipalla':  'Engineer at Block. Ex-Goldman Sachs, ex-Zendesk.',
            'Snigdha Mulukutla':   'Ex-VP of Engineering at DataBeat. Now building in stealth.',
            'Sateesh Kadiyala':    'Staff engineer at Procore. 15+ years in product development.',
            'Prathiba Duvvuri':    'Data Science and AI/ML at Apple.',
            'Hemanth Mantri':      'Multiple patents in cloud infra. Ex-NetApp, ex-Nutanix.',
            'YasoVardhan Reddy':   '15+ years scaling cloud and identity platforms at Microsoft.',
            'Jayanth Reddy C':     '15+ years in enterprise software and web infrastructure.',
            'Mahesh Salla':        'Oracle database expert. Performance tuning at enterprise scale.',
            'Akshaya Ravi':        'Founding SDR at Storylane.',
            'Anusha Gopalacharya': '10+ years driving large-scale transformations at Amazon and EY.',
            'Sandeep Kumar':       'Leads iOS for Uber Car Rentals. Ex-Google, ex-Microsoft.',
            'Muskaan Agarwal':     'Senior Engineer at Atlassian.',
            'Shreyam Natani':      'Semiconductor process engineer. Worked with TSMC, KLA, Applied Materials.',
            'Deexit Saraff':       'Executive Director at Morgan Stanley. 10+ years in market risk.',
            'Rohit Agarwal':       'Led Customer Success at top B2B AI companies.',
            'Kshitiz Bansal':      'Research Scientist at Blue River Technology. Ex-Samsung.'
          };
          function bioFor (name) { return INVESTOR_BIO[name] || ''; }

          // ─── State ───────────────────────────────────────────────
          var svg     = mapEl.querySelector('.inv-geo-svg');
          var landG   = svg.querySelector('[data-geo-land]');
          var bubG    = svg.querySelector('[data-geo-bubbles]');
          var panel   = document.querySelector('[data-geo-panel]');
          var tip     = mapEl.querySelector('[data-geo-tooltip]');
          var hintEl  = mapEl.querySelector('[data-geo-hint]');
          // Mobile-only: hoist the geo panel + backdrop to <body> so the
          // position:fixed bottom sheet anchors to the viewport. (The page
          // uses fd-fade-reveal which leaves a residual transform on an
          // ancestor — that creates a new containing block and breaks
          // position:fixed.) On desktop the panel stays inside .inv-geo so
          // its flex side-by-side layout with the map keeps working.
          (function () {
            if (window.innerWidth >= 768) return;
            var bd = document.querySelector('[data-geo-panel-backdrop]');
            if (panel && document.body) document.body.appendChild(panel);
            if (bd && document.body)    document.body.appendChild(bd);
          })();

          // Shared body-scroll-lock helpers. Save the current scroll
          // position before locking (`position:fixed` would otherwise
          // reset it to 0), restore it on unlock so closing a modal
          // keeps the user on the section they came from.
          //
          // Idempotent: re-locking while ALREADY locked (e.g. user
          // changes city in the geo dropdown which re-calls openPanel)
          // must NOT overwrite the saved scrollY — it would re-save 0,
          // because the body is fixed at top:-Y and scrollY reads 0.
          // Refcount class names so unlock only fires after the last
          // modal closes.
          if (!window.__invLockBody) {
            window.__invLockBody = function (cls) {
              var alreadyLocked = !!document.body.dataset.invScrollY;
              if (!alreadyLocked) {
                var y = window.scrollY || window.pageYOffset || 0;
                document.body.dataset.invScrollY = y;
                document.body.style.top = (-y) + 'px';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
              }
              document.body.classList.add(cls);
            };
            window.__invUnlockBody = function (cls) {
              document.body.classList.remove(cls);
              // If any other lock class is still on the body (e.g. user
              // opened the form modal from inside the geo panel), keep
              // the body locked — only fully unlock when no lock class
              // remains.
              var stillLocked = /\binv-(geo-panel-open|wall-modal-open|form-modal-open|hero-modal-open)\b/
                .test(document.body.className);
              if (stillLocked) return;
              var y = parseInt(document.body.dataset.invScrollY || '0', 10);
              document.body.style.top = '';
              document.body.style.position = '';
              document.body.style.width = '';
              delete document.body.dataset.invScrollY;
              // Use 'instant' so there's no scroll animation on close.
              window.scrollTo({ top: y, left: 0, behavior: 'instant' });
            };
          }
          // Measure the navbar's actual bottom-edge position in the
          // viewport and write it into --inv-nav-h so mobile bottom
          // sheets anchor flush below the navbar with no gap. Re-run
          // on resize because mobile address-bar collapse/expand can
          // shift the navbar.
          (function () {
            function syncNavH () {
              var nav = document.querySelector('.navbar');
              if (!nav) return;
              var r = nav.getBoundingClientRect();
              // The navbar's bottom in the viewport, in px.
              var px = Math.max(0, r.bottom);
              document.documentElement.style.setProperty('--inv-nav-h', px + 'px');
            }
            syncNavH();
            window.addEventListener('resize', syncNavH, { passive: true });
            // Re-measure after the page is interactive in case fonts
            // shift the navbar height on first paint.
            setTimeout(syncNavH, 300);
          })();
          var state = { zoom: 1, centerX: 500, centerY: 230, role: 'all', cityId: null, declusterCity: null, investorId: null };
          var ZOOM_MIN = 1, ZOOM_MAX = window.innerWidth < 768 ? 18 : 10, DECLUSTER_AT = 9;
          var UID = 0;

          // ─── Filter / counts ─────────────────────────────────────
          function filterInvestors() {
            if (state.role === 'all') return INVESTORS;
            return INVESTORS.filter(function (i) { return i.tag === state.role; });
          }
          function countByCity(list) {
            var m = {};
            list.forEach(function (i) { m[i.city] = (m[i.city] || 0) + 1; });
            return m;
          }
          function continentsOf(cities) {
            var set = {};
            cities.forEach(function (c) {
              if (c.lon < -30) set.am = 1;
              else if (c.lon < 60) set.eu = 1;
              else set.as = 1;
            });
            return Object.keys(set).length;
          }

          // ─── SVG / DOM helpers ───────────────────────────────────
          var SVGNS = 'http://www.w3.org/2000/svg';
          function svgEl(name, attrs) {
            var el = document.createElementNS(SVGNS, name);
            if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
            return el;
          }

          // ─── Render bubbles ──────────────────────────────────────
          // Overlapping cluster repulsion: at low zoom the radii are big
          // in SVG units, so close neighbours (e.g. SF / Mountain View /
          // Santa Clara) overlap. We iteratively push them apart in
          // SVG-coord space using their current effective radii. As the
          // user zooms in, the effective radii shrink so the bubbles
          // converge naturally back toward their true coordinates.
          function repel(items, padding) {
            for (var iter = 0; iter < 80; iter++) {
              var moved = false;
              for (var i = 0; i < items.length; i++) {
                for (var j = i + 1; j < items.length; j++) {
                  var a = items[i], b = items[j];
                  var dx = b.x - a.x, dy = b.y - a.y;
                  var d  = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                  var minD = a.sr + b.sr + padding;
                  if (d < minD) {
                    var push = (minD - d) / 2;
                    var ux = dx / d, uy = dy / d;
                    a.x -= ux * push;
                    a.y -= uy * push;
                    b.x += ux * push;
                    b.y += uy * push;
                    moved = true;
                  }
                }
              }
              if (!moved) break;
            }
            return items;
          }

          function renderBubbles() {
            bubG.innerHTML = '';
            var list   = filterInvestors();
            var counts = countByCity(list);
            var s = 1 / state.zoom;   // visual scale factor (keep bubbles constant on-screen)
            // Cities whose investors are already drawn as an avatar fan
            // (decluster mode) — skipped when the normal-mode block runs.
            var skipCityIds = {};

            // ── Helper: fan out individual investor avatar markers around
            // a pin (concentric rings). Accepts an arbitrary list of
            // members + an anchor point — works for a single city OR a
            // merged super-cluster of nearby cities.
            function renderAvatarFan(anchorOrCity, providedMembers) {
              var members, dp;
              if (providedMembers) {
                members = providedMembers;
                dp = anchorOrCity;     // {x, y}
              } else {
                members = list.filter(function (i) { return i.city === anchorOrCity.id; });
                if (!members.length) return;
                dp = project(anchorOrCity.lon, anchorOrCity.lat);
              }
              if (!members.length) return;
              var avRScreen = 16 + Math.max(0, state.zoom - DECLUSTER_AT) * (window.innerWidth < 768 ? 4.5 : 3);
              var avR = avRScreen * s;
              // Wider rings — guarantees clear gaps between avatars at any
              // zoom AND between adjacent rings at the same angle. Each
              // ring's radius is at least 2 avatars-worth past the
              // previous ring.
              var rings = [
                { radius: avRScreen * 2.8 * s, max: 6 },
                { radius: avRScreen * 5.2 * s, max: 10 },
                { radius: avRScreen * 7.6 * s, max: 14 }
              ];
              var positions = [];
              if (members.length === 1) {
                positions.push({ dx: 0, dy: 0 });
              } else {
                positions.push({ dx: 0, dy: 0 });
                var placed = 1;
                for (var ri = 0; ri < rings.length && placed < members.length; ri++) {
                  var remaining = members.length - placed;
                  var slots = Math.min(rings[ri].max, remaining);
                  for (var si = 0; si < slots; si++) {
                    var ang = (si / slots) * 2 * Math.PI + (ri * 0.3);
                    positions.push({ dx: Math.cos(ang) * rings[ri].radius, dy: Math.sin(ang) * rings[ri].radius });
                    placed++;
                  }
                }
              }
              members.forEach(function (inv, idx) {
                var pos = positions[idx] || { dx: 0, dy: 0 };
                var cx = dp.x + pos.dx;
                var cy = dp.y + pos.dy;
                var clipId = 'mclip-' + (UID++);
                var g = svgEl('g', {
                  transform: 'translate(' + cx + ' ' + cy + ')',
                  'class': 'inv-geo-marker' + (state.investorId === inv.id ? ' is-active' : ''),
                  'data-investor-id': inv.id
                });
                var defs  = svgEl('defs');
                var clip  = svgEl('clipPath', { id: clipId });
                clip.appendChild(svgEl('circle', { r: avR, cx: 0, cy: 0 }));
                defs.appendChild(clip);
                g.appendChild(defs);
                g.appendChild(svgEl('circle', { r: avR + 1.5 * s, 'class': 'inv-geo-marker-halo' }));
                // Map avatars are tiny (16–48 px). w_128 covers up to 2× retina.
                var photoUrl = cldUrl(inv.photo, 128);
                var img = svgEl('image', {
                  href: photoUrl,
                  width: avR * 2, height: avR * 2,
                  x: -avR, y: -avR,
                  'clip-path': 'url(#' + clipId + ')',
                  preserveAspectRatio: 'xMidYMid slice'
                });
                img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', photoUrl);
                g.appendChild(img);
                g.appendChild(svgEl('circle', { r: avR, 'class': 'inv-geo-marker-ring' }));

                // Bottom-right company logo badge.
                var lUrl = logoURL(inv.company);
                if (lUrl) {
                  var badgeR = avR * 0.34;
                  var badgeCx = avR * 0.7;
                  var badgeCy = avR * 0.7;
                  // White circle backdrop
                  g.appendChild(svgEl('circle', {
                    cx: badgeCx, cy: badgeCy, r: badgeR + 1.5 * s,
                    'class': 'inv-geo-marker-logo-bg'
                  }));
                  // Logo image clipped to the inner circle
                  var lClipId = 'lclip-' + (UID++);
                  var lDefs = svgEl('defs');
                  var lClip = svgEl('clipPath', { id: lClipId });
                  lClip.appendChild(svgEl('circle', { r: badgeR, cx: badgeCx, cy: badgeCy }));
                  lDefs.appendChild(lClip);
                  g.appendChild(lDefs);
                  var lImg = svgEl('image', {
                    href: lUrl,
                    width: badgeR * 2, height: badgeR * 2,
                    x: badgeCx - badgeR, y: badgeCy - badgeR,
                    'clip-path': 'url(#' + lClipId + ')',
                    preserveAspectRatio: 'xMidYMid meet'
                  });
                  lImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', lUrl);
                  g.appendChild(lImg);
                }

                g.addEventListener('click', function () { selectInvestor(inv.id); });
                (function (gEl, label) {
                  gEl.addEventListener('mouseenter', function () { showTipFor(gEl, label); });
                  gEl.addEventListener('mouseleave', hideTip);
                })(g, inv.name + ' - ' + inv.role);
                bubG.appendChild(g);
              });
            }

            // At high zoom, AUTO-decluster. Every visible city fans at
            // its OWN position — no merging. Where cities sit on top
            // of each other in the projection (SF / Mountain View /
            // Santa Clara / Bay Area* within ~1-2 SVG units), the
            // existing repulsion algorithm pushes the fan CENTERS
            // apart so each one gets visual breathing room. A faint
            // leader line connects each displaced fan back to its
            // true geographic position so the user can still place it.
            if (state.zoom >= DECLUSTER_AT) {
              var vw = W / state.zoom;
              var vh = H / state.zoom;
              var vx = state.centerX - vw / 2;
              var vy = state.centerY - vh / 2;
              // Match the avatar sizing used inside renderAvatarFan so
              // fanRadius() reflects the actual on-screen extent.
              var avScrSize = 16 + Math.max(0, state.zoom - DECLUSTER_AT) * (window.innerWidth < 768 ? 4.5 : 3);
              function fanRadius (n) {
                // Mirrors the ring radii in renderAvatarFan (2.8 / 5.2
                // / 7.6 × avScrSize) plus a small margin so fans don't
                // touch when neighbors are tightly packed.
                var m = (n <= 1) ? 1.2 : (n <= 7) ? 3.0 : (n <= 17) ? 5.4 : 7.8;
                return avScrSize * m * s;
              }
              var visible = [];
              CITIES.forEach(function (city) {
                if (!counts[city.id]) return;
                var p = project(city.lon, city.lat);
                if (p.x < vx || p.x > vx + vw || p.y < vy || p.y > vy + vh) return;
                var members = list.filter(function (i) { return i.city === city.id; });
                if (!members.length) return;
                visible.push({
                  city: city,
                  x: p.x, y: p.y,
                  baseX: p.x, baseY: p.y,
                  sr: fanRadius(members.length),
                  members: members
                });
              });
              if (visible.length) {
                // Push close fan centers apart so SF Bay Area cities
                // (and any other near-coincident pair) read distinctly.
                repel(visible, 0.5 * s);

                visible.forEach(function (v) {
                  renderAvatarFan({ x: v.x, y: v.y }, v.members);
                  skipCityIds[v.city.id] = true;
                });
              }
              // (Nothing in viewport — fall through to count bubbles.)
            }

            // Normal mode: collect cities-with-counts (minus those already
            // drawn as a fan above), run repulsion, draw count bubbles.
            var items = [];
            CITIES.forEach(function (city) {
              if (skipCityIds[city.id]) return;
              var n = counts[city.id] || 0;
              if (!n) return;
              var p = project(city.lon, city.lat);
              var rr = bubbleRadius(n) * s;
              items.push({ city: city, n: n, x: p.x, y: p.y, baseX: p.x, baseY: p.y, sr: rr });
            });
            // Add small padding so neighbours sit tangent rather than touching.
            repel(items, 1.5 * s);

            items.forEach(function (it) {
              var g = svgEl('g', {
                transform: 'translate(' + it.x + ' ' + it.y + ')',
                'class': 'inv-geo-bubble' + (state.cityId === it.city.id ? ' is-active' : ''),
                'data-city-id': it.city.id
              });
              // Faint leader line from cluster-offset position back to true geographic location
              if (Math.abs(it.x - it.baseX) > 0.5 || Math.abs(it.y - it.baseY) > 0.5) {
                var lx = it.baseX - it.x, ly = it.baseY - it.y;
                var line = svgEl('line', {
                  x1: 0, y1: 0, x2: lx, y2: ly,
                  'class': 'inv-geo-bubble-tether'
                });
                g.appendChild(line);
              }
              g.appendChild(svgEl('circle', { r: it.sr, 'class': 'inv-geo-bubble-c' }));
              var t = svgEl('text', {
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                'class': 'inv-geo-bubble-t',
                'font-size': (it.sr * 0.85)
              });
              t.textContent = it.n;
              g.appendChild(t);
              g.addEventListener('click', function () { selectCity(it.city.id); });
              (function (gEl, label) {
                gEl.addEventListener('mouseenter', function () { showTipFor(gEl, label); });
                gEl.addEventListener('mouseleave', hideTip);
              })(g, it.city.name + ' · ' + it.n);
              bubG.appendChild(g);
            });
          }

          // ─── Viewport / pan / zoom ───────────────────────────────
          function applyViewport() {
            var w = W / state.zoom;
            var h = H / state.zoom;
            var x = Math.max(0, Math.min(W - w, state.centerX - w / 2));
            var y = Math.max(0, Math.min(H - h, state.centerY - h / 2));
            svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
            renderBubbles();
            // Bubbles just re-rendered → the previously-hovered element is
            // gone, so the tooltip is now pointing at a ghost. Hide it.
            hideTip();
          }

          // Smooth animated transitions. cancelable; only one runs at a time.
          var animHandle = null;
          function animateTo(targetZoom, targetCx, targetCy, duration) {
            if (animHandle) cancelAnimationFrame(animHandle);
            hideTip();
            duration = duration || 480;
            var z0 = state.zoom, x0 = state.centerX, y0 = state.centerY;
            var z1 = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom));
            var x1 = targetCx, y1 = targetCy;
            var t0 = performance.now();
            function step(now) {
              var t = Math.min(1, (now - t0) / duration);
              // easeOutCubic — fast in, gentle settle
              var e = 1 - Math.pow(1 - t, 3);
              state.zoom    = z0 + (z1 - z0) * e;
              state.centerX = x0 + (x1 - x0) * e;
              state.centerY = y0 + (y1 - y0) * e;
              // Settle decluster state once we cross/leave the threshold
              if (state.zoom < DECLUSTER_AT) state.declusterCity = null;
              else if (state.cityId) state.declusterCity = state.cityId;
              applyViewport();
              if (t < 1) animHandle = requestAnimationFrame(step);
              else animHandle = null;
            }
            animHandle = requestAnimationFrame(step);
          }

          function setZoom(z, anchorX, anchorY) {
            // Cancel any running tween — manual zoom takes over.
            if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
            hideTip();
            var nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
            if (nz < DECLUSTER_AT) state.declusterCity = null;
            else if (state.cityId) state.declusterCity = state.cityId;
            if (anchorX != null && anchorY != null) {
              var w = W / state.zoom, h = H / state.zoom;
              var cx = state.centerX - w / 2;
              var cy = state.centerY - h / 2;
              var ax = cx + anchorX * w;
              var ay = cy + anchorY * h;
              state.zoom = nz;
              var nw = W / nz, nh = H / nz;
              state.centerX = ax - (anchorX - 0.5) * nw;
              state.centerY = ay - (anchorY - 0.5) * nh;
            } else {
              state.zoom = nz;
            }
            applyViewport();
          }

          function panToCity(city) {
            var p = project(city.lon, city.lat);
            // Aggressively zoom so the city + its individual investor avatars
            // dominate the viewport. Animate the transition so it doesn't
            // feel jerky alongside the side-panel slide.
            var targetZoom = Math.max(state.zoom, 9);
            state.declusterCity = city.id;
            animateTo(targetZoom, p.x, p.y, 520);
          }

          function resetView() {
            state.declusterCity = null;
            animateTo(1, 500, 230, 480);
          }

          // ─── Tooltip ─────────────────────────────────────────────
          // The tooltip is anchored to the *bubble's centre* (above it),
          // not the mouse, so it always points at the thing it describes.
          // Position is computed once on mouseenter and cleared on leave
          // / on any zoom/pan, so it can't strand at a stale screen spot.
          var tipTarget = null;
          function showTipFor(bubbleEl, text) {
            tipTarget = bubbleEl;
            tip.textContent = text;
            tip.setAttribute('aria-hidden', 'false');
            positionTip();
            tip.classList.add('is-visible');
          }
          function positionTip() {
            if (!tipTarget) return;
            var r = tipTarget.getBoundingClientRect();
            var mapRect = mapEl.getBoundingClientRect();
            tip.style.left = (r.left + r.width / 2 - mapRect.left) + 'px';
            tip.style.top  = (r.top - mapRect.top) + 'px';
          }
          function hideTip() {
            tipTarget = null;
            tip.classList.remove('is-visible');
            tip.setAttribute('aria-hidden', 'true');
          }

          // ─── Side panel ──────────────────────────────────────────
          function selectCity(cityId, investorId) {
            var city = CITIES.find(function (c) { return c.id === cityId; });
            if (!city) return;
            state.cityId = cityId;
            state.investorId = investorId || null;
            panToCity(city);
            openPanel(city, investorId);
          }

          function selectInvestor(investorId) {
            var inv = INVESTORS.find(function (i) { return i.id === investorId; });
            if (!inv) return;
            var city = CITIES.find(function (c) { return c.id === inv.city; });
            if (!city) return;
            state.cityId = inv.city;
            state.investorId = investorId;
            state.declusterCity = inv.city;
            renderBubbles();
            // Re-open the panel for the investor's city so the list
            // reflects whichever city the avatar belongs to (e.g. user
            // panned from Bengaluru to NYC and clicked an NYC avatar).
            openPanel(city, investorId);
          }

          // SVG (inline) icon used inside rows
          var LINKEDIN_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';

          function openPanel(city, focusInvestorId) {
            var list    = filterInvestors().filter(function (i) { return i.city === city.id; });
            var cityEl  = panel.querySelector('[data-geo-panel-city]');
            var metaEl  = panel.querySelector('[data-geo-panel-meta]');
            var listEl  = panel.querySelector('[data-geo-panel-list]');
            cityEl.textContent = city.name;
            metaEl.textContent = list.length + ' ' + (list.length === 1 ? 'investor' : 'investors');
            listEl.innerHTML = '';

            list.forEach(function (inv) {
              var item = document.createElement('div');
              item.className = 'inv-geo-row';
              item.setAttribute('data-investor-id', inv.id);
              var shortRole = (inv.role || '')
                .replace(/Machine Learning/gi, 'ML')
                .replace(/\bVice President\b/g, 'VP')
                .replace(/\bAssistant Vice President\b/g, 'AVP');
              var coLogo = logoURL(inv.company);
              var bio = bioFor(inv.name);
              var tagLabel = (inv.tag || '').charAt(0).toUpperCase() + (inv.tag || '').slice(1);
              var roleLine = inv.company
                ? (shortRole ? shortRole + ' at ' + inv.company : inv.company)
                : shortRole;
              item.innerHTML =
                '<span class="inv-geo-row-photo-wrap">' +
                  '<img class="inv-geo-row-photo" loading="lazy" alt="" src="' + cldUrl(inv.photo, 128) + '">' +
                  (coLogo ? '<img class="inv-geo-row-flag" loading="lazy" alt="' + (inv.company || '') + '" src="' + coLogo + '">' : '') +
                '</span>' +
                '<span class="inv-geo-row-meta">' +
                  '<span class="inv-geo-row-tag-eyebrow">' + tagLabel + '</span>' +
                  '<span class="inv-geo-row-name">' + inv.name + '</span>' +
                  (bio ? '<span class="inv-geo-row-bio inv-geo-row-bio-inline">' + bio + '</span>' : '') +
                  (roleLine ? '<span class="inv-geo-row-role">' + roleLine + '</span>' : '') +
                '</span>' +
                (inv.linkedin
                  ? '<a class="inv-geo-row-li" href="' + inv.linkedin + '" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">' + LINKEDIN_SVG + '</a>'
                  : '') +
                (bio ? '<span class="inv-geo-row-bio inv-geo-row-bio-bottom">' + bio + '</span>' : '');
              listEl.appendChild(item);
            });

            panel.setAttribute('aria-hidden', 'false');
            panel.classList.add('is-open');
            mapEl.parentElement.classList.add('has-panel');
            hintEl && hintEl.classList.add('is-hidden');

            // Activate the mobile bottom-sheet backdrop + lock body
            // scroll. On desktop the panel is an inline sidebar; we
            // just toggle the class (no scroll-lock — page must stay
            // scrollable).
            var bd = document.querySelector('[data-geo-panel-backdrop]');
            if (bd) bd.classList.add('is-active');
            if (window.innerWidth < 768) {
              window.__invLockBody('inv-geo-panel-open');
            } else {
              document.body.classList.add('inv-geo-panel-open');
            }

            // If the click came from an individual avatar, mirror the
            // selection on the map AND on the list: add a subtle
            // orange-left-border to the matching row, then centre it
            // in the scrollable panel so it never sits stuck at the
            // bottom edge.
            listEl.querySelectorAll('.inv-geo-row.is-focused')
              .forEach(function (r) { r.classList.remove('is-focused'); });
            if (focusInvestorId) {
              state.investorId = focusInvestorId;
              var row = listEl.querySelector('[data-investor-id="' + focusInvestorId + '"]');
              if (row) {
                row.classList.add('is-focused');
                row.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            }
            renderBubbles();
          }

          function closePanel() {
            state.cityId = null;
            state.declusterCity = null;
            state.investorId = null;
            panel.setAttribute('aria-hidden', 'true');
            panel.classList.remove('is-open');
            mapEl.parentElement.classList.remove('has-panel');
            hintEl && hintEl.classList.remove('is-hidden');
            // Hide the bottom-sheet backdrop + the city dropdown +
            // restore body scroll.
            var bd = document.querySelector('[data-geo-panel-backdrop]');
            if (bd) bd.classList.remove('is-active');
            var menu = document.querySelector('[data-geo-city-menu]');
            if (menu) menu.hidden = true;
            var listEl = document.querySelector('[data-geo-panel-list]');
            if (listEl) listEl.hidden = false;
            var toggle = document.querySelector('[data-geo-city-toggle]');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
            if (window.innerWidth < 768) {
              window.__invUnlockBody('inv-geo-panel-open');
            } else {
              document.body.classList.remove('inv-geo-panel-open');
            }
            resetView();
          }

          // Bottom-sheet backdrop: tapping outside the panel closes it.
          (function () {
            var bd = document.querySelector('[data-geo-panel-backdrop]');
            if (bd) bd.addEventListener('click', closePanel);
          })();

          // City dropdown: shows every city with investors, lets the user
          // jump between them without going back to the map. On mobile,
          // the menu replaces the investor list inside the sheet so the
          // page never bleeds through; on desktop it's a popover.
          (function () {
            var toggle    = document.querySelector('[data-geo-city-toggle]');
            var menu      = document.querySelector('[data-geo-city-menu]');
            var listEl    = document.querySelector('[data-geo-panel-list]');
            if (!toggle || !menu) return;
            function closeMenu () {
              menu.hidden = true;
              if (listEl) listEl.hidden = false;
              toggle.setAttribute('aria-expanded', 'false');
            }
            function openMenu () {
              var counts = countByCity(filterInvestors());
              menu.innerHTML = CITIES
                .filter(function (c) { return counts[c.id]; })
                .map(function (c) {
                  var isActive = state.cityId === c.id;
                  return '<li role="option" data-geo-city-id="' + c.id + '" class="inv-geo-panel-city-menu-item' + (isActive ? ' is-active' : '') + '">' +
                           '<span class="inv-geo-panel-city-menu-name">' + c.name + '</span>' +
                           '<span class="inv-geo-panel-city-menu-count">' + counts[c.id] + '</span>' +
                         '</li>';
                }).join('');
              menu.hidden = false;
              // Swap: hide the investor list while picking. On desktop the
              // CSS positions the menu absolute so this is a no-op visually.
              if (listEl) listEl.hidden = true;
              toggle.setAttribute('aria-expanded', 'true');
            }
            toggle.addEventListener('click', function (e) {
              e.stopPropagation();
              if (menu.hidden) openMenu(); else closeMenu();
            });
            menu.addEventListener('click', function (e) {
              var item = e.target.closest('[data-geo-city-id]');
              if (!item) return;
              var cid = item.getAttribute('data-geo-city-id');
              var city = CITIES.filter(function (c) { return c.id === cid; })[0];
              if (city) {
                state.cityId = city.id;
                closeMenu();
                openPanel(city);
                // Re-center the map on the new city as well.
                var p = project(city.lon, city.lat);
                var targetZoom = Math.max(state.zoom, 9);
                animateTo(targetZoom, p.x, p.y, 380);
              }
            });
            // Click-outside to close the dropdown (but not the panel).
            document.addEventListener('click', function (e) {
              if (menu.hidden) return;
              if (menu.contains(e.target) || toggle.contains(e.target)) return;
              closeMenu();
            });
          })();

          // ─── Tally ───────────────────────────────────────────────
          function updateTally() {
            var list = filterInvestors();
            var counts = countByCity(list);
            var usedCities = CITIES.filter(function (c) { return counts[c.id]; });
            var cnt = document.querySelector('[data-geo-count]');
            var cit = document.querySelector('[data-geo-cities]');
            var con = document.querySelector('[data-geo-continents]');
            if (cnt) cnt.textContent = list.length;
            if (cit) cit.textContent = usedCities.length;
            if (con) con.textContent = continentsOf(usedCities);
          }

          // ─── Wire up ─────────────────────────────────────────────
          function loadWorldSvg() {
            return fetch('images/world-map.svg', { cache: 'force-cache' })
              .then(function (r) { return r.text(); })
              .then(function (text) {
                // Extract the inner content of the fetched <svg> root
                var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
                var root = doc.documentElement;
                landG.innerHTML = '';
                for (var i = 0; i < root.children.length; i++) {
                  landG.appendChild(root.children[i].cloneNode(true));
                }
              });
          }

          loadWorldSvg().then(function () {
            applyViewport();
            updateTally();
          });

          // Zoom buttons — animate transition for a smoother feel
          mapEl.parentElement.querySelectorAll('[data-geo-zoom]').forEach(function (b) {
            b.addEventListener('click', function () {
              var k = b.getAttribute('data-geo-zoom');
              if (k === 'reset') { resetView(); return; }
              var nz = k === 'in' ? state.zoom * 1.5 : state.zoom / 1.5;
              animateTo(nz, state.centerX, state.centerY, 320);
            });
          });

          // Wheel zoom — only fires for genuine pinch gestures. Browsers
          // set ctrlKey=true on pinch-zoom wheel events (and on the
          // discrete Ctrl+scroll). A plain two-finger trackpad swipe has
          // ctrlKey=false → we let it bubble so the page scrolls
          // normally instead of hijacking it as zoom.
          mapEl.addEventListener('wheel', function (e) {
            if (!e.ctrlKey) return; // not a pinch — let the page scroll
            if (Math.abs(e.deltaY) < 1) return;
            e.preventDefault();
            var rect = mapEl.getBoundingClientRect();
            var ax = (e.clientX - rect.left) / rect.width;
            var ay = (e.clientY - rect.top) / rect.height;
            var perStep = Math.min(0.5, Math.abs(e.deltaY) / 100);
            var factor = e.deltaY < 0 ? (1 + perStep) : (1 / (1 + perStep));
            setZoom(state.zoom * factor, ax, ay);
          }, { passive: false });

          // Drag to pan
          var drag = null;
          var dragMoved = false;
          mapEl.addEventListener('pointerdown', function (e) {
            if (e.target.closest('.inv-geo-bubble') || e.target.closest('.inv-geo-marker') || e.target.closest('.inv-geo-zoom')) return;
            hideTip();
            drag = { x: e.clientX, y: e.clientY, cx: state.centerX, cy: state.centerY };
            dragMoved = false;
            mapEl.setPointerCapture(e.pointerId);
            mapEl.classList.add('is-grabbing');
          });
          mapEl.addEventListener('pointermove', function (e) {
            if (!drag) return;
            var rect = mapEl.getBoundingClientRect();
            var dx = (e.clientX - drag.x) / rect.width  * (W / state.zoom);
            var dy = (e.clientY - drag.y) / rect.height * (H / state.zoom);
            // Only mark as dragged after a small threshold to avoid micro-jitter swallowing clicks.
            if (Math.abs(e.clientX - drag.x) > 3 || Math.abs(e.clientY - drag.y) > 3) dragMoved = true;
            state.centerX = drag.cx - dx;
            state.centerY = drag.cy - dy;
            applyViewport();
          });
          function endDrag(e) {
            // If the user just clicked (no drag) on the empty map AND the side
            // panel is open → close it. Bubble / marker / zoom clicks are
            // already excluded by the pointerdown filter, so anything that
            // reaches here is a "click on the map background".
            if (drag && !dragMoved && panel.classList.contains('is-open')) {
              closePanel();
            }
            drag = null;
            dragMoved = false;
            mapEl.classList.remove('is-grabbing');
          }
          mapEl.addEventListener('pointerup', endDrag);
          mapEl.addEventListener('pointercancel', endDrag);
          mapEl.addEventListener('pointerleave', endDrag);

          // Role chips
          document.querySelectorAll('[data-role-filter]').forEach(function (b) {
            b.addEventListener('click', function () {
              document.querySelectorAll('[data-role-filter]').forEach(function (x) {
                x.classList.remove('is-active');
                x.setAttribute('aria-pressed', 'false');
              });
              b.classList.add('is-active');
              b.setAttribute('aria-pressed', 'true');
              state.role = b.getAttribute('data-role-filter');
              renderBubbles();
              updateTally();
              if (state.cityId) {
                var c = CITIES.find(function (x) { return x.id === state.cityId; });
                if (c) openPanel(c);
              }
            });
          });

          // Panel close
          panel.querySelector('[data-geo-close]').addEventListener('click', closePanel);
          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel();
          });

          // ────────────────────────────────────────────────────────
          // §01b By Expertise — wall renderer
          //
          // Renders all 34 investors as a wall, grouped first by tag
          // (Founders / Investors / Operators) and then by an expertise
          // lane (Product, Service, Angels, VC, AI, Engineering, GTM,
          // Ops). Cards are tiny by design — what reads at a glance is
          // the GROUPING. Lanes with > MAX_PER_COL cards split into
          // multiple visual columns sharing the same lane label.
          // ────────────────────────────────────────────────────────
          (function buildWall () {
            var wallEl = document.querySelector('[data-wall-v2]');
            if (!wallEl) return;

            // Per-name lane override (the expertise field in the source
            // data isn't sub-typed cleanly, so we map by name).
            var WALL_LANE = {
              // Founders / Product
              'Lalit Kundu': 'product',
              'Nageswara Rao M': 'product',
              'Shenbhaga Pandi': 'product',
              'Harshit Agarwal': 'product',
              'Kesavan K': 'product',
              // Founders / Service
              'Prateek Bondala': 'service',
              'Amit Koshal': 'service',
              // Investors / Angels
              'Karthik Ramamoorthy': 'angels',
              // Investors / VC
              'Raveen Sastry': 'vc',
              // Operators / AI
              'Srivatsava Daruru': 'ai',
              'Hitesh Gupta': 'ai',
              'Prathiba Duvvuri': 'ai',
              // Operators / Engineering
              'Ramprasad Reddy': 'engineering',
              'Jay Pandya': 'engineering',
              'Sridhar Uppala': 'engineering',
              'Sameer Shenai': 'engineering',
              'Aravind Karthik M': 'engineering',
              'Aravind K': 'engineering',
              'Aravind Selvan': 'engineering',
              'Prudhvi Dhulipalla': 'engineering',
              'Sridhar Anumandla': 'engineering',
              'Sayyaparaju Sunil': 'engineering',
              'Sandeep Kumar': 'engineering',
              'Muskaan Agarwal': 'engineering',
              'Snigdha Mulukutla': 'engineering',
              'Sateesh Kadiyala': 'engineering',
              'Hemanth Mantri': 'engineering',
              'YasoVardhan Reddy': 'engineering',
              'Jayanth Reddy C': 'engineering',
              'Mahesh Salla': 'engineering',
              // Operators / Product
              'Jaladheer Tummala': 'product',
              'Anusha Gopalacharya': 'product',
              // Operators / GTM
              'Rohit Agarwal': 'gtm',
              'Akshaya Ravi': 'gtm',
              'Srihari BT': 'gtm',
              // Operators / Ops
              'Shreyam Natani': 'ops',
              'Deexit Saraff': 'ops',
              'Kshitiz Bansal': 'ops'
            };

            var GROUPS = [
              { id: 'founder',  label: 'Founders',  lanes: [
                  { id: 'product', label: 'Product' },
                  { id: 'service', label: 'Service' }
              ] },
              { id: 'investor', label: 'Investors', lanes: [
                  { id: 'angels',  label: 'Angels'  },
                  { id: 'vc',      label: 'VC / Accel.' }
              ] },
              { id: 'operator', label: 'Operators', lanes: [
                  { id: 'ai',          label: 'AI' },
                  { id: 'engineering', label: 'Engineering' },
                  { id: 'product',     label: 'Product' },
                  { id: 'gtm',         label: 'GTM' },
                  { id: 'ops',         label: 'Ops' }
              ] }
            ];
            var MAX_PER_COL = 6;

            // "Karthik Ramamoorthy" → "Karthik R."  | "Jay Pandya" → "Jay P."
            function abbreviateName (full) {
              var parts = full.trim().split(/\s+/);
              if (parts.length <= 1) return full;
              var last = parts[parts.length - 1];
              return parts[0] + ' ' + last.charAt(0).toUpperCase() + '.';
            }

            function cardHTML (inv) {
              var logo = logoURL(inv.company);
              return (
                '<div class="inv-wall2-card" data-investor-name="' + inv.name.replace(/"/g, '&quot;') + '">' +
                  '<img class="inv-wall2-card-photo" loading="lazy" alt="" src="' + cldUrl(inv.photo, 96) + '">' +
                  '<div class="inv-wall2-card-text">' +
                    '<div class="inv-wall2-card-name">' + abbreviateName(inv.name) + '</div>' +
                    (logo ? '<img class="inv-wall2-card-logo" loading="lazy" alt="" src="' + logo + '">' : '') +
                  '</div>' +
                '</div>'
              );
            }

            function chunk (arr, n) {
              var out = [];
              for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
              return out;
            }

            var html = '';
            GROUPS.forEach(function (g) {
              // Build columns for each lane (chunked if oversized)
              var columnsHtml = '';
              var hasAnyCards = false;
              g.lanes.forEach(function (lane) {
                var members = INVESTORS.filter(function (inv) {
                  return inv.tag === g.id && WALL_LANE[inv.name] === lane.id;
                });
                if (members.length) {
                  hasAnyCards = true;
                  chunk(members, MAX_PER_COL).forEach(function (col) {
                    columnsHtml +=
                      '<div class="inv-wall2-lane" data-lane-id="' + lane.id + '" role="button" tabindex="0" aria-label="Open ' + lane.label + ' details">' +
                        '<div class="inv-wall2-lane-cards">' +
                          col.map(cardHTML).join('') +
                        '</div>' +
                        '<div class="inv-wall2-lane-label"><span>' + lane.label + '</span></div>' +
                      '</div>';
                  });
                } else {
                  // Empty lane — render just the label so the sub-group
                  // structure stays visible (e.g. "VC / Accel." with no
                  // records yet). Not clickable since there's nothing
                  // to open.
                  columnsHtml +=
                    '<div class="inv-wall2-lane is-empty">' +
                      '<div class="inv-wall2-lane-cards"></div>' +
                      '<div class="inv-wall2-lane-label"><span>' + lane.label + '</span></div>' +
                    '</div>';
                }
              });
              if (!hasAnyCards) return;
              html +=
                '<div class="inv-wall2-group" data-group-id="' + g.id + '" role="button" tabindex="0" aria-label="Open ' + g.label + ' details">' +
                  '<div class="inv-wall2-group-cols">' + columnsHtml + '</div>' +
                  '<div class="inv-wall2-group-label">' + g.label + '</div>' +
                '</div>';
            });
            wallEl.innerHTML = html;

            // ──────────────────────────────────────────────────────
            // Expanded modal — clicking a group OR a card opens it.
            // ──────────────────────────────────────────────────────
            var LINKEDIN_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';
            var modal      = document.querySelector('[data-wall-modal]');
            var modalTabs  = modal && modal.querySelector('[data-wall-modal-tabs]');
            var modalBody  = modal && modal.querySelector('[data-wall-modal-body]');
            var modalTitle = modal && modal.querySelector('.inv-wall-modal-title');
            // Hoist the modal to <body> for the same reason as the geo
            // panel — an ancestor's residual transform breaks position:fixed.
            if (modal && document.body) document.body.appendChild(modal);

            // city.id → display name, derived from the geo CITIES list at
            // top of this script. Fallback to upper-cased id if missing.
            var CITY_NAME = (function () {
              var m = {};
              if (typeof CITIES !== 'undefined' && CITIES.length) {
                CITIES.forEach(function (c) { m[c.id] = c.name; });
              }
              return m;
            })();
            function cityLabel (id) {
              return CITY_NAME[id] || (id ? id.toUpperCase() : '');
            }

            // role abbreviation, same rules as the geo side panel
            function shortenRole (role) {
              return (role || '')
                .replace(/Machine Learning/gi, 'ML')
                .replace(/\bVice President\b/g, 'VP')
                .replace(/\bAssistant Vice President\b/g, 'AVP');
            }

            function detailCardHTML (inv, focusedName) {
              var isFocused = focusedName && inv.name === focusedName;
              var coLogo = logoURL(inv.company);
              var bio = bioFor(inv.name);
              var role = inv.role ? shortenRole(inv.role) : '';
              // Build the role line out of three spans so CSS can render
              // it inline (variant A) or as two lines with the company
              // wrapping below the title (variant B).
              var roleLine = '';
              if (role && inv.company) {
                roleLine = '<span class="inv-wall-modal-mcard-role-title">' + role + '</span>' +
                           '<span class="inv-wall-modal-mcard-role-sep"> at </span>' +
                           '<span class="inv-wall-modal-mcard-role-co">' + inv.company + '</span>';
              } else if (role) {
                roleLine = '<span class="inv-wall-modal-mcard-role-title">' + role + '</span>';
              } else if (inv.company) {
                roleLine = '<span class="inv-wall-modal-mcard-role-co">' + inv.company + '</span>';
              }
              // City display name (used by variant B).
              var cityName = (CITY_NAME && CITY_NAME[inv.city]) || '';
              return (
                '<div class="inv-wall-modal-mcard' + (isFocused ? ' is-focused' : '') +
                    '" data-investor-name="' + inv.name.replace(/"/g, '&quot;') + '">' +
                  '<div class="inv-wall-modal-mcard-left">' +
                    '<div class="inv-wall-modal-mcard-photo-wrap">' +
                      '<img class="inv-wall-modal-mcard-photo" loading="lazy" alt="" src="' + cldUrl(inv.photo || '', 192) + '">' +
                      (coLogo ? '<img class="inv-wall-modal-mcard-flag" loading="lazy" alt="' + (inv.company || '') + '" src="' + coLogo + '">' : '') +
                    '</div>' +
                  '</div>' +
                  '<div class="inv-wall-modal-mcard-body">' +
                    '<div class="inv-wall-modal-mcard-name">' + inv.name + '</div>' +
                    (bio ? '<div class="inv-wall-modal-mcard-bio inv-wall-modal-mcard-bio-inline">' + bio + '</div>' : '') +
                    (roleLine ? '<div class="inv-wall-modal-mcard-role">' + roleLine + '</div>' : '') +
                    (cityName ? '<div class="inv-wall-modal-mcard-loc">' + cityName + '</div>' : '') +
                  '</div>' +
                  (bio ? '<div class="inv-wall-modal-mcard-bio inv-wall-modal-mcard-bio-bottom">' + bio + '</div>' : '') +
                  (inv.linkedin
                    ? '<a class="inv-wall-modal-mcard-li" href="' + inv.linkedin + '" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">' + LINKEDIN_ICON + '</a>'
                    : '') +
                '</div>'
              );
            }

            function groupCount (groupId) {
              return INVESTORS.filter(function (inv) { return inv.tag === groupId; }).length;
            }

            function renderTabs (activeGroupId) {
              modalTabs.innerHTML = GROUPS.map(function (g) {
                var n = groupCount(g.id);
                return (
                  '<button type="button" class="inv-wall-modal-tab" role="tab" data-wall-modal-tab="' + g.id + '" aria-selected="' + (g.id === activeGroupId ? 'true' : 'false') + '">' +
                    '<span>' + g.label + '</span>' +
                    '<span class="inv-wall-modal-tab-count">' + n + '</span>' +
                  '</button>'
                );
              }).join('');
            }

            function renderBody (groupId, focusedName, focusedLaneId) {
              var g = GROUPS.filter(function (x) { return x.id === groupId; })[0];
              if (!g) { modalBody.innerHTML = ''; return; }
              var laneHtml = g.lanes.map(function (lane) {
                var members = INVESTORS.filter(function (inv) {
                  return inv.tag === g.id && WALL_LANE[inv.name] === lane.id;
                });
                if (!members.length) return '';
                return (
                  '<section class="inv-wall-modal-lane" data-lane-id="' + lane.id + '">' +
                    '<div class="inv-wall-modal-lane-label">' +
                      '<span>' + lane.label + '</span>' +
                    '</div>' +
                    '<div class="inv-wall-modal-cards">' +
                      members.map(function (inv) { return detailCardHTML(inv, focusedName); }).join('') +
                    '</div>' +
                  '</section>'
                );
              }).join('');
              modalBody.innerHTML = laneHtml;
              modalBody.scrollTop = 0;
              // If the user clicked a lane column on the wall, scroll the
              // modal so that lane's sticky label snaps into the pinned
              // position at the top of the body. (Skipped when
              // focusedName is set — the card-focus logic below handles
              // its own scroll.)
              if (focusedLaneId && !focusedName) {
                var laneEl = modalBody.querySelector('[data-lane-id="' + focusedLaneId + '"]');
                if (laneEl) {
                  var bodyTop2 = modalBody.getBoundingClientRect().top;
                  var laneTop2 = laneEl.getBoundingClientRect().top;
                  // +1 so the previous lane's sticky label cleanly hands
                  // off to this lane's label.
                  modalBody.scrollTop = Math.max(0, laneTop2 - bodyTop2 + 1);
                }
              }
              if (focusedName) {
                var focused = modalBody.querySelector('.inv-wall-modal-mcard.is-focused');
                if (focused) {
                  // The lane label is position:sticky at the top of the
                  // modal body. Park the card's TOP edge just below the
                  // sticky band (plus a small breathing gap) so the full
                  // card is visible top-to-bottom — no clipping under
                  // the heading.
                  var lane = focused.closest('.inv-wall-modal-lane');
                  var label = lane ? lane.querySelector('.inv-wall-modal-lane-label') : null;
                  var stickyH = label
                    ? label.offsetHeight + parseFloat(getComputedStyle(label).marginBottom || '0')
                    : 40;
                  var bodyTop = modalBody.getBoundingClientRect().top;
                  var cardTop = focused.getBoundingClientRect().top;
                  var relativeTop = cardTop - bodyTop + modalBody.scrollTop;
                  var target = relativeTop - stickyH - 12;
                  if (target < 0) target = 0;
                  modalBody.scrollTop = target;
                  // Fade the orange highlight after ~3.5s so the card
                  // doesn't stay loudly selected forever.
                  clearTimeout(focusFadeTimer);
                  focusFadeTimer = setTimeout(function () {
                    focused.classList.remove('is-focused');
                  }, 3500);
                }
              }
            }
            var focusFadeTimer = null;

            var activeTab = null;
            function openModal (groupId, focusedName, focusedLaneId) {
              if (!modal) return;
              activeTab = groupId || 'founder';
              // Show the modal first so layout is real; renderBody needs
              // the body's clientHeight + offsetTop measurements to be
              // valid in order to center the focused card on open.
              modal.hidden = false;
              if (window.__invLockBody) window.__invLockBody('inv-wall-modal-open');
              else document.body.classList.add('inv-wall-modal-open');
              renderTabs(activeTab);
              renderBody(activeTab, focusedName, focusedLaneId);
              // Focus close button so Escape works immediately + a11y
              var closeBtn = modal.querySelector('.inv-wall-modal-close');
              if (closeBtn) closeBtn.focus();
            }
            function closeModal () {
              if (!modal) return;
              modal.hidden = true;
              if (window.__invUnlockBody) window.__invUnlockBody('inv-wall-modal-open');
              else document.body.classList.remove('inv-wall-modal-open');
            }
            function switchTab (newGroupId) {
              if (newGroupId === activeTab) return;
              activeTab = newGroupId;
              modalTabs.querySelectorAll('.inv-wall-modal-tab').forEach(function (btn) {
                btn.setAttribute('aria-selected', btn.getAttribute('data-wall-modal-tab') === newGroupId ? 'true' : 'false');
              });
              renderBody(newGroupId);
            }

            // Card-variant toggle in the modal header.
            (function () {
              var card = modal && modal.querySelector('.inv-wall-modal-card');
              var toggle = modal && modal.querySelector('.inv-wall-modal-variant');
              if (!card || !toggle) return;
              toggle.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-mcard-variant]');
                if (!btn) return;
                toggle.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-on'); });
                btn.classList.add('is-on');
                card.setAttribute('data-mcard-variant', btn.getAttribute('data-mcard-variant'));
              });
            })();

            // ─── Wire up clicks on wall ────────────────────────────
            // Three click targets, in priority order:
            //   1. Single card → open modal focused on that investor.
            //   2. Lane column (AI / Engineering / Product / …) → open
            //      modal scrolled to that lane within the group.
            //   3. Group block (Founders / Investors / Operators) →
            //      open modal on that group's tab.
            wallEl.addEventListener('click', function (e) {
              var card = e.target.closest('.inv-wall2-card');
              if (card) {
                var name  = card.getAttribute('data-investor-name');
                var match = INVESTORS.filter(function (i) { return i.name === name; })[0];
                if (match) openModal(match.tag, name);
                e.stopPropagation();
                return;
              }
              var lane = e.target.closest('.inv-wall2-lane');
              if (lane && !lane.classList.contains('is-empty')) {
                var groupEl = lane.closest('.inv-wall2-group');
                if (groupEl) {
                  openModal(groupEl.getAttribute('data-group-id'), null, lane.getAttribute('data-lane-id'));
                }
                e.stopPropagation();
                return;
              }
              var group = e.target.closest('.inv-wall2-group');
              if (group) {
                openModal(group.getAttribute('data-group-id'));
              }
            });
            wallEl.addEventListener('keydown', function (e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var lane = e.target.closest('.inv-wall2-lane');
              if (lane && !lane.classList.contains('is-empty')) {
                e.preventDefault();
                var groupEl = lane.closest('.inv-wall2-group');
                if (groupEl) {
                  openModal(groupEl.getAttribute('data-group-id'), null, lane.getAttribute('data-lane-id'));
                }
                return;
              }
              var group = e.target.closest('.inv-wall2-group');
              if (group) {
                e.preventDefault();
                openModal(group.getAttribute('data-group-id'));
              }
            });

            // ─── Wire up modal close + tabs ────────────────────────
            if (modal) {
              modal.addEventListener('click', function (e) {
                if (e.target.closest('[data-wall-modal-close]')) {
                  closeModal();
                }
                var tab = e.target.closest('[data-wall-modal-tab]');
                if (tab) switchTab(tab.getAttribute('data-wall-modal-tab'));
              });
              document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && !modal.hidden) closeModal();
              });
            }
          })();
        })();
      });
