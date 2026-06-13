<section class="kpi-grid kpi-grid--compact">
    <?php foreach ($incidents as $incident): ?>
        <article class="panel panel--metric panel--soft">
            <div>
                <strong><?php echo h($incident['value']); ?></strong>
                <span><?php echo h($incident['label']); ?></span>
            </div>
        </article>
    <?php endforeach; ?>
    <article class="panel panel--metric panel--accent">
        <div>
            <strong><?php echo h((string) $session_count); ?></strong>
            <span>Sesiones abiertas</span>
        </div>
    </article>
</section>

<section class="content-grid content-grid--2">
    <article class="panel">
        <div class="panel-head">
            <div>
                <span class="section-tag">Sesiones activas</span>
                <h3>Conexiones abiertas</h3>
            </div>
        </div>
        <div class="timeline-list">
            <?php foreach ($sessions as $session): ?>
                <div class="timeline-item" data-search-row="<?php echo h(strtolower(($session['name'] ?? '') . ' ' . ($session['ip_address'] ?? ''))); ?>">
                    <span class="timeline-icon"><?php echo dashboard_icon('shield'); ?></span>
                    <div>
                        <strong><?php echo h($session['name'] ?? 'Sesion anonima'); ?></strong>
                        <p><?php echo h($session['ip_address'] ?? 'IP no disponible'); ?></p>
                    </div>
                    <small><?php echo h(dashboard_format_datetime($session['expires_at'] ?? null, 'Sin vencimiento')); ?></small>
                </div>
            <?php endforeach; ?>
        </div>
    </article>

    <article class="panel panel--soft">
        <div class="panel-head">
            <div>
                <span class="section-tag">Trazas</span>
                <h3>Ultimas acciones del sistema</h3>
            </div>
        </div>
        <div class="timeline-list">
            <?php foreach ($activity as $item): ?>
                <div class="timeline-item" data-search-row="<?php echo h(strtolower(($item['name'] ?? '') . ' ' . ($item['details'] ?? '') . ' ' . ($item['action_type'] ?? ''))); ?>">
                    <span class="timeline-icon"><?php echo dashboard_icon('spark'); ?></span>
                    <div>
                        <strong><?php echo h($item['name'] ?? 'Sistema'); ?></strong>
                        <p><?php echo h($item['details'] ?: $item['action_type']); ?></p>
                    </div>
                    <small><?php echo h(dashboard_format_datetime($item['created_at'] ?? null)); ?></small>
                </div>
            <?php endforeach; ?>
        </div>
    </article>
</section>

<section class="panel">
    <div class="panel-head">
        <div>
            <span class="section-tag">Login attempts</span>
            <h3>Ultimos intentos de acceso</h3>
        </div>
    </div>

    <div class="data-grid">
        <div class="data-grid-head" style="grid-template-columns: 1.4fr 1fr 0.8fr 1fr;">
            <span>Email</span>
            <span>IP</span>
            <span>Estado</span>
            <span>Momento</span>
        </div>
        <?php foreach ($attempts as $attempt): ?>
            <div class="data-grid-row" style="grid-template-columns: 1.4fr 1fr 0.8fr 1fr;" data-search-row="<?php echo h(strtolower(($attempt['email'] ?? '') . ' ' . ($attempt['ip_address'] ?? ''))); ?>">
                <div class="data-cell data-cell--lead">
                    <strong><?php echo h($attempt['email']); ?></strong>
                    <small>Intento de autenticacion</small>
                </div>
                <div class="data-cell"><span><?php echo h($attempt['ip_address']); ?></span></div>
                <div class="data-cell">
                    <span class="badge badge--<?php echo (int) ($attempt['success'] ?? 0) === 1 ? 'success' : 'danger'; ?>">
                        <?php echo (int) ($attempt['success'] ?? 0) === 1 ? 'Correcto' : 'Fallido'; ?>
                    </span>
                </div>
                <div class="data-cell"><span><?php echo h(dashboard_format_datetime($attempt['attempted_at'] ?? null)); ?></span></div>
            </div>
        <?php endforeach; ?>
    </div>
</section>
