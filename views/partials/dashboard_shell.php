<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="<?php echo h($lang); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo h($page['title']); ?> | Falles360</title>
    <link rel="stylesheet" href="<?php echo h(dashboard_asset_url('css/dashboard.css')); ?>">
</head>
<body class="dashboard-body dashboard-body--<?php echo h($access); ?>">
    <div class="dashboard-halo dashboard-halo--one"></div>
    <div class="dashboard-halo dashboard-halo--two"></div>

    <div class="dashboard-shell">
        <aside class="sidebar" data-sidebar>
            <div class="sidebar-brand">
                <div class="sidebar-brand-mark">F</div>
                <div>
                    <strong>Falles360</strong>
                    <span><?php echo h($access === 'guest' ? 'App publica' : 'Control premium'); ?></span>
                </div>
            </div>

            <nav class="sidebar-nav">
                <?php foreach ($navigation as $key => $item): ?>
                    <a
                        class="sidebar-link <?php echo $section === $key ? 'is-active' : ''; ?>"
                        href="<?php echo h(dashboard_url($key)); ?>"
                    >
                        <span class="sidebar-link-icon"><?php echo dashboard_icon($item['icon']); ?></span>
                        <span class="sidebar-link-copy">
                            <strong><?php echo h($item['label']); ?></strong>
                            <small><?php echo h($item['hint']); ?></small>
                        </span>
                    </a>
                <?php endforeach; ?>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-account">
                    <div class="avatar-badge"><?php echo h(dashboard_initials((string) ($user['name'] ?? 'Falles360'))); ?></div>
                    <div>
                        <strong><?php echo h((string) ($user['name'] ?? 'Invitado')); ?></strong>
                        <span><?php echo h(dashboard_role_label($user)); ?></span>
                    </div>
                </div>

                <a class="sidebar-logout" href="<?php echo h(dashboard_logout_url()); ?>">
                    <span><?php echo dashboard_icon('logout'); ?></span>
                    Cerrar sesion
                </a>
            </div>
        </aside>

        <div class="dashboard-main">
            <header class="topbar">
                <div class="topbar-left">
                    <button class="menu-toggle" type="button" data-sidebar-toggle aria-label="Abrir menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <label class="search-box">
                        <span class="search-icon"><?php echo dashboard_icon('search'); ?></span>
                        <input id="dashboard-search" type="search" placeholder="<?php echo h($searchPlaceholder); ?>">
                    </label>
                </div>

                <div class="topbar-right">
                    <div class="chip-row">
                        <?php foreach (dashboard_topbar_chips($access) as $chip): ?>
                            <span class="mini-chip"><?php echo h($chip); ?></span>
                        <?php endforeach; ?>
                    </div>

                    <button class="notification-pill" type="button">
                        <span><?php echo dashboard_icon('bell'); ?></span>
                        <strong><?php echo h((string) $notificationCount); ?></strong>
                    </button>

                    <form class="language-switch" method="get" action="">
                        <input type="hidden" name="section" value="<?php echo h($section); ?>">
                        <select id="lang" name="lang" onchange="this.form.submit()">
                            <?php foreach ($languages as $code => $label): ?>
                                <option value="<?php echo h($code); ?>" <?php echo $lang === $code ? 'selected' : ''; ?>>
                                    <?php echo h($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </form>

                    <a class="profile-pill" href="<?php echo h(dashboard_url('profile')); ?>">
                        <span class="profile-pill-avatar"><?php echo h(dashboard_initials((string) ($user['name'] ?? 'Falles360'))); ?></span>
                        <span>
                            <strong><?php echo h((string) ($user['name'] ?? 'Invitado')); ?></strong>
                            <small><?php echo h(dashboard_role_label($user)); ?></small>
                        </span>
                    </a>
                </div>
            </header>

            <main class="content-shell">
                <section class="page-intro">
                    <div>
                        <span class="page-intro-eyebrow"><?php echo h($page['eyebrow']); ?></span>
                        <h1><?php echo h($page['title']); ?></h1>
                        <p><?php echo h($page['description']); ?></p>
                    </div>

                    <div class="page-intro-card">
                        <span class="page-intro-card-icon"><?php echo dashboard_icon('spark'); ?></span>
                        <div>
                            <strong><?php echo h($access === 'guest' ? 'Experiencia app' : 'Panel conectado'); ?></strong>
                            <p>
                                <?php echo h($access === 'guest'
                                    ? 'Vista publica conectada al login, lista para favoritos, agenda y personalizacion.'
                                    : 'El panel usa la sesion real del login y esta preparado para CRUD modular y datos de MySQL.'); ?>
                            </p>
                        </div>
                    </div>
                </section>

                <?php
                extract($contentData, EXTR_SKIP);
                require $contentView;
                ?>
            </main>
        </div>
    </div>

    <div class="sidebar-overlay" data-sidebar-overlay></div>
    <script src="<?php echo h(dashboard_asset_url('js/dashboard.js')); ?>"></script>
</body>
</html>
