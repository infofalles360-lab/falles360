<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

require_authentication();

$user = current_user() ?? [];
$id = 0;

try {
    if (isset($_GET['id'])) {
        $id = app_validate_int($_GET['id'], 'id', ['min' => 1]);
    }
} catch (InvalidArgumentException $exception) {
    $id = 0;
}

$falla = $id > 0 ? app_public_fetch_falla_detail($id, $user) : null;

if ($falla === null) {
    redirect_to('./index.php');
}
?>
<!DOCTYPE html>
<html lang="<?php echo h(current_language()); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#fff8f2">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title><?php echo h($falla['name']); ?> | Falles360</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <link rel="stylesheet" href="../public/assets/css/app.css">
</head>
<body class="public-app-body public-app-body--detail">
    <div class="public-app-shell public-app-shell--detail">
        <header class="detail-topbar">
            <a class="detail-back" href="./index.php?falla=<?php echo h((string) $falla['id']); ?>">
                <span><?php echo dashboard_icon('home'); ?></span>
                <strong>Volver al mapa</strong>
            </a>
            <button class="app-round-button detail-favorite" id="detailFavorite" type="button" aria-label="Guardar en favoritos">
                <?php echo dashboard_icon('star'); ?>
            </button>
        </header>

        <main class="detail-page">
            <section class="detail-hero">
                <img src="<?php echo h($falla['image_url']); ?>" alt="<?php echo h($falla['name']); ?>">
                <div class="detail-hero-overlay">
                    <span class="hero-chip">Detalle de falla</span>
                    <strong><?php echo h($falla['section_name']); ?></strong>
                    <p><?php echo h($falla['address']); ?></p>
                </div>
            </section>

            <section class="detail-content">
                <div class="detail-head">
                    <span class="view-eyebrow">Falla destacada</span>
                    <h1><?php echo h($falla['name']); ?></h1>
                    <div class="detail-tags">
                        <span class="detail-tag"><?php echo h(ucfirst($falla['category'])); ?></span>
                        <span class="detail-tag detail-tag--soft"><?php echo h($falla['section_name']); ?></span>
                        <span class="detail-tag detail-tag--soft"><?php echo h($falla['year']); ?></span>
                    </div>
                </div>

                <article class="detail-card">
                    <strong>Descripcion</strong>
                    <p><?php echo h($falla['description']); ?></p>
                </article>

                <div class="detail-grid">
                    <article class="detail-card">
                        <strong>Premio</strong>
                        <p><?php echo h($falla['prize_text']); ?></p>
                    </article>
                    <article class="detail-card">
                        <strong>Direccion</strong>
                        <p><?php echo h($falla['address']); ?></p>
                    </article>
                    <article class="detail-card">
                        <strong>Barrio</strong>
                        <p><?php echo h($falla['neighborhood'] !== '' ? $falla['neighborhood'] : 'Valencia'); ?></p>
                    </article>
                    <article class="detail-card">
                        <strong>Artista</strong>
                        <p><?php echo h($falla['artist_name'] !== '' ? $falla['artist_name'] : 'Pendiente'); ?></p>
                    </article>
                </div>

                <article class="detail-card">
                    <strong>Localizacion</strong>
                    <div id="detailMap" class="detail-map"></div>
                    <div class="detail-actions">
                        <a class="primary-action" href="<?php echo h($falla['route_url']); ?>" target="_blank" rel="noreferrer">Abrir en Google Maps</a>
                        <a class="secondary-action" href="<?php echo h($falla['apple_maps_url']); ?>" target="_blank" rel="noreferrer">Abrir en Apple Maps</a>
                    </div>
                </article>
            </section>
        </main>
    </div>

    <script<?php echo app_csp_nonce_attr(); ?>>
        window.FALLES_DETAIL = <?php echo app_json_encode([
            'falla' => $falla,
            'favoritesEndpoint' => '../api/favorites.php',
        ]); ?>;
    </script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="../public/assets/js/app-detail.js"></script>
</body>
</html>
