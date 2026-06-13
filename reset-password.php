<?php
declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';

if (is_authenticated() && strtolower((string) ((current_user()['type'] ?? 'guest'))) !== 'guest') {
    redirect_to(with_lang(app_url('dashboard_url')));
}

$token = app_validate_string($_POST['token'] ?? $_GET['token'] ?? '', 'token', [
    'allow_empty' => true,
    'max' => 128,
]);
$error = null;
$successMessage = null;
$submitted = false;
$tokenValid = find_valid_password_reset($token) !== null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted = true;
    if (!csrf_is_valid_request()) {
        security_log_event('csrf_failed_reset_form', [
            'endpoint' => '/reset-password',
        ]);
        $error = 'La sesion del formulario ha expirado. Recarga la pagina e intentalo de nuevo.';
        $tokenValid = find_valid_password_reset($token) !== null;
    } else {
        $token = app_validate_string($_POST['token'] ?? '', 'token', [
            'allow_empty' => true,
            'max' => 128,
        ]);
        $password = (string) app_sanitize_input_value($_POST['password'] ?? '', ['trim' => false, 'max_bytes' => 4096]);
        $passwordConfirmation = (string) app_sanitize_input_value($_POST['password_confirm'] ?? '', ['trim' => false, 'max_bytes' => 4096]);

        try {
            $result = reset_password_with_token($token, $password, $passwordConfirmation);

            if ($result['success']) {
                $successMessage = $result['message'];
                $tokenValid = false;
            } else {
                $error = $result['message'];
                $tokenValid = find_valid_password_reset($token) !== null;
            }
        } catch (Throwable $exception) {
            $error = t('errors.db');
            $tokenValid = find_valid_password_reset($token) !== null;
        }
    }
}

