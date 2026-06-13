<?php
declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';
require_once __DIR__ . '/core/solicitudes_repository.php';

function whitelist_h(string|int|float|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$count = 0;
try {
    $count = solicitudes_count_active();
} catch (Throwable $exception) {
    error_log('Whitelist count failed: ' . $exception->getMessage());
}

$csrfToken = csrf_token();
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lista de acceso anticipado | Falles360</title>
<meta name="description" content="Apuntate al acceso anticipado de Falles360 y entra antes que nadie al mapa, agenda, rutas y Pasaporte Fallero de Fallas 2027.">
<style>
  :root {
    --orange: #f05a28;
    --orange-dark: #c03e15;
    --dark: #1a110a;
    --cream: #f7f4f1;
    --yellow: #ffd32a;
    --white: #ffffff;
    --muted: rgba(26, 18, 8, 0.56);
    --muted-dark: rgba(255, 255, 255, 0.62);
    --line: rgba(232, 70, 10, 0.12);
    --shadow: 0 20px 60px rgba(232, 70, 10, 0.24);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    background: var(--white);
    color: var(--dark);
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    overflow-x: hidden;
  }

  a { color: inherit; }

  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 16px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(232, 70, 10, 0.1);
  }

  .logo {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: 0.04em;
    text-decoration: none;
    color: var(--dark);
  }

  .logo span { color: var(--orange); }

  .nav-back {
    font-size: 13px;
    font-weight: 700;
    color: rgba(26, 18, 8, 0.4);
    text-decoration: none;
    transition: color .2s;
    white-space: nowrap;
  }

  .nav-back:hover { color: var(--orange); }

  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120px 24px 80px;
    position: relative;
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 760px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(232, 70, 10, 0.1);
    border: 1px solid rgba(232, 70, 10, 0.3);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 24px;
    animation: fadeUp .6s ease both;
  }

  .pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse 1.5s ease-in-out infinite;
  }

  h1 {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: clamp(48px, 8vw, 86px);
    line-height: .95;
    text-transform: uppercase;
    text-align: center;
    max-width: 760px;
    margin-bottom: 18px;
    animation: fadeUp .7s ease .1s both;
  }

  h1 em { color: var(--orange); font-style: normal; }

  .subtitle {
    font-size: 16px;
    color: var(--muted);
    text-align: center;
    max-width: 480px;
    line-height: 1.65;
    margin-bottom: 40px;
    animation: fadeUp .7s ease .2s both;
  }

  .subtitle strong { color: var(--dark); }

  .counter-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
    animation: fadeUp .7s ease .25s both;
  }

  .avatars { display: flex; }

  .avatars span {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--white);
    margin-left: -9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.05em;
  }

  .avatars span:first-child { margin-left: 0; background: #fde8e0; }
  .avatars span:nth-child(2) { background: #fcd5c6; }
  .avatars span:nth-child(3) { background: #fef3cd; }

  .counter-text {
    font-size: 13px;
    color: rgba(26, 18, 8, 0.5);
  }

  .counter-text strong { color: var(--orange); }

  .form-card {
    background: var(--white);
    border: 2px solid rgba(240, 90, 40, 0.22);
    border-radius: 20px;
    padding: 36px 40px;
    width: 100%;
    max-width: 480px;
    box-shadow: var(--shadow);
    animation: fadeUp .7s ease .3s both;
  }

  .form-intro {
    margin-bottom: 18px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(240, 90, 40, 0.14);
    background: linear-gradient(135deg, #fff8f4 0%, #fff2ea 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
  }

  .form-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--orange-dark);
  }

  .form-kicker::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--orange);
  }

  .form-intro p {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(26, 17, 10, 0.64);
  }

  .form-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }

  .form-badges span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(26, 17, 10, 0.04);
    border: 1px solid rgba(26, 17, 10, 0.06);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 17, 10, 0.72);
  }

  .form-card label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 17, 10, 0.72);
    margin-bottom: 8px;
  }

  .form-group { margin-bottom: 16px; }

  .form-group input {
    width: 100%;
    background: #fff8f4;
    border: 1.5px solid rgba(240, 90, 40, 0.24);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 15px;
    font-family: inherit;
    color: var(--dark);
    outline: none;
    transition: border-color .2s, background .2s;
  }

  .form-group input::placeholder { color: rgba(26, 17, 10, 0.38); }

  .form-group input:focus {
    border-color: var(--orange);
    background: var(--white);
    box-shadow: 0 0 0 4px rgba(240, 90, 40, 0.08);
  }

  .btn-submit {
    width: 100%;
    margin-top: 8px;
    padding: 16px;
    background: linear-gradient(135deg, var(--orange) 0%, #ff7a3d 100%);
    color: var(--white);
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all .2s;
    box-shadow: 0 16px 30px -18px rgba(240, 90, 40, 0.9);
  }

  .btn-submit:hover {
    background: linear-gradient(135deg, #ff6730 0%, #ff8b5d 100%);
    transform: translateY(-2px);
    box-shadow: 0 22px 34px -18px rgba(240, 90, 40, 0.95);
  }

  .btn-submit:disabled {
    opacity: .6;
    cursor: not-allowed;
    transform: none;
  }

  .form-note {
    text-align: center;
    font-size: 12px;
    color: rgba(26, 17, 10, 0.52);
    margin-top: 14px;
    line-height: 1.5;
  }

  .form-note a {
    color: var(--orange-dark);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .form-status {
    display: none;
    margin-top: 14px;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
  }

  .form-status--error {
    display: block;
    background: #fff1ea;
    color: var(--orange-dark);
  }

  .form-status--ok {
    display: block;
    background: #eef9f3;
    color: #1f7a4f;
  }

  .success-state {
    display: none;
    text-align: center;
    padding: 10px 0;
    animation: fadeUp .5s ease both;
  }

  .success-icon {
    width: 64px;
    height: 64px;
    background: #fff1ea;
    border: 2px solid rgba(240, 90, 40, 0.18);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 900;
    color: var(--orange);
    margin: 0 auto 18px;
  }

  .success-state h2 {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 36px;
    text-transform: uppercase;
    color: var(--dark);
    margin-bottom: 10px;
    line-height: 1;
  }

  .success-state h2 em { color: var(--orange); font-style: normal; }

  .success-state p {
    color: rgba(26, 17, 10, 0.62);
    font-size: 14px;
    line-height: 1.6;
  }

  .perks {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    max-width: 480px;
    width: 100%;
    margin-top: 24px;
    animation: fadeUp .7s ease .4s both;
  }

  .perk {
    background: var(--cream);
    border: 1.5px solid rgba(232, 70, 10, 0.12);
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
  }

  .perk-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-width: 46px;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--white);
    color: var(--orange);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .perk-title {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 13px;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 4px;
  }

  .perk-desc {
    font-size: 11px;
    color: rgba(26, 18, 8, 0.45);
    line-height: 1.4;
  }

  .countdown-wrap {
    margin-top: 40px;
    text-align: center;
    animation: fadeUp .7s ease .5s both;
  }

  .countdown-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(26, 18, 8, 0.3);
    margin-bottom: 14px;
  }

  .countdown {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .countdown-item {
    background: var(--cream);
    border: 1.5px solid rgba(232, 70, 10, 0.15);
    border-radius: 10px;
    padding: 12px 18px;
    min-width: 64px;
    text-align: center;
  }

  .countdown-num {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 32px;
    color: var(--orange);
    line-height: 1;
  }

  .countdown-unit {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 18, 8, 0.35);
    margin-top: 4px;
  }

  .section-stats {
    background: var(--orange);
    padding: 48px 24px;
  }

  .stats-inner {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .stats-inner > div {
    text-align: left;
    background: rgba(255, 252, 249, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 24px;
    padding: 24px 22px 22px;
    box-shadow: 0 18px 34px rgba(160, 49, 10, 0.14);
  }

  .stat-num {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 56px;
    color: var(--white);
    line-height: 1;
  }

  .stat-label {
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.96);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stat-copy {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.78);
    max-width: 22ch;
  }

  .section-preview {
    background: var(--dark);
    padding: 80px 24px;
    position: relative;
    overflow: hidden;
  }

  .section-preview-inner {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 14px;
  }

  .section-title {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: clamp(36px, 5vw, 54px);
    line-height: .95;
    text-transform: uppercase;
    color: var(--white);
    margin-bottom: 18px;
  }

  .section-title em { color: var(--orange); font-style: normal; }

  .section-body {
    font-size: 15px;
    color: var(--muted-dark);
    line-height: 1.7;
    margin-bottom: 28px;
    max-width: 34rem;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 20px 20px 18px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: linear-gradient(180deg, rgba(255,255,255,0.095) 0%, rgba(255,255,255,0.055) 100%);
    box-shadow: 0 18px 34px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(8px);
  }

  .feature-item:first-child {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
  }

  .feature-icon {
    min-width: 62px;
    height: 34px;
    border-radius: 999px;
    background: rgba(232, 70, 10, 0.2);
    border: 1px solid rgba(232, 70, 10, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff2ea;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .feature-text-title {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-weight: 800;
    font-size: 17px;
    text-transform: uppercase;
    color: var(--white);
    margin-bottom: 8px;
    line-height: 1.2;
    letter-spacing: 0.015em;
  }

  .feature-text-desc {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.65;
    max-width: 34ch;
  }

  .feature-text-desc-fix + .feature-text-desc {
    display: none;
  }

  .phone-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    min-height: 660px;
  }

  .phone-outer {
    width: 292px;
    border-radius: 42px;
    background: linear-gradient(180deg, #0b1730 0%, #08101f 100%);
    padding: 10px;
    box-shadow: 0 40px 80px rgba(232, 70, 10, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08);
    position: relative;
  }

  .phone-outer::before {
    content: "";
    position: absolute;
    inset: -34px;
    z-index: 0;
    background: radial-gradient(circle at 50% 45%, rgba(232,70,10,0.42) 0%, rgba(232,70,10,0.16) 28%, rgba(232,70,10,0) 70%);
    filter: blur(18px);
    pointer-events: none;
  }

  .phone-screen {
    border-radius: 34px;
    overflow: hidden;
    background: #eef2f4;
    border: 4px solid rgba(248, 250, 252, 0.98);
    aspect-ratio: 9 / 19.5;
    position: relative;
    z-index: 1;
  }

  .phone-notch {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 74px;
    height: 7px;
    background: #293446;
    border-radius: 0 0 8px 8px;
    z-index: 10;
  }

  .app-ui {
    position: relative;
    height: 100%;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.58) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255,255,255,0.58) 1px, transparent 1px),
      linear-gradient(180deg, #f9fbfc 0%, #edf2f4 100%);
    background-size: 58px 58px, 58px 58px, auto;
  }

  .app-topbar {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 12px;
    z-index: 3;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 18px;
    background: rgba(255,255,255,0.96);
    box-shadow: 0 10px 28px rgba(26,17,10,0.08);
    backdrop-filter: blur(10px);
  }

  .app-topbar::after {
    content: "";
    flex: 1;
  }

  .app-chip {
    height: 32px;
    border-radius: 18px;
    background: transparent;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--dark);
    font-size: 10px;
    font-weight: 800;
  }

  .app-chip.logo {
    justify-content: flex-start;
    padding: 0 2px 0 4px;
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  .app-chip.logo span { color: var(--orange); }

  .app-chip.gps,
  .app-chip.center,
  .app-chip.avatar,
  .app-chip.clock {
    gap: 6px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(26,17,10,0.08);
    background: rgba(255,255,255,0.7);
  }

  .chip-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(240,90,40,0.12);
    color: var(--orange);
    font-size: 8px;
    font-weight: 900;
  }

  .avatar-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #d97a3a, #1a110a);
    border: 2px solid rgba(255,255,255,0.92);
    box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  }

  .map-canvas {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(238,242,244,1) 0 81%, #d7dee2 81% 100%),
      radial-gradient(circle at 84% 32%, rgba(191,205,215,0.74), transparent 18%),
      radial-gradient(circle at 18% 72%, rgba(205,214,219,0.64), transparent 15%),
      radial-gradient(circle at 40% 45%, rgba(211,219,223,0.72), transparent 13%);
  }

  .map-canvas::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(112deg, transparent 0 61.5%, rgba(195,206,214,0.92) 61.5% 100%),
      radial-gradient(circle at 24% 18%, rgba(220,225,228,0.95) 0 20%, transparent 20%),
      radial-gradient(circle at 26% 66%, rgba(220,225,228,0.82) 0 16%, transparent 16%);
    opacity: 0.72;
  }

  .map-canvas::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255,255,255,0.45) 1px, transparent 1px);
    background-size: 88px 88px;
    opacity: 0.72;
  }

  .map-canvas .coast-line {
    position: absolute;
    top: -4%;
    right: 18.5%;
    width: 2px;
    height: 112%;
    background: rgba(255, 255, 255, 0.75);
    transform: rotate(11deg);
    transform-origin: top;
    box-shadow: 0 0 0 1px rgba(206, 214, 220, 0.5);
  }

  .road {
    position: absolute;
    background: rgba(255,255,255,0.84);
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(205,210,214,0.45);
  }

  .road.v1 { width: 2px; height: 100%; left: 58%; top: 0; transform: rotate(17deg); transform-origin: top; }
  .road.v2 { width: 2px; height: 76%; left: 32%; top: 10%; transform: rotate(10deg); transform-origin: top; }
  .road.h1 { height: 2px; width: 98%; left: 1%; top: 34%; }
  .road.h2 { height: 2px; width: 92%; left: 4%; top: 60%; }
  .road.h3 { height: 2px; width: 86%; left: 9%; top: 80%; }

  .map-label {
    position: absolute;
    color: rgba(111,121,129,0.92);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 0 rgba(255,255,255,0.52);
  }

  .cluster {
    position: absolute;
    min-width: 32px;
    height: 32px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    font-size: 10px;
    font-weight: 900;
    box-shadow: 0 10px 24px rgba(240,90,40,0.28);
    border: 3px solid rgba(255,255,255,0.78);
  }

  .cluster.orange { background: #ff7a45; color: #fff; }
  .cluster.yellow { background: #f7c83a; color: #6a4a00; box-shadow: 0 10px 24px rgba(255,211,42,0.32); }

  .map-fab {
    position: absolute;
    right: 12px;
    bottom: 72px;
    z-index: 4;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.98);
    box-shadow: 0 10px 24px rgba(26,17,10,0.14);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #73808a;
    font-size: 13px;
    font-weight: 900;
  }

  .map-fab-badge {
    position: absolute;
    right: -2px;
    top: -2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--orange);
    color: #fff;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(240,90,40,0.28);
  }

  .app-bottomnav {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 10px;
    z-index: 4;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 2px;
    padding: 10px 8px 8px;
    border-radius: 18px 18px 20px 20px;
    background: rgba(255,255,255,0.97);
    box-shadow: 0 -10px 30px rgba(26,17,10,0.1);
  }

  .nav-slot {
    text-align: center;
    color: rgba(26,17,10,0.44);
    font-size: 7px;
    font-weight: 700;
  }

  .nav-slot.active { color: var(--orange); }

  .nav-slot-icon {
    width: 24px;
    height: 24px;
    margin: 0 auto 4px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 900;
    background: rgba(26,17,10,0.05);
  }

  .nav-slot.active .nav-slot-icon {
    background: var(--orange);
    color: #fff;
  }

  .phone-badge {
    position: absolute;
    background: var(--white);
    border-radius: 12px;
    padding: 8px 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 11px;
    color: var(--dark);
    white-space: nowrap;
  }

  .phone-badge span { color: var(--orange); }
  .badge-left { left: -88px; top: 26%; }
  .badge-right { right: -98px; top: 54%; }

  .section-how {
    background: var(--cream);
    padding: 80px 24px;
  }

  .section-how-inner {
    max-width: 960px;
    margin: 0 auto;
  }

  .section-how h2,
  .section-cta h2 {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    line-height: .95;
    text-transform: uppercase;
  }

  .section-how h2 {
    font-size: clamp(36px, 5vw, 52px);
    color: var(--dark);
    margin-bottom: 10px;
  }

  .section-how h2 em,
  .section-cta h2 em { color: var(--orange); font-style: normal; }

  .section-how-sub {
    font-size: 15px;
    color: rgba(26, 18, 8, 0.5);
    margin-bottom: 48px;
    max-width: 560px;
    line-height: 1.6;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .step {
    position: relative;
    background: #fffdfb;
    border: 1px solid rgba(240,90,40,0.12);
    border-radius: 20px;
    padding: 22px 20px 20px;
    box-shadow: 0 18px 36px -32px rgba(26,17,10,0.32);
  }

  .step-num {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 56px;
    color: rgba(240, 90, 40, 0.12);
    line-height: 1;
    margin-bottom: -4px;
  }

  .step-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 70px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #fff1ea;
    color: var(--orange-dark);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .step-title {
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 20px;
    text-transform: uppercase;
    color: var(--dark);
    margin-bottom: 8px;
  }

  .step-desc {
    font-size: 13px;
    color: rgba(26, 18, 8, 0.5);
    line-height: 1.6;
  }

  .step-connector {
    position: absolute;
    top: 50%;
    right: -16px;
    transform: translateY(-50%);
    font-size: 20px;
    color: rgba(232, 70, 10, 0.3);
  }

  .section-cta {
    background: var(--dark);
    padding: 100px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .section-cta h2 {
    position: relative;
    z-index: 1;
    font-size: clamp(48px, 7vw, 80px);
    color: var(--white);
    margin-bottom: 16px;
  }

  .section-cta p {
    position: relative;
    z-index: 1;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.54);
    margin-bottom: 40px;
  }

  .cta-btn {
    display: inline-block;
    position: relative;
    z-index: 1;
    background: var(--orange);
    color: var(--white);
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 900;
    font-size: 20px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 18px 48px;
    border-radius: 12px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all .2s;
    box-shadow: 0 8px 30px rgba(232, 70, 10, 0.35);
  }

  .cta-btn:hover {
    background: var(--orange-dark);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(232, 70, 10, 0.45);
  }

  .cta-note {
    position: relative;
    z-index: 1;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 16px;
  }

  footer {
    background: var(--dark);
    text-align: center;
    padding: 24px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.22);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  footer a {
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .5; transform: scale(.85); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }

  @media (max-width: 960px) {
    .section-preview-inner {
      grid-template-columns: 1fr;
      gap: 40px;
    }

    .phone-wrap { order: -1; }
    .badge-left, .badge-right { display: none; }
    .stats-inner { grid-template-columns: 1fr; gap: 18px; }
  }

  @media (max-width: 768px) {
    nav { padding: 14px 20px; }
    .hero { padding: 108px 20px 64px; }
    .steps { grid-template-columns: 1fr; gap: 32px; }
    .step-connector { display: none; }
    .section-preview,
    .section-how,
    .section-cta { padding-left: 20px; padding-right: 20px; }
    .section-cta { padding-top: 84px; padding-bottom: 84px; }
  }

  @media (max-width: 600px) {
    .nav-back { font-size: 12px; }
    h1 { font-size: clamp(40px, 16vw, 62px); }
    .subtitle { font-size: 15px; }
    .counter-wrap {
      flex-direction: column;
      text-align: center;
      gap: 10px;
    }
    .form-card { padding: 28px 20px; }
    .perks {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .countdown {
      gap: 8px;
      width: 100%;
    }
    .countdown-item {
      min-width: 0;
      flex: 1;
      padding: 10px 8px;
    }
    .countdown-num { font-size: 26px; }
    .stat-num { font-size: 44px; }
    .stats-inner > div { padding: 20px 18px; }
    .cta-btn {
      width: 100%;
      max-width: 340px;
      padding-left: 24px;
      padding-right: 24px;
    }
    .phone-wrap { min-height: 600px; }
    .phone-outer { width: min(302px, 92vw); }
    .feature-item { gap: 12px; padding: 18px 15px; }
    .feature-icon { min-width: 58px; }
    .feature-text-title { font-size: 15px; }
    .feature-text-desc { font-size: 13px; line-height: 1.6; }
  }
</style>
</head>
<body>

<nav>
  <a href="./dist/index.html" class="logo">FALLES<span>360</span></a>
  <a href="./dist/index.html" class="nav-back">&larr; Volver a la app</a>
</nav>

<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(1200,60) scale(2.2)">
        <path d="M40,160 C18,130 0,100 12,62 C18,42 30,30 24,8 C42,28 36,52 52,38 C46,64 64,72 58,98 C72,76 76,50 64,22 C88,42 92,76 78,108 C92,88 98,62 88,36 C110,60 108,100 90,126 Z" fill="#E8460A" opacity="0.06"/>
      </g>
      <g transform="translate(-40,380) scale(1.5)">
        <path d="M30,120 C14,100 0,78 8,52 C12,36 20,26 16,10 C28,22 24,38 36,28 C32,46 46,52 42,70 C52,54 56,34 46,14 C64,30 66,56 56,76 C66,62 70,42 62,20 C78,40 76,68 62,88 Z" fill="#E8460A" opacity="0.05"/>
      </g>
      <radialGradient id="hero-glow" cx="50%" cy="60%">
        <stop offset="0%" stop-color="#E8460A" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#E8460A" stop-opacity="0"/>
      </radialGradient>
      <circle cx="720" cy="540" r="480" fill="url(#hero-glow)"/>
    </svg>
  </div>

  <div class="hero-content">
    <div class="pill"><span class="pill-dot"></span>Acceso anticipado | Fallas 2027</div>

    <h1>Se el primero<br>en entrar a<br><em>Falles360.</em></h1>

    <p class="subtitle">
      Apuntate ahora y consigue <strong>acceso prioritario</strong> antes del lanzamiento.
      Mapa, agenda, rutas y Pasaporte Fallero listos para marzo.
    </p>

    <div class="counter-wrap">
      <div class="avatars" aria-hidden="true">
        <span>MAP</span><span>VIP</span><span>GO</span>
      </div>
      <p class="counter-text"><strong id="counter-num"><?php echo whitelist_h($count); ?></strong> personas ya en la lista</p>
    </div>

    <div class="form-card" id="form-card">
      <form id="waitlist-form" novalidate>
        <div id="form-inner">
          <div class="form-intro">
            <div class="form-kicker">Acceso prioritario real</div>
            <p>Reservas tu sitio ahora y cuando abramos la entrada prioritaria te avisamos por correo con acceso directo.</p>
          </div>
          <div class="form-badges" aria-hidden="true">
            <span>Sin app store</span>
            <span>Email directo</span>
            <span>Reserva tu sitio</span>
          </div>
          <div class="form-group">
            <label for="input-name">Tu nombre</label>
            <input type="text" id="input-name" name="name" placeholder="Maria Garcia" autocomplete="given-name">
          </div>
          <div class="form-group">
            <label for="input-email">Tu email</label>
            <input type="email" id="input-email" name="email" placeholder="maria@email.com" autocomplete="email">
          </div>
          <button class="btn-submit" id="btn-submit" type="submit">Apuntarme a la lista</button>
          <p class="form-note">
            Sin spam. Sin tarjeta. Solo te avisamos cuando abra.
            <a href="./dist/privacy.html">Privacidad</a>
          </p>
          <div class="form-status" id="form-status" aria-live="polite"></div>
        </div>

        <div class="success-state" id="success-state">
          <div class="success-icon">OK</div>
          <h2>Ya estas<br><em>en la lista.</em></h2>
          <p>Te avisaremos antes que nadie. Mientras tanto, ya tienes tu acceso reservado.</p>
        </div>
      </form>
    </div>

    <div class="perks">
      <div class="perk">
        <div class="perk-icon">EARLY</div>
        <div class="perk-title">Acceso<br>previo</div>
        <div class="perk-desc">Antes del lanzamiento oficial</div>
      </div>
      <div class="perk">
        <div class="perk-icon">FOUND</div>
        <div class="perk-title">Badge<br>fundador</div>
        <div class="perk-desc">Insignia exclusiva en tu perfil</div>
      </div>
      <div class="perk">
        <div class="perk-icon">ALERT</div>
        <div class="perk-title">Aviso<br>directo</div>
        <div class="perk-desc">El primero en cada novedad</div>
      </div>
    </div>

    <div class="countdown-wrap">
      <p class="countdown-label">Quedan para Fallas 2027</p>
      <div class="countdown">
        <div class="countdown-item">
          <div class="countdown-num" id="cd-days">0</div>
          <div class="countdown-unit">Dias</div>
        </div>
        <div class="countdown-item">
          <div class="countdown-num" id="cd-hours">0</div>
          <div class="countdown-unit">Horas</div>
        </div>
        <div class="countdown-item">
          <div class="countdown-num" id="cd-mins">0</div>
          <div class="countdown-unit">Min</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section-stats">
  <div class="stats-inner">
    <div>
      <div class="stat-num">380+</div>
      <div class="stat-label">Monumentos</div>
      <div class="stat-copy">Ruta visual por toda Valencia para decidir mejor que ver primero.</div>
    </div>
    <div>
      <div class="stat-num">Gratis</div>
      <div class="stat-label">Acceso invitado</div>
      <div class="stat-copy">Prueba la app antes de registrarte y entra sin friccion.</div>
    </div>
    <div>
      <div class="stat-num">2027</div>
      <div class="stat-label">Rumbo a marzo</div>
      <div class="stat-copy">Agenda, rutas y avisos listos para llegar con todo preparado.</div>
    </div>
  </div>
</section>

<section class="section-preview">
  <div class="section-preview-inner">
    <div>
      <p class="section-label">Lo que vas a tener</p>
      <h2 class="section-title">Todo lo que<br>necesitas para<br><em>moverte en Fallas.</em></h2>
      <p class="section-body">Entras con una base real: mapa para decidir mejor, agenda para no perder actos, pasaporte para guardar progreso y ofertas cerca de tu ruta.</p>

      <div class="feature-list">
        <div class="feature-item">
          <div class="feature-icon">MAPA</div>
          <div>
            <div class="feature-text-title">Mapa de calor interactivo</div>
            <div class="feature-text-desc feature-text-desc-fix">Sabr&aacute;s qu&eacute; zonas est&aacute;n m&aacute;s activas y qu&eacute; fallas conviene priorizar seg&uacute;n la hora y el ambiente.</div>
            <div class="feature-text-desc">Sabrás que zonas estan mas activas y que fallas merece la pena priorizar en cada momento.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">RUTA</div>
          <div>
            <div class="feature-text-title">Pasaporte Fallero</div>
            <div class="feature-text-desc feature-text-desc-fix">Guardas monumentos, desbloqueas insignias y conviertes cada visita en un recorrido que apetece completar.</div>
            <div class="feature-text-desc">Guardas monumentos, desbloqueas insignias y conviertes el recorrido en algo que apetece completar.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">ACTOS</div>
          <div>
            <div class="feature-text-title">Agenda en vivo</div>
            <div class="feature-text-desc feature-text-desc-fix">Masclet&agrave;s, castillos, ofrendas y actos clave ordenados para que llegues con tiempo y sin improvisar.</div>
            <div class="feature-text-desc">Mascletas, castillos, ofrendas y actos clave ordenados para que llegues con tiempo y sin improvisar.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">CERCA</div>
          <div>
            <div class="feature-text-title">Marketplace fallero</div>
            <div class="feature-text-desc feature-text-desc-fix">Restaurantes, cupones y experiencias &uacute;tiles justo cuando est&aacute;s recorriendo una zona concreta.</div>
            <div class="feature-text-desc">Restaurantes, cupones y experiencias utiles justo cuando estas recorriendo una zona concreta.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="phone-wrap">
      <div class="phone-badge badge-left"><span>GPS</span> mapa en vivo</div>
      <div class="phone-outer">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="app-ui">
            <div class="app-topbar">
              <div class="app-chip logo">FALLES <span>360</span></div>
              <div class="app-chip gps"><span class="chip-dot">G</span>GPS</div>
              <div class="app-chip center"><span class="chip-dot">O</span></div>
              <div class="app-chip clock"><span class="chip-dot">C</span></div>
              <div class="app-chip avatar"><span class="avatar-circle"></span></div>
            </div>

            <div class="map-canvas">
              <div class="coast-line"></div>
              <div class="road v1"></div>
              <div class="road v2"></div>
              <div class="road h1"></div>
              <div class="road h2"></div>
              <div class="road h3"></div>

              <div class="map-label" style="left:60%;top:9%;">Santa Maria</div>
              <div class="map-label" style="left:56%;top:13%;">Massamagrell</div>
              <div class="map-label" style="left:45%;top:21%;">Meliana</div>
              <div class="map-label" style="left:23%;top:30%;">Burjassot</div>
              <div class="map-label" style="left:37%;top:34%;">Albalat</div>
              <div class="map-label" style="left:3%;top:66%;">Torrent</div>
              <div class="map-label" style="left:18%;top:73%;">Paiporta</div>
              <div class="map-label" style="left:44%;top:79%;">Silla</div>
              <div class="map-label" style="left:57%;top:88%;">Albufera</div>
              <div class="map-label" style="left:12%;top:92%;">Alginet</div>

              <div class="cluster orange" style="left:28%;top:19%;">2</div>
              <div class="cluster orange" style="left:42%;top:28%;">4</div>
              <div class="cluster orange" style="left:18%;top:34%;">4</div>
              <div class="cluster orange" style="left:31%;top:42%;">46</div>
              <div class="cluster yellow" style="left:44%;top:42%;">35</div>
              <div class="cluster yellow" style="left:31%;top:50%;">169</div>
              <div class="cluster yellow" style="left:44%;top:50%;">199</div>
              <div class="cluster orange" style="left:60%;top:50%;">12</div>
              <div class="cluster orange" style="left:31%;top:58%;">14</div>
              <div class="cluster yellow" style="left:44%;top:58%;">17</div>
              <div class="cluster orange" style="left:51%;top:70%;">2</div>
              <div class="cluster orange" style="left:67%;top:88%;">4</div>
            </div>

            <div class="map-fab">|||<span class="map-fab-badge">2</span></div>

            <div class="app-bottomnav">
              <div class="nav-slot active"><div class="nav-slot-icon">M</div>Mapa</div>
              <div class="nav-slot"><div class="nav-slot-icon">A</div>Agenda</div>
              <div class="nav-slot"><div class="nav-slot-icon">F</div>Fallerito</div>
              <div class="nav-slot"><div class="nav-slot-icon">L</div>Fallas</div>
              <div class="nav-slot"><div class="nav-slot-icon">S</div>Marketplace</div>
            </div>
          </div>
        </div>
      </div>
      <div class="phone-badge badge-right"><span>14</span> focos activos</div>
    </div>
  </div>
</section>

<section class="section-how">
  <div class="section-how-inner">
    <p class="section-label">Como funciona</p>
    <h2>Tres pasos.<br><em>Sin complicaciones.</em></h2>
    <p class="section-how-sub">El proceso es simple: dejas tu email, te reservamos sitio y entras antes que el resto cuando activemos el acceso anticipado.</p>

    <div class="steps">
      <div class="step">
        <div class="step-num">01</div>
        <div class="step-icon">1 minuto</div>
        <div class="step-title">Te apuntas</div>
        <div class="step-desc">Dejas tu nombre y tu email. No hay tarjeta, no hay registro largo y no te pedimos nada mas.</div>
        <div class="step-connector">&rarr;</div>
      </div>
      <div class="step">
        <div class="step-num">02</div>
        <div class="step-icon">email directo</div>
        <div class="step-title">Te avisamos</div>
        <div class="step-desc">Cuando activemos la entrada prioritaria, recibes el aviso antes que el resto y con acceso directo.</div>
        <div class="step-connector">&rarr;</div>
      </div>
      <div class="step">
        <div class="step-num">03</div>
        <div class="step-icon">entras primero</div>
        <div class="step-title">Entras primero</div>
        <div class="step-desc">Empiezas a guardar rutas, favoritos y progreso con tiempo para llegar a marzo con todo preparado.</div>
      </div>
    </div>
  </div>
</section>

<section class="section-cta">
  <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g transform="translate(1300,50) scale(2)">
      <path d="M35,140 C16,114 0,88 10,55 C16,37 26,26 21,7 C37,24 32,46 46,33 C40,56 56,63 51,86 C62,67 67,44 56,19 C77,37 80,67 69,95 Z" fill="#E8460A" opacity="0.1"/>
    </g>
    <g transform="translate(-20,300) scale(1.3)">
      <path d="M25,100 C12,83 0,65 7,44 C10,30 17,22 14,8 C24,19 21,33 30,24 C27,39 39,44 35,59 C44,46 47,29 39,12 C54,26 55,48 47,65 Z" fill="#E8460A" opacity="0.08"/>
    </g>
  </svg>

  <h2>Empieza este verano<br>y llega a marzo<br><em>con la app hecha tuya.</em></h2>
  <p>Mapa, agenda, rutas y Pasaporte Fallero en una entrada rapida.</p>
  <button class="cta-btn" type="button" id="cta-scroll">Apuntarme ahora</button>
  <p class="cta-note">Gratis para empezar | Sin tarjeta | Sin instalar nada</p>
</section>

<footer>&copy; 2026 Falles360 | Valencia | <a href="./dist/privacy.html">Privacidad</a></footer>

<script<?php echo app_csp_nonce_attr(); ?>>
  const csrfToken = <?php echo json_encode($csrfToken, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
  const apiEndpoint = './api/solicitudes.php';
  const targetDate = new Date('2027-03-19T00:00:00+01:00');

  const form = document.getElementById('waitlist-form');
  const nameInput = document.getElementById('input-name');
  const emailInput = document.getElementById('input-email');
  const submitButton = document.getElementById('btn-submit');
  const formInner = document.getElementById('form-inner');
  const successState = document.getElementById('success-state');
  const statusBox = document.getElementById('form-status');
  const counterNumber = document.getElementById('counter-num');
  const ctaScroll = document.getElementById('cta-scroll');
  const formCard = document.getElementById('form-card');

  function updateCountdown() {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '0';
      document.getElementById('cd-hours').textContent = '0';
      document.getElementById('cd-mins').textContent = '0';
      return;
    }

    document.getElementById('cd-days').textContent = String(Math.floor(diff / 86400000));
    document.getElementById('cd-hours').textContent = String(Math.floor((diff % 86400000) / 3600000));
    document.getElementById('cd-mins').textContent = String(Math.floor((diff % 3600000) / 60000));
  }

  function setStatus(message, kind) {
    statusBox.textContent = message;
    statusBox.className = 'form-status';
    if (!message) {
      return;
    }
    statusBox.classList.add(kind === 'ok' ? 'form-status--ok' : 'form-status--error');
  }

  function shake(element) {
    element.style.borderColor = 'white';
    element.style.animation = 'shake .3s ease';
    window.setTimeout(() => {
      element.style.animation = '';
      element.style.borderColor = '';
    }, 400);
  }

  function showSuccess(nextCount) {
    formInner.style.display = 'none';
    successState.style.display = 'block';
    if (typeof nextCount === 'number' && Number.isFinite(nextCount)) {
      counterNumber.textContent = String(nextCount);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (name.length < 2) {
      setStatus('Escribe tu nombre para entrar en la lista.', 'error');
      shake(nameInput);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('Escribe un email valido.', 'error');
      shake(emailInput);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';
    setStatus('', 'ok');

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          name,
          email,
          source: 'whitelist_page',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(typeof payload.message === 'string' ? payload.message : 'No se pudo guardar la solicitud.');
      }

      showSuccess(typeof payload.count === 'number' ? payload.count : undefined);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar la solicitud.', 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Apuntarme a la lista';
    }
  }

  updateCountdown();
  window.setInterval(updateCountdown, 60000);

  window.setTimeout(() => {
    const finalCount = Number.parseInt(counterNumber.textContent || '0', 10);
    let current = Math.max(0, finalCount - Math.min(24, finalCount));
    counterNumber.textContent = String(current);

    const interval = window.setInterval(() => {
      current += 1;
      if (current >= finalCount) {
        current = finalCount;
        window.clearInterval(interval);
      }
      counterNumber.textContent = String(current);
    }, 30);
  }, 800);

  form.addEventListener('submit', (event) => {
    void handleSubmit(event);
  });

  ctaScroll.addEventListener('click', () => {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
</script>
</body>
</html>
