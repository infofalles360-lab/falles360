<section class="content-grid content-grid--2">
    <article class="panel panel--accent">
        <div class="profile-hero">
            <div class="profile-avatar"><?php echo h(dashboard_initials((string) $account['name'])); ?></div>
            <div>
                <span class="section-tag">Cuenta activa</span>
                <h2><?php echo h($account['name']); ?></h2>
                <p><?php echo h($account['email']); ?> · <?php echo h($account['role']); ?></p>
            </div>
        </div>

        <div class="hero-stat-row">
            <div class="hero-stat">
                <div>
                    <strong><?php echo h($account['access']); ?></strong>
                    <small>Modo de acceso</small>
                </div>
            </div>
            <div class="hero-stat">
                <div>
                    <strong><?php echo h($account['logged_at']); ?></strong>
                    <small>Sesion iniciada</small>
                </div>
            </div>
        </div>
    </article>

    <article class="panel panel--soft">
        <div class="panel-head">
            <div>
                <span class="section-tag">Editar perfil</span>
                <h3>Datos visibles</h3>
            </div>
        </div>
        <form class="composer-form" action="#" method="post">
            <div class="form-grid">
                <label class="form-field">
                    <span>Nombre visible</span>
                    <input type="text" value="<?php echo h($account['name']); ?>">
                </label>
                <label class="form-field">
                    <span>Email</span>
                    <input type="email" value="<?php echo h($account['email']); ?>">
                </label>
                <label class="form-field">
                    <span>Nueva contrasena</span>
                    <input type="password" placeholder="********">
                </label>
                <label class="form-field">
                    <span>Idioma principal</span>
                    <select>
                        <option><?php echo h(language_label($lang)); ?></option>
                    </select>
                </label>
            </div>
            <div class="composer-actions">
                <button class="button-primary" type="button">Guardar cambios</button>
                <button class="button-secondary" type="button">Cerrar sesion</button>
            </div>
        </form>
    </article>
</section>

<section class="kpi-grid kpi-grid--compact">
    <?php foreach ($panels as $panel): ?>
        <article class="panel panel--metric panel--default">
            <div>
                <strong><?php echo h($panel['value']); ?></strong>
                <span><?php echo h($panel['label']); ?></span>
                <small><?php echo h($panel['copy']); ?></small>
            </div>
        </article>
    <?php endforeach; ?>
</section>

<section class="content-grid content-grid--2">
    <article class="panel">
        <div class="panel-head">
            <div>
                <span class="section-tag">Sesiones</span>
                <h3>Dispositivos recientes</h3>
            </div>
        </div>
        <div class="timeline-list">
            <?php if ($sessions === []): ?>
                <div class="empty-state compact">
                    <strong>Sin sesiones persistentes</strong>
                    <p>El acceso invitado usa una sesion temporal y no registra dispositivos en la tabla de usuarios.</p>
                </div>
            <?php else: ?>
                <?php foreach ($sessions as $session): ?>
                    <div class="timeline-item" data-search-row="<?php echo h(strtolower(($session['ip_address'] ?? '') . ' ' . ($session['user_agent'] ?? ''))); ?>">
                        <span class="timeline-icon"><?php echo dashboard_icon('shield'); ?></span>
                        <div>
                            <strong><?php echo h($session['ip_address'] ?? 'IP no disponible'); ?></strong>
                            <p><?php echo h(substr((string) ($session['user_agent'] ?? 'Navegador desconocido'), 0, 60)); ?></p>
                        </div>
                        <small><?php echo h(dashboard_format_datetime($session['expires_at'] ?? null)); ?></small>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </article>

    <article class="panel panel--soft">
        <div class="panel-head">
            <div>
                <span class="section-tag">Actividad propia</span>
                <h3>Ultimas acciones de la cuenta</h3>
            </div>
        </div>
        <div class="timeline-list">
            <?php if ($activity === []): ?>
                <div class="empty-state compact">
                    <strong>Sin actividad registrada</strong>
                    <p>Cuando empieces a usar el panel, las trazas propias apareceran aqui.</p>
                </div>
            <?php else: ?>
                <?php foreach ($activity as $item): ?>
                    <div class="timeline-item" data-search-row="<?php echo h(strtolower(($item['action_type'] ?? '') . ' ' . ($item['details'] ?? ''))); ?>">
                        <span class="timeline-icon"><?php echo dashboard_icon('spark'); ?></span>
                        <div>
                            <strong><?php echo h($item['action_type'] ?? 'Accion'); ?></strong>
                            <p><?php echo h($item['details'] ?: 'Registro de actividad'); ?></p>
                        </div>
                        <small><?php echo h(dashboard_format_datetime($item['created_at'] ?? null)); ?></small>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </article>
</section>