$languages = available_languages();
$lang = current_language();
$loginUrl = with_lang(app_url('login_url'), ['mode' => 'login']);
?>
<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars(t('login.reset_page_title'), ENT_QUOTES, 'UTF-8'); ?> | Falles360</title>
    <style<?php echo app_csp_nonce_attr(); ?>>
        :root {
            --bg: #f7f8fc;
            --card: rgba(255, 255, 255, 0.92);
            --line: #e4eaf4;
            --text: #0d2247;
            --muted: #6b7f9f;
            --orange: #ff5a00;
            --orange-soft: #fff1e8;
            --shadow: 0 32px 90px rgba(18, 44, 86, 0.12);
            --field: #f5f7fb;
            --white-shadow: 0 12px 30px rgba(255, 255, 255, 0.7);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, "Segoe UI", sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at top center, rgba(255, 90, 0, 0.12), transparent 26%),
                linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
        }
        a { color: inherit; text-decoration: none; }
        .page { min-height: 100vh; padding: 22px; }
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            font-size: 15px;
            font-weight: 700;
            color: #4f678d;
        }
        .back-link span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 999px;
            border: 1px solid #d9e1ee;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: var(--white-shadow);
            font-size: 20px;
        }
        .lang-form {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid #d9e1ee;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: var(--white-shadow);
        }
        .lang-form select {
            border: 0;
            background: transparent;
            color: var(--text);
            font-weight: 800;
            font-size: 14px;
            outline: 0;
            cursor: pointer;
        }
        .wrap {
            width: min(100%, 500px);
            margin: 0 auto;
            padding: 26px 0 56px;
            text-align: center;
        }
        .brand-box {
            width: 70px;
            height: 70px;
            margin: 0 auto 22px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #ff6a1a 0%, #ff5a00 100%);
            color: white;
            font-size: 36px;
            font-weight: 900;
            box-shadow: 0 22px 45px rgba(255, 90, 0, 0.24);
        }
        h1 {
            margin: 0;
            font-size: clamp(36px, 5vw, 48px);
            line-height: .95;
            font-weight: 900;
            letter-spacing: -0.04em;
        }
        h1 span { color: var(--orange); }
        .card {
            position: relative;
            margin-top: 28px;
            border-radius: 36px;
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--line);
            box-shadow: var(--shadow);
            padding: 34px;
            text-align: left;
            overflow: hidden;
        }
        .card::before {
            content: "";
            position: absolute;
            inset: 0 0 auto;
            height: 5px;
            background: linear-gradient(90deg, #ff5a00, #ff9b65);
        }
        .card-head h2 {
            margin: 0;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.03em;
        }
        .card-head p {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 15px;
            line-height: 1.5;
        }
        .notice {
            margin: 22px 0 0;
            border-radius: 18px;
            padding: 16px;
            font-size: 14px;
            text-align: left;
            border: 1px solid #ffd4bd;
            background: var(--orange-soft);
            color: #a4430d;
        }
        .notice.notice-success {
            border-color: #b8e0c8;
            background: #ecf8f0;
            color: #1d5c3a;
        }
        .label {
            display: block;
            margin: 0 0 10px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: .18em;
            text-transform: uppercase;
        }
        .field {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 58px;
            border-radius: 18px;
            padding: 0 16px;
            background: var(--field);
            border: 1px solid #edf1f7;
            margin-bottom: 22px;
        }
        .field:focus-within {
            border-color: rgba(255, 90, 0, 0.35);
            box-shadow: 0 0 0 4px rgba(255, 90, 0, 0.09);
        }
        .field svg {
            width: 18px;
            height: 18px;
            flex: 0 0 auto;
            color: #8ea0bd;
        }
        .field input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: var(--text);
            font-size: 16px;
            font-weight: 600;
        }
        .toggle {
            border: 0;
            background: transparent;
            padding: 0;
            color: #8ea0bd;
            cursor: pointer;
        }
        .submit {
            width: 100%;
            border: 0;
            border-radius: 18px;
            font-size: 18px;
            font-weight: 900;
            padding: 18px 24px;
            cursor: pointer;
            background: linear-gradient(180deg, #ff6716 0%, #ff5a00 100%);
            color: #fff;
            box-shadow: 0 22px 36px rgba(255, 90, 0, 0.22);
        }
        .submit:hover { transform: translateY(-1px); }
        .link-login {
            display: inline-block;
            margin-top: 20px;
            font-weight: 800;
            color: var(--orange);
            font-size: 15px;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <a class="back-link" href="<?php echo htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8'); ?>">
                <span>&lsaquo;</span>
                <?php echo htmlspecialchars(t('login.recover_back'), ENT_QUOTES, 'UTF-8'); ?>
            </a>
            <form class="lang-form" method="get" action="">
                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token, ENT_QUOTES, 'UTF-8'); ?>">
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

            <?php if ($successMessage !== null): ?>
                <div class="notice notice-success"><?php echo htmlspecialchars($successMessage, ENT_QUOTES, 'UTF-8'); ?></div>
                <a class="link-login" href="<?php echo htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars(t('login.submit'), ENT_QUOTES, 'UTF-8'); ?> &rarr;</a>
            <?php elseif ($error !== null): ?>
                <div class="notice"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>

            <?php if ($tokenValid): ?>
                <form class="card" method="post" action="">
                    <input type="hidden" name="lang" value="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
                    <input type="hidden" name="token" value="<?php echo htmlspecialchars($token, ENT_QUOTES, 'UTF-8'); ?>">
                    <?php echo csrf_token_input(); ?>

                    <div class="card-head">
                        <h2><?php echo htmlspecialchars(t('login.reset_form_title'), ENT_QUOTES, 'UTF-8'); ?></h2>
                        <p><?php echo htmlspecialchars(t('login.reset_form_subtitle'), ENT_QUOTES, 'UTF-8'); ?></p>
                    </div>

                    <label class="label" for="password"><?php echo htmlspecialchars(t('login.password'), ENT_QUOTES, 'UTF-8'); ?></label>
                    <div class="field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
                            <path d="M8 10V7a4 4 0 118 0v3"></path>
                        </svg>
                        <input id="password" name="password" type="password" required minlength="8" placeholder="<?php echo htmlspecialchars(t('login.password_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="new-password">
                        <button class="toggle" type="button" data-toggle-target="password" aria-label="toggle password">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>

                    <label class="label" for="password_confirm"><?php echo htmlspecialchars(t('login.password_confirm'), ENT_QUOTES, 'UTF-8'); ?></label>
                    <div class="field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 118 0v3"></path></svg>
                        <input id="password_confirm" name="password_confirm" type="password" required minlength="8" placeholder="<?php echo htmlspecialchars(t('login.password_confirm_placeholder'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="new-password">
                        <button class="toggle" type="button" data-toggle-target="password_confirm" aria-label="toggle confirm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>

                    <button class="submit" type="submit"><?php echo htmlspecialchars(t('login.reset_submit'), ENT_QUOTES, 'UTF-8'); ?><span style="margin-left:12px">&rarr;</span></button>
                </form>
            <?php elseif ($successMessage === null && !$submitted): ?>
                <div class="notice"><?php echo htmlspecialchars(t('errors.reset_token_invalid'), ENT_QUOTES, 'UTF-8'); ?></div>
                <a class="link-login" href="<?php echo htmlspecialchars(with_lang(app_url('login_url'), ['mode' => 'recover']), ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars(t('login.recover_form_title'), ENT_QUOTES, 'UTF-8'); ?> &rarr;</a>
            <?php endif; ?>
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
            if (!target) return;
            toggle.addEventListener('click', () => {
                target.type = target.type === 'password' ? 'text' : 'password';
            });
        });
    </script>
</body>
</html>
