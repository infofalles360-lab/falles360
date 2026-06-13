<?php
declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';

$target = 'app';

function login_user_can_access_commission_panel(?array $user): bool
{
    if (!is_array($user) || strtolower((string) ($user['type'] ?? 'guest')) === 'guest') {
        return false;
    }

    $commissionId = isset($user['commission_id']) ? (int) $user['commission_id'] : 0;
    if ($commissionId <= 0) {
        return false;
    }

    try {
        $statement = db()->prepare("SELECT COUNT(*) FROM commissions WHERE id = :id AND status = 'active'");
        $statement->execute(['id' => $commissionId]);
        return (int) ($statement->fetchColumn() ?: 0) > 0;
    } catch (Throwable) {
        return false;
    }
}

function login_redirect_after_auth(string $target): never
{
    if ($target === 'panel') {
        if (!login_user_can_access_commission_panel(current_user())) {
            logout_current_user();
            redirect_to(with_lang(app_url('login_url'), [
                'target' => 'panel',
                'panel_denied' => '1',
            ]));
        }

        redirect_to('./panel/index.php');
    }

    redirect_to(with_lang(app_url('dashboard_url')));
}

if (is_authenticated() && strtolower((string) ((current_user()['type'] ?? 'guest'))) !== 'guest') {
    login_redirect_after_auth($target);
}

$name = '';
$email = '';
$error = null;
$submitted = false;
try {
    $mode = app_validate_enum($_POST['mode'] ?? $_GET['mode'] ?? 'login', 'mode', ['login', 'register', 'recover']);
} catch (InvalidArgumentException) {
    $mode = 'login';
}

$recoverNotice = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted = true;
    if (!csrf_is_valid_request()) {
        security_log_event('csrf_failed_login_form', [
            'mode' => $mode,
        ]);
        $error = 'La sesion del formulario ha expirado. Recarga la pagina e intentalo de nuevo.';
    } else {
        try {
            $action = app_validate_enum($_POST['action'] ?? ($mode === 'register' ? 'register' : ($mode === 'recover' ? 'recover_request' : 'login')), 'action', ['guest', 'login', 'register', 'recover_request']);
        } catch (InvalidArgumentException) {
            $action = 'login';
        }

        if ($action === 'guest') {
            login_as_guest();
            redirect_to(with_lang(post_auth_redirect_url()));
        }

        $name = app_validate_string($_POST['name'] ?? '', 'name', [
            'allow_empty' => true,
            'max' => 100,
            'normalize_spaces' => true,
        ]);
        $email = app_validate_string($_POST['email'] ?? '', 'email', [
            'allow_empty' => true,
            'max' => 190,
        ]);
        $password = (string) app_sanitize_input_value($_POST['password'] ?? '', ['trim' => false, 'max_bytes' => 4096]);
        $passwordConfirmation = (string) app_sanitize_input_value($_POST['password_confirm'] ?? '', ['trim' => false, 'max_bytes' => 4096]);

        try {
            if ($action === 'recover_request') {
                $mode = 'recover';
                $result = request_password_reset($email);

                if ($result['success']) {
                    $recoverNotice = $result['message'];
                    $error = null;
                } else {
                    $error = $result['message'];
                }
            } elseif ($action === 'register') {
                $mode = 'register';
                $result = register_user_account($name, $email, $password, $passwordConfirmation);

                if ($result['success']) {
                    login_redirect_after_auth($target);
                }

                $error = $result['message'];
            } else {
                $mode = 'login';
                $result = login_with_credentials($email, $password);

                if ($result['success']) {
                    login_redirect_after_auth($target);
                }

                $error = $result['message'];
            }
        } catch (Throwable $exception) {
            $error = t('errors.db');
        }
    }
}

$languages = available_languages();
$lang = current_language();
$isRegisterMode = $mode === 'register';
$isRecoverMode = $mode === 'recover';
$loginModeUrl = with_lang(app_url('login_url'), ['mode' => 'login', 'target' => $target]);
$registerModeUrl = with_lang(app_url('login_url'), ['mode' => 'register', 'target' => $target]);
$recoverModeUrl = with_lang(app_url('login_url'), ['mode' => 'recover', 'target' => $target]);
$formTitle = $isRecoverMode
    ? t('login.recover_form_title')
    : ($isRegisterMode ? t('login.register_form_title') : t('login.form_title'));
