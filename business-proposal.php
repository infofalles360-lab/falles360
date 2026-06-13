<?php
declare(strict_types=1);

require_once __DIR__ . '/backend/bootstrap.php';
require_once __DIR__ . '/panel/repository.php';

panel_ensure_marketplace_tables();

function business_proposal_h(string|null|int|float $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function business_proposal_value(string $key, array $data): string
{
    return business_proposal_h((string) ($data[$key] ?? ''));
}

function business_proposal_notify_admins(array $lead): void
{
    try {
        $statement = db()->query("SELECT email FROM users WHERE role IN ('admin', 'support') AND status = 'active' AND email <> ''");
        $emails = array_column($statement->fetchAll() ?: [], 'email');
    } catch (Throwable) {
        $emails = [];
    }

    $emails = array_values(array_unique(array_filter(array_map('strval', $emails))));
    if ($emails === []) {
        return;
    }

    $subject = 'Nueva propuesta marketplace Falles360';
    $body = implode("\n", [
        'Ha llegado una nueva propuesta para aparecer en Falles360.',
        '',
        'Negocio: ' . (string) ($lead['business_name'] ?? ''),
        'Contacto: ' . (string) ($lead['contact_name'] ?? ''),
        'Email: ' . (string) ($lead['email'] ?? ''),
        'Telefono: ' . (string) ($lead['phone'] ?? ''),
        'Tipo: ' . (string) ($lead['business_type'] ?? ''),
        'Zona: ' . (string) ($lead['location'] ?? ''),
        'Interes: ' . (string) ($lead['proposal_type'] ?? ''),
        '',
        'Propuesta:',
        (string) ($lead['message'] ?? ''),
        '',
        'Revisala en el panel de administracion, modulo Propuestas marketplace.',
    ]);

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Falles360 <no-reply@falles360.local>',
    ];

    foreach ($emails as $email) {
        @mail($email, $subject, $body, implode("\r\n", $headers));
    }
}

$proposalOptions = [
    'cupon' => 'Cupón u oferta',
    'sponsor' => 'Patrocinio destacado',
    'producto' => 'Producto o merchandising',
    'experiencia' => 'Experiencia o reserva',
    'otro' => 'Otra colaboración',
];

