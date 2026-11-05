@php
    // How often the page asks the server "are you back?". Follows Retry-After when there is one, but stays between 10 and 60 seconds.
    $interval = max(10, min(60, (int) ($retryAfter ?? 15)));
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#f8fafc">
    <title>{{ config('app.name') }} — Maintenance</title>
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <noscript><meta http-equiv="refresh" content="30"></noscript>
    <style>
        :root {
            --navy: oklch(0.34 0.035 255);
            --navy-deep: oklch(0.26 0.035 255);
            --accent: oklch(0.6 0.11 250);
            --ink: oklch(0.25 0.03 255);
            --muted: oklch(0.52 0.02 255);
            --line: oklch(0.91 0.012 255);
            --card: oklch(1 0 0);
            --bg: oklch(0.985 0.004 255);
            --tint: oklch(0.34 0.035 255 / 0.08);
            --ok: oklch(0.62 0.15 150);
            --radius: 1rem;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100svh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            position: relative;
            overflow-x: hidden;
            font-family: Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 1rem;
            line-height: 1.5;
            color: var(--ink);
            background: var(--bg);
            -webkit-font-smoothing: antialiased;
        }

        /* Soft glows and a fading grid behind everything */
        .backdrop { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .backdrop::before, .backdrop::after { content: ""; position: absolute; border-radius: 9999px; filter: blur(64px); }
        .backdrop::before { top: -10rem; left: -8rem; width: 30rem; height: 30rem; background: oklch(0.85 0.04 255 / 0.55); }
        .backdrop::after { right: -8rem; bottom: -12rem; width: 30rem; height: 30rem; background: oklch(0.88 0.06 245 / 0.45); }
        .grid {
            position: absolute; inset: 0;
            background-image: linear-gradient(to right, oklch(0.34 0.035 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.34 0.035 255 / 0.06) 1px, transparent 1px);
            background-size: 48px 48px;
            -webkit-mask-image: radial-gradient(ellipse at center, #000, transparent 75%);
            mask-image: radial-gradient(ellipse at center, #000, transparent 75%);
        }

        .shell { position: relative; z-index: 1; width: 100%; max-width: 40rem; animation: rise 0.7s ease both; }

        /* Top row: status badge and live clock */
        .top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .badge {
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.4rem 0.8rem;
            border-radius: 0.6rem;
            border: 1px solid var(--line);
            background: var(--card);
            font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.02em;
            color: var(--navy);
            box-shadow: 0 1px 2px oklch(0.25 0.035 255 / 0.05);
        }
        .dot { position: relative; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--accent); }
        .dot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--accent); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .clock { font-size: 0.8125rem; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
        .clock strong { color: var(--ink); font-weight: 700; }

        .card {
            border-radius: calc(var(--radius) + 0.25rem);
            border: 1px solid var(--line);
            background: var(--card);
            box-shadow: 0 20px 50px -24px oklch(0.25 0.035 255 / 0.25), 0 1px 2px oklch(0.25 0.035 255 / 0.05);
            overflow: hidden;
        }

        /* Illustration */
        .hero { position: relative; padding: 1.75rem 1.5rem 0.5rem; text-align: center; background: linear-gradient(180deg, var(--tint), transparent); }
        .art { width: 11.5rem; height: auto; display: block; margin: 0 auto 0.5rem; overflow: visible; }
        .steam path { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; opacity: 0; animation: steam 3.2s ease-in-out infinite; }
        .steam path:nth-child(2) { animation-delay: 0.8s; }
        .steam path:nth-child(3) { animation-delay: 1.6s; }
        .cup { animation: bob 4s ease-in-out infinite; transform-origin: center; }
        .gear { transform-box: fill-box; transform-origin: center; animation: spin 14s linear infinite; }

        h1 {
            margin: 0 0 0.5rem;
            font-size: clamp(1.6rem, 5vw, 2.1rem);
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--navy);
        }
        h1 span { background: linear-gradient(90deg, var(--navy), var(--accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .lead { margin: 0 auto; max-width: 30rem; font-size: 1rem; color: var(--muted); }

        /* Indeterminate progress bar */
        .progress { position: relative; height: 0.375rem; margin: 1.5rem 0 0; background: var(--tint); overflow: hidden; }
        .progress::before { content: ""; position: absolute; top: 0; bottom: 0; width: 35%; border-radius: 9999px; background: linear-gradient(90deg, transparent, var(--accent), var(--navy), transparent); animation: slide 1.8s ease-in-out infinite; }

        .body { padding: 1.25rem 1.5rem 1.5rem; }

        /* What is happening */
        .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin: 0 0 1.25rem; padding: 0; list-style: none; }
        .tile { padding: 0.9rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--bg); }
        .tile svg { display: block; width: 2.25rem; height: 2.25rem; padding: 0.5rem; margin-bottom: 0.6rem; border-radius: 0.5rem; background: var(--tint); color: var(--navy); }
        .tile h2 { margin: 0 0 0.15rem; font-size: 0.9375rem; font-weight: 700; color: var(--ink); }
        .tile p { margin: 0; font-size: 0.8125rem; line-height: 1.4; color: var(--muted); }

        /* Automatic check */
        .check { display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 1rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--card); }
        .check-text { flex: 1; min-width: 0; }
        .check-title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--ink); }
        .check-sub { margin: 0.1rem 0 0; font-size: 0.8125rem; color: var(--muted); font-variant-numeric: tabular-nums; }
        .bar { height: 0.25rem; margin-top: 0.55rem; border-radius: 9999px; background: var(--tint); overflow: hidden; }
        .bar i { display: block; height: 100%; width: 100%; border-radius: inherit; background: var(--navy); transition: width 1s linear; }
        button.retry {
            flex-shrink: 0;
            padding: 0.6rem 1rem;
            border: 0; border-radius: 0.6rem;
            font: inherit; font-size: 0.875rem; font-weight: 700;
            color: #fff; background: var(--navy);
            cursor: pointer;
            transition: background 0.15s, transform 0.1s, opacity 0.15s;
        }
        button.retry:hover { background: var(--navy-deep); }
        button.retry:active { transform: scale(0.97); }
        button.retry:disabled { opacity: 0.55; cursor: progress; }

        /* Staff tip */
        .tip { display: flex; gap: 0.7rem; margin-top: 1rem; padding: 0.8rem 1rem; border-radius: 0.75rem; background: oklch(0.97 0.03 85); border: 1px solid oklch(0.9 0.06 85); font-size: 0.8125rem; color: oklch(0.38 0.07 70); }
        .tip svg { flex-shrink: 0; width: 1.1rem; height: 1.1rem; margin-top: 0.1rem; }
        .tip strong { color: oklch(0.32 0.08 65); }

        /* Facts */
        .facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--line); background: var(--bg); }
        .fact { padding: 0.8rem 1rem; border-right: 1px solid var(--line); }
        .fact:last-child { border-right: 0; }
        .fact dt { margin: 0; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
        .fact dd { margin: 0.1rem 0 0; font-size: 0.875rem; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .fact dd.live { display: flex; align-items: center; gap: 0.4rem; }
        .fact dd.live::before { content: ""; width: 0.45rem; height: 0.45rem; border-radius: 9999px; background: var(--accent); }

        .brand { margin: 1.25rem 0 0; text-align: center; font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }

        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes steam { 0% { opacity: 0; transform: translateY(8px); } 40% { opacity: 0.7; } 100% { opacity: 0; transform: translateY(-14px); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slide { 0% { left: -40%; } 100% { left: 105%; } }

        @media (max-width: 36rem) {
            .tiles { grid-template-columns: 1fr; }
            .tile { display: flex; gap: 0.75rem; align-items: flex-start; }
            .tile svg { margin: 0; flex-shrink: 0; }
            .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .fact:nth-child(2) { border-right: 0; }
            .fact:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
            .check { flex-wrap: wrap; }
            button.retry { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation: none !important; transition: none !important; }
            .steam path { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="backdrop" aria-hidden="true"><div class="grid"></div></div>

    <main class="shell">
        <div class="top">
            <div class="badge" role="status">
                <span class="dot" aria-hidden="true"></span>
                Scheduled maintenance
            </div>
            <div class="clock" aria-hidden="true">
                <strong id="clock">--:--</strong><br>
                <span id="date"></span>
            </div>
        </div>

        <div class="card">
            <section class="hero">
                <svg class="art" viewBox="0 0 220 170" fill="none" aria-hidden="true">
                    <ellipse cx="108" cy="150" rx="70" ry="9" fill="oklch(0.34 0.035 255 / 0.1)" />

                    <g class="steam">
                        <path d="M86 56 C80 46, 92 40, 86 28" />
                        <path d="M108 52 C102 42, 114 36, 108 22" />
                        <path d="M130 56 C124 46, 136 40, 130 28" />
                    </g>

                    <g class="cup">
                        <path d="M62 66 H154 V104 C154 130 134 144 108 144 C82 144 62 130 62 104 Z" fill="oklch(0.34 0.035 255)" />
                        <path d="M154 78 H164 C176 78 180 90 174 100 C170 108 162 110 154 110" stroke="oklch(0.34 0.035 255)" stroke-width="9" stroke-linecap="round" />
                        <ellipse cx="108" cy="66" rx="46" ry="8" fill="oklch(0.6 0.11 250)" />
                        <path d="M72 96 C72 116 86 130 104 133" stroke="oklch(1 0 0 / 0.22)" stroke-width="5" stroke-linecap="round" />
                    </g>

                    <g class="gear" transform="translate(172 38)">
                        <circle r="17" stroke="oklch(0.6 0.11 250)" stroke-width="7" stroke-dasharray="7.2 7.2" />
                        <circle r="12" fill="oklch(0.6 0.11 250)" />
                        <circle r="5" fill="oklch(0.985 0.004 255)" />
                    </g>
                </svg>

                <h1>We&rsquo;ll be <span>back shortly</span></h1>
                <p class="lead">
                    {{ config('app.name') }} is taking a short break while we apply updates.
                    Your orders and data are safe&mdash;please try again in a few minutes.
                </p>

                <div class="progress" role="progressbar" aria-label="Maintenance in progress" aria-valuetext="In progress"></div>
            </section>

            <div class="body">
                <ul class="tiles">
                    <li class="tile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
                        <div>
                            <h2>Your data is safe</h2>
                            <p>Orders, stock and sales stay exactly as they were.</p>
                        </div>
                    </li>
                    <li class="tile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>
                        <div>
                            <h2>Updates in progress</h2>
                            <p>Installing improvements and running checks.</p>
                        </div>
                    </li>
                    <li class="tile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        <div>
                            <h2>Back soon</h2>
                            <p>This page reopens the app by itself when we are done.</p>
                        </div>
                    </li>
                </ul>

                <div class="check">
                    <div class="check-text">
                        <p class="check-title" id="checkTitle">Checking automatically</p>
                        <p class="check-sub"><span id="checkSub">Next check in {{ $interval }}s</span> &middot; last checked <span id="last">just now</span></p>
                        <div class="bar" aria-hidden="true"><i id="bar"></i></div>
                    </div>
                    <button type="button" class="retry" id="retry">Check now</button>
                </div>

                <div class="tip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.3 1 2.3h6c0-1 .3-1.7 1-2.3A7 7 0 0 0 12 2Z"/></svg>
                    <p style="margin:0"><strong>Tip for staff:</strong> keep a paper note of any orders taken while the system is down, so nothing is missed once it&rsquo;s back.</p>
                </div>
            </div>

            <dl class="facts">
                <div class="fact"><dt>Status</dt><dd class="live">Maintenance</dd></div>
                <div class="fact"><dt>Rechecks</dt><dd>Every {{ $interval }}s</dd></div>
                <div class="fact"><dt>Attempts</dt><dd id="attempts">0</dd></div>
                <div class="fact"><dt>Code</dt><dd>503</dd></div>
            </dl>
        </div>

        <p class="brand">{{ config('app.name') }}</p>
    </main>

    <script>
        (function () {
            var interval = {{ $interval }};
            var left = interval;
            var attempts = 0;
            var checking = false;

            var clock = document.getElementById('clock');
            var date = document.getElementById('date');
            var bar = document.getElementById('bar');
            var sub = document.getElementById('checkSub');
            var title = document.getElementById('checkTitle');
            var last = document.getElementById('last');
            var count = document.getElementById('attempts');
            var button = document.getElementById('retry');

            function time(d) {
                return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
            }

            function paint() {
                var now = new Date();
                clock.textContent = time(now);
                date.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            }

            function render() {
                bar.style.width = (checking ? 100 : (left / interval) * 100) + '%';
                sub.textContent = checking ? 'Checking now…' : 'Next check in ' + left + 's';
            }

            function done(online) {
                checking = false;
                button.disabled = false;
                left = interval;
                attempts += 1;
                count.textContent = attempts;
                last.textContent = time(new Date());
                title.textContent = online ? 'We are back!' : 'Checking automatically';
                render();
            }

            function check() {
                if (checking) return;

                checking = true;
                button.disabled = true;
                title.textContent = 'Checking…';
                render();

                fetch(window.location.href, { cache: 'no-store', credentials: 'same-origin' })
                    .then(function (response) {
                        // Anything but 503 means the app is serving pages again.
                        if (response.status !== 503) {
                            done(true);
                            window.location.reload();

                            return;
                        }

                        done(false);
                    })
                    .catch(function () {
                        // No connection or server still restarting: keep waiting.
                        done(false);
                    });
            }

            button.addEventListener('click', check);

            setInterval(function () {
                paint();

                if (checking) return;

                left -= 1;

                if (left <= 0) {
                    check();
                } else {
                    render();
                }
            }, 1000);

            paint();
            render();
        })();
    </script>
</body>
</html>