$formSubtitle = $isRecoverMode
    ? t('login.recover_form_subtitle')
    : ($isRegisterMode ? t('login.register_form_subtitle') : t('login.form_subtitle'));
?>
<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars(t('login.page_title'), ENT_QUOTES, 'UTF-8'); ?> | Falles360</title>
    <link rel="manifest" href="./dist/manifest.webmanifest">
    <meta name="theme-color" content="#ff7a00">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Falles360">
    <link rel="apple-touch-icon" href="./dist/icons/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800;900&display=swap" rel="stylesheet">
    <style<?php echo app_csp_nonce_attr(); ?>>
        :root {
            --orange: #f05a28;
            --orange-dark: #c03e15;
            --orange-light: #ff8b5e;
            --off-white: #f7f4f1;
            --card: rgba(255, 255, 255, 0.9);
            --line: rgba(0, 0, 0, 0.08);
            --field: rgba(247, 244, 241, 0.95);
            --text: #1a110a;
            --muted: #7a6a60;
            --faint: #b0a098;
            --shadow: 0 28px 90px -42px rgba(26, 17, 10, 0.42);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            font-family: "DM Sans", "Segoe UI", sans-serif;
            color: var(--text);
            background: #ffffff;
            overflow-x: hidden;
        }
        a { color: inherit; text-decoration: none; }
        .page {
            position: relative;
            min-height: 100vh;
            padding: 26px 22px 48px;
            background:
                radial-gradient(circle at 82% 8%, rgba(240, 90, 40, 0.13), transparent 24%),
                radial-gradient(circle at 12% 84%, rgba(240, 90, 40, 0.08), transparent 22%),
                linear-gradient(180deg, #ffffff 0%, var(--off-white) 100%);
        }
        .page::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            background:
                linear-gradient(90deg, rgba(26, 17, 10, 0.035) 1px, transparent 1px),
                linear-gradient(0deg, rgba(26, 17, 10, 0.035) 1px, transparent 1px);
            background-size: 86px 86px;
            mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.38), transparent 90%);
        }
        .topbar {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            max-width: 1080px;
            margin: 0 auto;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 14px;
            color: var(--muted);
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            transition: color 0.2s ease, transform 0.2s ease;
        }
        .back-link:hover {
            color: var(--text);
            transform: translateX(-2px);
        }
        .back-link span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 999px;
            border: 1px solid var(--line);
            background: rgba(255, 255, 255, 0.84);
            box-shadow: 0 10px 24px rgba(26, 17, 10, 0.08);
            font-size: 1.2rem;
        }
        .lang-form {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem 1rem;
            border-radius: 999px;
            border: 1px solid var(--line);
            background: rgba(255, 255, 255, 0.84);
            box-shadow: 0 10px 24px rgba(26, 17, 10, 0.08);
            backdrop-filter: blur(12px);
        }
        .lang-form select {
            border: 0;
            outline: 0;
            cursor: pointer;
            background: transparent;
            color: var(--text);
            font: inherit;
            font-size: 0.9rem;
            font-weight: 800;
        }
        .wrap {
            position: relative;
            z-index: 1;
            width: min(100%, 460px);
            margin: 0 auto;
            padding: 2rem 0 4rem;
            text-align: center;
        }
        .brand-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 4.6rem;
            height: 4.6rem;
            margin: 0 auto 1.35rem;
            border-radius: 1.2rem;
            background: linear-gradient(180deg, var(--orange) 0%, var(--orange-dark) 100%);
            color: #fff;
            font-size: 2rem;
            font-weight: 900;
            box-shadow: 0 18px 40px rgba(240, 90, 40, 0.25);
        }
        h1 {
            font-family: "Bebas Neue", sans-serif;
            font-size: clamp(4rem, 12vw, 5.8rem);
            line-height: 0.9;
            letter-spacing: -0.02em;
            font-weight: 400;
        }
        h1 span { color: var(--orange); }
        .subtitle {
            margin-top: 0.45rem;
            color: var(--muted);
            font-size: 1rem;
            line-height: 1.6;
        }
        .notice {
            margin: 0 0 1rem;
            padding: 1rem 1.1rem;
            border: 1px solid rgba(240, 90, 40, 0.22);
            border-radius: 1.15rem;
            background: rgba(240, 90, 40, 0.08);
            color: var(--orange-dark);
            font-size: 0.92rem;
            text-align: left;
        }
        .notice.notice-success {
            border-color: rgba(37, 138, 84, 0.22);
            background: rgba(37, 138, 84, 0.08);
            color: #1d6a43;
        }
        .card {
            position: relative;
            margin-top: 2rem;
            padding: 1.55rem;
            border: 1px solid var(--line);
            border-radius: 2rem;
            background: var(--card);
            box-shadow: var(--shadow);
            backdrop-filter: blur(16px);
            text-align: left;
            overflow: hidden;
        }
        .card::before {
            content: "";
            position: absolute;
            inset: 0 0 auto;
            height: 4px;
            background: linear-gradient(90deg, var(--orange) 0%, var(--orange-light) 100%);
        }
        .mode-switch {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.7rem;
            margin-bottom: 1.6rem;
            padding: 0.45rem;
            border: 1px solid rgba(26, 17, 10, 0.06);
            border-radius: 999px;
            background: rgba(73, 61, 52, 0.08);
        }
        .mode-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            border-radius: 999px;
            color: var(--muted);
            font-size: 0.88rem;
            font-weight: 800;
            transition: transform 0.2s ease, color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .mode-link:hover {
            color: var(--text);
            transform: translateY(-1px);
        }
        .mode-link.is-active {
            background: #fff;
            color: var(--text);
            box-shadow: 0 10px 22px rgba(26, 17, 10, 0.08);
        }
        .card-head { margin-bottom: 1.5rem; }
        .card-head h2 {
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: -0.03em;
        }
        .card-head p {
            margin-top: 0.55rem;
            color: var(--muted);
            font-size: 0.95rem;
            line-height: 1.5;
        }
        .label-row,
        .label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 0.65rem;
            color: var(--text);
            font-size: 0.72rem;
            font-weight: 900;
            letter-spacing: 0.22em;
            text-transform: uppercase;
        }
        .forgot {
            color: var(--orange);
            font-size: 0.72rem;
            letter-spacing: normal;
            text-transform: none;
        }
        .field {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 58px;
            margin-bottom: 1.25rem;
            padding: 0 16px;
            border: 1px solid var(--line);
            border-radius: 1rem;
            background: var(--field);
            box-shadow: 0 12px 24px -24px rgba(26, 17, 10, 0.35);
            transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .field:focus-within {
            border-color: rgba(240, 90, 40, 0.34);
            box-shadow: 0 0 0 4px rgba(240, 90, 40, 0.08);
            transform: translateY(-1px);
        }
        .field svg {
            width: 18px;
            height: 18px;
            flex: 0 0 auto;
            color: var(--faint);
        }
        .field input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: var(--text);
            font: inherit;
            font-size: 1rem;
            font-weight: 600;
        }
        .field input::placeholder {
            color: var(--faint);
            font-weight: 500;
        }
        .toggle {
            border: 0;
            padding: 0;
            background: transparent;
            color: var(--faint);
            cursor: pointer;
        }
        .submit,
        .guest {
            width: 100%;
            padding: 1rem 1.5rem;
            border-radius: 999px;
            font-size: 1rem;
            font-weight: 900;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .submit:hover,
        .guest:hover {
            transform: translateY(-1px);
        }
        .submit {
            border: 0;
            background: var(--orange);
            color: #fff;
            box-shadow: 0 20px 42px -20px rgba(240, 90, 40, 0.95);
        }
        .guest {
            margin-top: 0.85rem;
            border: 1px solid var(--line);
            background: #fff;
            color: var(--text);
            box-shadow: 0 14px 30px -26px rgba(26, 17, 10, 0.35);
        }
        .submit span,
        .guest span { margin-left: 12px; }
        .divider {
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 1.6rem 0 1rem;
            color: var(--faint);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            text-align: center;
        }
        .divider::before,
        .divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--line);
        }
        .helper-note {
            margin-top: 1rem;
            padding: 0.95rem 1rem;
            border: 1px solid rgba(240, 90, 40, 0.18);
            border-radius: 1rem;
            background: rgba(255, 241, 234, 0.9);
            color: var(--muted);
            font-size: 0.84rem;
            line-height: 1.6;
            text-align: left;
        }
        .helper-note strong {
            color: var(--text);
        }
        .social {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }
        .social button {
            height: 56px;
            border: 1px solid var(--line);
            border-radius: 1rem;
            background: #fff;
            color: var(--text);
            font: inherit;
            font-size: 0.88rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 14px 30px -28px rgba(26, 17, 10, 0.45);
            transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .social button:hover {
            border-color: rgba(240, 90, 40, 0.24);
            transform: translateY(-1px);
            box-shadow: 0 18px 30px -26px rgba(240, 90, 40, 0.4);
        }
        .inline-guest { display: block; }
        @media (max-width: 640px) {
            .page {
                padding-left: 18px;
                padding-right: 18px;
            }
            .topbar {
                flex-direction: column;
                align-items: flex-start;
            }
            .wrap {
                width: 100%;
                padding-top: 1.25rem;
            }
            .card {
                padding: 1.25rem;
                border-radius: 1.65rem;
            }
            h1 {
                font-size: clamp(3.6rem, 18vw, 5rem);
            }
            .card-head h2 {
                font-size: 1.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <a class="back-link" href="./">
                <span>&lsaquo;</span>
                <?php echo htmlspecialchars(t('login.back'), ENT_QUOTES, 'UTF-8'); ?>
            </a>

            <form class="lang-form" method="get" action="">
                <input type="hidden" name="mode" value="<?php echo htmlspecialchars($mode, ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="target" value="<?php echo htmlspecialchars($target, ENT_QUOTES, 'UTF-8'); ?>">
                <select id="lang" name="lang" data-auto-submit="1">
                    <?php foreach ($languages as $code => $label): ?>
                        <option value="<?php echo htmlspecialchars($code, ENT_QUOTES, 'UTF-8'); ?>" <?php echo $lang === $code ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>
        </div>

        <main class="wrap">
            <div class="brand-box">F</div>
            <h1>Falles<span>360</span></h1>
            <p class="subtitle"><?php echo htmlspecialchars(t('login.title'), ENT_QUOTES, 'UTF-8'); ?></p>

            <?php if ($error !== null): ?>
                <div class="notice"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php elseif ($recoverNotice !== null): ?>
                <div class="notice notice-success"><?php echo htmlspecialchars($recoverNotice, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php elseif ($submitted && !$isRecoverMode): ?>
                <div class="notice"><?php echo htmlspecialchars(t('login.success_notice'), ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>

            <form id="auth-form" class="card" method="post" action="">
                <input type="hidden" name="lang" value="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="mode" value="<?php echo htmlspecialchars($mode, ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="target" value="app">
                <?php echo csrf_token_input(); ?>

                <?php if (!$isRecoverMode): ?>
                    <div class="mode-switch">
                        <a class="mode-link <?php echo $isRegisterMode ? '' : 'is-active'; ?>" href="<?php echo htmlspecialchars($loginModeUrl, ENT_QUOTES, 'UTF-8'); ?>">
                            <?php echo htmlspecialchars(t('login.login_tab'), ENT_QUOTES, 'UTF-8'); ?>
                        </a>
                        <a class="mode-link <?php echo $isRegisterMode ? 'is-active' : ''; ?>" href="<?php echo htmlspecialchars($registerModeUrl, ENT_QUOTES, 'UTF-8'); ?>">
                            <?php echo htmlspecialchars(t('login.register_tab'), ENT_QUOTES, 'UTF-8'); ?>
                        </a>
                    </div>
                <?php else: ?>
                    <p style="margin:0 0 20px;font-size:14px;font-weight:700;">
                        <a class="forgot" style="font-weight:800;letter-spacing:0.02em;" href="<?php echo htmlspecialchars($loginModeUrl, ENT_QUOTES, 'UTF-8'); ?>">&larr; <?php echo htmlspecialchars(t('login.recover_back'), ENT_QUOTES, 'UTF-8'); ?></a>
                    </p>
                <?php endif; ?>

                <div class="card-head">
                    <h2><?php echo htmlspecialchars($formTitle, ENT_QUOTES, 'UTF-8'); ?></h2>
                    <p><?php echo htmlspecialchars($formSubtitle, ENT_QUOTES, 'UTF-8'); ?></p>
                </div>

                <?php if (!$isRegisterMode && !$isRecoverMode): ?>
                    <div class="helper-note">
                        <strong>Entrada rapida disponible:</strong> si solo quieres probar la app, usa el acceso invitado. La cuenta registrada hace falta para guardar progreso y para entrar en Fallerito y el marketplace.
                    </div>
                <?php endif; ?>

                <?php if ($isRegisterMode && !$isRecoverMode): ?>
                    <label class="label" for="name"><?php echo htmlspecialchars(t('login.name'), ENT_QUOTES, 'UTF-8'); ?></label>
                    <div class="field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M20 21a8 8 0 0 0-16 0"></path>
                            <circle cx="12" cy="8" r="4"></circle>
                        </svg>
                        <input id="name" name="name" type="text" placeholder="<?php echo htmlspecialchars(t('login.name_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" value="<?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?>" autocomplete="name">
                    </div>
                <?php endif; ?>

                <label class="label" for="email"><?php echo htmlspecialchars(t('login.email'), ENT_QUOTES, 'UTF-8'); ?></label>
                <div class="field">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                        <path d="M3 7l9 6 9-6"></path>
                    </svg>
                    <input id="email" name="email" type="email" placeholder="<?php echo htmlspecialchars(t('login.email_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" value="<?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?>" autocomplete="email">
                </div>

                <?php if ($isRecoverMode): ?>
                    <button class="submit" type="submit" name="action" value="recover_request">
                        <?php echo htmlspecialchars(t('login.recover_submit'), ENT_QUOTES, 'UTF-8'); ?><span>&rarr;</span>
                    </button>
                <?php else: ?>
                    <?php if ($isRegisterMode): ?>
                        <label class="label" for="password"><?php echo htmlspecialchars(t('login.password'), ENT_QUOTES, 'UTF-8'); ?></label>
                    <?php else: ?>
                        <div class="label-row">
                            <label for="password"><?php echo htmlspecialchars(t('login.password'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <a class="forgot" href="<?php echo htmlspecialchars($recoverModeUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars(t('login.forgot'), ENT_QUOTES, 'UTF-8'); ?></a>
                        </div>
                    <?php endif; ?>
                    <div class="field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
                            <path d="M8 10V7a4 4 0 118 0v3"></path>
                        </svg>
                        <input id="password" name="password" type="password" placeholder="<?php echo htmlspecialchars(t('login.password_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="<?php echo $isRegisterMode ? 'new-password' : 'current-password'; ?>">
                        <button class="toggle" type="button" data-toggle-target="password" aria-label="toggle password">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>

                    <?php if ($isRegisterMode): ?>
                        <label class="label" for="password_confirm"><?php echo htmlspecialchars(t('login.password_confirm'), ENT_QUOTES, 'UTF-8'); ?></label>
                        <div class="field">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="4" y="10" width="16" height="10" rx="2"></rect>
                                <path d="M8 10V7a4 4 0 118 0v3"></path>
                            </svg>
                            <input id="password_confirm" name="password_confirm" type="password" placeholder="<?php echo htmlspecialchars(t('login.password_confirm_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="new-password">
                            <button class="toggle" type="button" data-toggle-target="password_confirm" aria-label="toggle password confirmation">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    <?php endif; ?>

                    <button class="submit" type="submit" name="action" value="<?php echo $isRegisterMode ? 'register' : 'login'; ?>">
                        <?php echo htmlspecialchars($isRegisterMode ? t('login.register_submit') : t('login.submit'), ENT_QUOTES, 'UTF-8'); ?><span>&rarr;</span>
                    </button>
                    <?php if (!$isRegisterMode): ?>
                        <button id="guest-entry" class="guest inline-guest" type="submit" name="action" value="guest">
                            <?php echo htmlspecialchars(t('login.guest'), ENT_QUOTES, 'UTF-8'); ?><span>&rarr;</span>
                        </button>

                        <div class="helper-note">
                            <strong>Importante:</strong> el acceso real en esta version es por email o como invitado. Los accesos sociales aun no estan activados.
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
            </form>
        </main>
    </div>

    <script<?php echo app_csp_nonce_attr(); ?>>
        document.querySelectorAll('[data-auto-submit]').forEach((element) => {
            element.addEventListener('change', () => {
                if (element.form) {
                    element.form.submit();
                }
            });
        });

        document.querySelectorAll('[data-toggle-target]').forEach((toggle) => {
            const target = document.getElementById(toggle.getAttribute('data-toggle-target'));

            if (!target) {
                return;
            }

            toggle.addEventListener('click', () => {
                target.type = target.type === 'password' ? 'text' : 'password';
            });
        });

        if (window.location.hash === '#guest-entry') {
            const guestButton = document.getElementById('guest-entry');
            if (guestButton) {
                guestButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.setTimeout(() => guestButton.focus(), 180);
            }
        }
    </script>
</body>
</html>

