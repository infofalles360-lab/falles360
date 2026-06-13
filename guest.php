<?php
declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    if (!headers_sent()) {
        header('Allow: GET');
    }
    http_response_code(405);
    echo '<!doctype html><html lang="es"><meta charset="utf-8"><title>Metodo no permitido</title><body style="font-family:Arial,sans-serif;padding:32px;background:#f7f4f1;color:#1a110a"><h1>Metodo no permitido</h1><p>Este acceso rapido solo admite peticiones GET.</p><p><a href="./login.php">Ir a login</a></p></body></html>';
    exit;
}

if (is_authenticated()) {
    redirect_to(with_lang(post_auth_redirect_url(current_user())));
}

try {
    rate_limit_enforce('guest_entry_page', [
        ['scope' => 'ip', 'max' => 12, 'window' => 3600, 'message' => 'Demasiados accesos invitados desde esta IP. Intentalo mas tarde.'],
        ['scope' => 'session', 'max' => 6, 'window' => 1800, 'message' => 'Demasiados intentos con esta sesion. Espera un poco y vuelve a entrar.'],
    ], app_rate_limit_context());

    login_as_guest();
    redirect_to(with_lang(post_auth_redirect_url()));
} catch (RateLimitExceededException $exception) {
    http_response_code(429);

    if (!headers_sent()) {
        header('Retry-After: ' . $exception->retryAfterSeconds());
    }

    $retryAfterMinutes = max(1, (int) ceil($exception->retryAfterSeconds() / 60));
    ?>
    <!doctype html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Espera un momento | Falles360</title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                background: linear-gradient(180deg, #ffffff 0%, #f7f4f1 100%);
                color: #1a110a;
                font-family: "DM Sans", Arial, sans-serif;
            }
            .card {
                width: min(100%, 480px);
                padding: 28px;
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 24px;
                background: rgba(255, 255, 255, 0.94);
                box-shadow: 0 28px 90px -42px rgba(26, 17, 10, 0.42);
            }
            h1 {
                margin: 0 0 12px;
                font-size: clamp(2rem, 6vw, 3rem);
                line-height: 0.95;
            }
            p {
                margin: 0 0 14px;
                line-height: 1.65;
                color: #4a3d34;
            }
            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 20px;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.95rem 1.25rem;
                border-radius: 999px;
                text-decoration: none;
                font-weight: 800;
            }
            .btn-primary {
                background: #f05a28;
                color: #fff;
            }
            .btn-secondary {
                border: 1px solid rgba(0, 0, 0, 0.1);
                color: #1a110a;
                background: #fff;
            }
        </style>
    </head>
    <body>
        <main class="card">
            <h1>Espera un momento.</h1>
            <p><?php echo htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8'); ?></p>
            <p>Puedes volver a intentarlo dentro de unos <?php echo $retryAfterMinutes; ?> minuto(s) o entrar con tu cuenta.</p>
            <div class="actions">
                <a class="btn btn-primary" href="./login.php">Ir a login</a>
                <a class="btn btn-secondary" href="./dist/index.html">Volver a la landing</a>
            </div>
        </main>
    </body>
    </html>
    <?php
}