$data = [
    'business_name' => '',
    'contact_name' => '',
    'email' => '',
    'phone' => '',
    'business_type' => '',
    'location' => '',
    'proposal_type' => 'cupon',
    'message' => '',
];
$errors = [];
$submitted = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        csrf_assert_valid('El formulario ha expirado. Recarga la pagina e intentalo de nuevo.');
        rate_limit_enforce('business_proposal_submit', [
            ['scope' => 'ip', 'max' => 5, 'window' => 3600, 'block_for' => 3600],
        ]);

        $data = [
            'business_name' => app_validate_string($_POST['business_name'] ?? '', 'Nombre del negocio', ['max' => 190, 'normalize_spaces' => true]),
            'contact_name' => app_validate_string($_POST['contact_name'] ?? '', 'Persona de contacto', ['max' => 190, 'normalize_spaces' => true]),
            'email' => app_validate_email($_POST['email'] ?? '', 'Email'),
            'phone' => app_validate_string($_POST['phone'] ?? '', 'Telefono', ['allow_empty' => true, 'max' => 60, 'normalize_spaces' => true]),
            'business_type' => app_validate_string($_POST['business_type'] ?? '', 'Tipo de negocio', ['allow_empty' => true, 'max' => 90, 'normalize_spaces' => true]),
            'location' => app_validate_string($_POST['location'] ?? '', 'Zona', ['allow_empty' => true, 'max' => 160, 'normalize_spaces' => true]),
            'proposal_type' => app_validate_enum($_POST['proposal_type'] ?? 'cupon', 'Interes', array_keys($proposalOptions)),
            'message' => app_validate_string($_POST['message'] ?? '', 'Propuesta', ['max' => 1600]),
        ];

        $insert = db()->prepare(
            'INSERT INTO marketplace_leads (
                business_name,
                contact_name,
                email,
                phone,
                business_type,
                location,
                proposal_type,
                message,
                source,
                status
            ) VALUES (
                :business_name,
                :contact_name,
                :email,
                :phone,
                :business_type,
                :location,
                :proposal_type,
                :message,
                :source,
                :status
            )'
        );
        $insert->execute([
            'business_name' => $data['business_name'],
            'contact_name' => $data['contact_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'business_type' => $data['business_type'],
            'location' => $data['location'],
            'proposal_type' => $data['proposal_type'],
            'message' => $data['message'],
            'source' => 'landing',
            'status' => 'new',
        ]);

        business_proposal_notify_admins($data);
        $submitted = true;
        $data = array_map(static fn (): string => '', $data);
        $data['proposal_type'] = 'cupon';
    } catch (RateLimitExceededException $exception) {
        $errors[] = $exception->getMessage();
    } catch (InvalidArgumentException $exception) {
        $errors[] = $exception->getMessage();
    } catch (Throwable $exception) {
        error_log('Business proposal submit failed: ' . $exception->getMessage());
        $errors[] = 'No hemos podido guardar la propuesta. Intentalo de nuevo en unos minutos.';
    }
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Aparecer en Falles360</title>
    <meta name="description" content="Envia tu propuesta para aparecer en el marketplace de Falles360 durante Fallas.">
    <style>
        :root {
            --ink: #1a110a;
            --muted: #7a6a60;
            --line: rgba(26, 17, 10, .12);
            --brand: #f05a28;
            --brand-dark: #c03e15;
            --bg: #fff8f4;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
                radial-gradient(circle at 82% 8%, rgba(240, 90, 40, .16), transparent 30%),
                linear-gradient(135deg, #fff, var(--bg));
            color: var(--ink);
        }
        a { color: inherit; }
        .shell {
            width: min(1120px, calc(100% - 32px));
            margin: 0 auto;
            padding: 28px 0 56px;
        }
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 48px;
        }
        .brand {
            font-weight: 950;
            letter-spacing: .14em;
            text-decoration: none;
        }
        .brand span { color: var(--brand); }
        .back {
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 10px 14px;
            background: rgba(255, 255, 255, .72);
            color: var(--muted);
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
        }
        .grid {
            display: grid;
            grid-template-columns: .86fr 1.14fr;
            gap: 36px;
            align-items: start;
        }
        .eyebrow {
            display: inline-flex;
            border: 1px solid rgba(240, 90, 40, .24);
            border-radius: 999px;
            padding: 8px 12px;
            background: rgba(240, 90, 40, .08);
            color: var(--brand-dark);
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .12em;
        }
        h1 {
            margin: 22px 0 18px;
            max-width: 680px;
            font-size: clamp(48px, 9vw, 92px);
            line-height: .9;
            letter-spacing: -.06em;
        }
        h1 span { color: var(--brand); }
        .lead {
            max-width: 620px;
            color: var(--muted);
            font-size: 18px;
            line-height: 1.65;
        }
        .points {
            display: grid;
            gap: 12px;
            margin-top: 28px;
        }
        .points div {
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
            background: rgba(255, 255, 255, .68);
            box-shadow: 0 18px 42px -36px rgba(26, 17, 10, .45);
        }
        .points strong { display: block; margin-bottom: 4px; }
        .points small { color: var(--muted); line-height: 1.45; }
        .card {
            border: 1px solid rgba(240, 90, 40, .18);
            border-radius: 28px;
            padding: 28px;
            background: rgba(255, 255, 255, .9);
            box-shadow: 0 28px 80px -48px rgba(26, 17, 10, .45);
        }
        .notice {
            margin-bottom: 18px;
            border-radius: 18px;
            padding: 14px 16px;
            font-size: 14px;
            font-weight: 800;
        }
        .notice--ok {
            background: #eaf8f0;
            color: #17643e;
        }
        .notice--error {
            background: #fff1ea;
            color: var(--brand-dark);
        }
        form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }
        label {
            display: grid;
            gap: 8px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 900;
        }
        label.wide { grid-column: 1 / -1; }
        input, select, textarea {
            width: 100%;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 13px 14px;
            background: #fff;
            color: var(--ink);
            font: inherit;
            outline: none;
        }
        textarea { min-height: 150px; resize: vertical; }
        input:focus, select:focus, textarea:focus {
            border-color: rgba(240, 90, 40, .52);
            box-shadow: 0 0 0 4px rgba(240, 90, 40, .1);
        }
        .actions {
            grid-column: 1 / -1;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 14px;
            margin-top: 6px;
        }
        button {
            border: 0;
            border-radius: 999px;
            padding: 14px 20px;
            background: var(--brand);
            color: #fff;
            font: inherit;
            font-weight: 950;
            cursor: pointer;
        }
        .hint {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.5;
        }
        @media (max-width: 860px) {
            .grid { grid-template-columns: 1fr; }
            .topbar { margin-bottom: 32px; }
            form { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <main class="shell">
        <nav class="topbar">
            <a class="brand" href="./dist/index.html">FALLES<span>360</span></a>
            <a class="back" href="./dist/index.html#marketplace">Volver a la landing</a>
        </nav>

        <div class="grid">
            <section>
                <div class="eyebrow">Marketplace Falles360</div>
                <h1>Aparece donde la gente <span>decide su ruta.</span></h1>
                <p class="lead">
                    Envia tu propuesta y la revisaremos para activarla como cupon, sponsor, producto,
                    experiencia o negocio destacado dentro de Falles360.
                </p>
                <div class="points">
                    <div>
                        <strong>Propuestas revisadas por el equipo</strong>
                        <small>Recibimos los datos en el panel de administracion para valorar encaje, ubicacion y formato.</small>
                    </div>
                    <div>
                        <strong>Preparado para negocios locales</strong>
                        <small>Restaurantes, tiendas, experiencias, marcas y colaboradores cerca de rutas falleras.</small>
                    </div>
                    <div>
                        <strong>Conversion medible</strong>
                        <small>Cupones, reservas, productos y patrocinios pensados para activarse durante la semana grande.</small>
                    </div>
                </div>
            </section>

            <section class="card">
                <?php if ($submitted): ?>
                    <div class="notice notice--ok">Propuesta recibida. La revisaremos y contactaremos contigo.</div>
                <?php endif; ?>
                <?php foreach ($errors as $error): ?>
                    <div class="notice notice--error"><?php echo business_proposal_h($error); ?></div>
                <?php endforeach; ?>

                <form method="post" action="./business-proposal.php" novalidate>
                    <?php echo csrf_token_input(); ?>
                    <label>
                        Negocio *
                        <input name="business_name" required maxlength="190" value="<?php echo business_proposal_value('business_name', $data); ?>" placeholder="Nombre comercial">
                    </label>
                    <label>
                        Persona de contacto *
                        <input name="contact_name" required maxlength="190" value="<?php echo business_proposal_value('contact_name', $data); ?>" placeholder="Nombre y apellidos">
                    </label>
                    <label>
                        Email *
                        <input type="email" name="email" required maxlength="190" value="<?php echo business_proposal_value('email', $data); ?>" placeholder="tu@email.com">
                    </label>
                    <label>
                        Telefono
                        <input name="phone" maxlength="60" value="<?php echo business_proposal_value('phone', $data); ?>" placeholder="+34 ...">
                    </label>
                    <label>
                        Tipo de negocio
                        <input name="business_type" maxlength="90" value="<?php echo business_proposal_value('business_type', $data); ?>" placeholder="Restaurante, tienda, tour, sponsor...">
                    </label>
                    <label>
                        Zona
                        <input name="location" maxlength="160" value="<?php echo business_proposal_value('location', $data); ?>" placeholder="Ruzafa, Carmen, centro, online...">
                    </label>
                    <label class="wide">
                        Que quieres activar
                        <select name="proposal_type">
                            <?php foreach ($proposalOptions as $value => $label): ?>
                                <option value="<?php echo business_proposal_h($value); ?>" <?php echo ($data['proposal_type'] ?? '') === $value ? 'selected' : ''; ?>>
                                    <?php echo business_proposal_h($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label class="wide">
                        Propuesta *
                        <textarea name="message" required maxlength="1600" placeholder="Cuenta que quieres ofrecer, fechas, condiciones, zona, presupuesto aproximado o cualquier detalle util."><?php echo business_proposal_value('message', $data); ?></textarea>
                    </label>
                    <div class="actions">
                        <button type="submit">Enviar propuesta</button>
                        <p class="hint">Guardaremos la solicitud en el panel de administracion y, si hay email configurado, avisaremos a los administradores.</p>
                    </div>
                </form>
            </section>
        </div>
    </main>
</body>
</html>
