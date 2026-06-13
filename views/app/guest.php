<?php require __DIR__ . '/../partials/home_showcase.php'; ?>
<?php $agendaGroups = dashboard_group_agenda($agenda ?? []); ?>

<section class="kpi-grid kpi-grid--compact">
    <?php foreach ($kpis as $kpi): ?>
        <article class="panel panel--metric panel--<?php echo h($kpi['tone']); ?>">
            <div class="metric-icon"><?php echo dashboard_icon($kpi['icon']); ?></div>
            <div>
                <strong><?php echo h($kpi['value']); ?></strong>
                <span><?php echo h($kpi['label']); ?></span>
            </div>
        </article>
    <?php endforeach; ?>
</section>

<section class="content-grid content-grid--2">
    <article class="panel" id="agenda">
        <div class="panel-head">
            <div>
                <span class="section-tag">Agenda completa</span>
                <h3>Programa fallero</h3>
            </div>
        </div>
        <div class="agenda-list agenda-list--grouped">
            <?php foreach ($agendaGroups as $group): ?>
                <section class="agenda-day-group">
                    <div class="agenda-day-head">
                        <div class="agenda-day-badge">
                            <strong><?php echo h($group['day_number']); ?></strong>
                            <span><?php echo h($group['month_short']); ?></span>
                        </div>
                        <div class="agenda-day-copy">
                            <strong><?php echo h($group['label_long']); ?></strong>
                            <p><?php echo h((string) $group['item_count']); ?> eventos programados</p>
                        </div>
                    </div>

                    <div class="agenda-day-items">
                        <?php foreach ($group['items'] as $event): ?>
                            <div class="agenda-item">
                                <div class="agenda-item-main">
                                    <strong><?php echo h($event['title']); ?></strong>
                                    <p><?php echo h($event['category']); ?> / <?php echo h($event['location']); ?></p>
                                </div>
                                <div class="agenda-item-side">
                                    <span class="badge badge--<?php echo h($event['tone']); ?>"><?php echo h($event['priority']); ?></span>
                                    <small><?php echo h($event['time']); ?></small>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>
        </div>
    </article>

    <article class="panel panel--soft">
        <div class="panel-head">
            <div>
                <span class="section-tag">Tu experiencia</span>
                <h3>Estado rapido</h3>
            </div>
        </div>
        <div class="state-stack">
            <?php foreach ($system_state as $state): ?>
                <div class="state-item">
                    <div>
                        <strong><?php echo h($state['label']); ?></strong>
                        <p><?php echo h($state['copy']); ?></p>
                    </div>
                    <span class="state-value"><?php echo h($state['value']); ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    </article>
</section>

<section class="content-grid content-grid--3">
    <article class="panel panel--map" id="mapa">
        <div class="panel-head">
            <div>
                <span class="section-tag">Mapa</span>
                <h3>Vista previa de zonas</h3>
            </div>
        </div>
        <div class="map-stage">
            <?php foreach ($map_points as $point): ?>
                <button
                    class="map-pin map-pin--<?php echo h($point['kind']); ?>"
                    style="left: <?php echo h((string) $point['x']); ?>%; top: <?php echo h((string) $point['y']); ?>%;"
                    type="button"
                >
                    <span></span>
                </button>
            <?php endforeach; ?>
            <div class="map-grid"></div>
        </div>
        <div class="map-legend">
            <?php foreach ($map_points as $point): ?>
                <div class="map-legend-item">
                    <span class="badge badge--<?php echo h($point['kind'] === 'evento' ? 'soft' : 'accent'); ?>"><?php echo h($point['kind']); ?></span>
                    <div>
                        <strong><?php echo h($point['title']); ?></strong>
                        <small><?php echo h($point['meta']); ?></small>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </article>

    <article class="panel">
        <div class="panel-head">
            <div>
                <span class="section-tag">Favoritos y rutas</span>
                <h3>Listas preparadas</h3>
            </div>
        </div>
        <div class="featured-list">
            <?php foreach ($featured as $feature): ?>
                <div class="featured-item">
                    <div>
                        <strong><?php echo h($feature['name']); ?></strong>
                        <p><?php echo h($feature['meta']); ?></p>
                    </div>
                    <span class="badge badge--<?php echo h(dashboard_badge_tone((string) $feature['status'])); ?>">
                        <?php echo h($feature['status']); ?>
                    </span>
                </div>
            <?php endforeach; ?>
        </div>
    </article>

    <article class="stack-panel">
        <article class="panel panel--soft">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Acciones</span>
                    <h3>Navegacion directa</h3>
                </div>
            </div>
            <div class="action-grid">
                <?php foreach ($quick_actions as $action): ?>
                    <a class="action-card" href="<?php echo h($action['href']); ?>">
                        <span><?php echo dashboard_icon($action['icon']); ?></span>
                        <strong><?php echo h($action['label']); ?></strong>
                    </a>
                <?php endforeach; ?>
            </div>
        </article>

        <article class="panel">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Actividad</span>
                    <h3>Sugerencias recientes</h3>
                </div>
            </div>
            <div class="timeline-list">
                <?php foreach ($recent_activity as $item): ?>
                    <div class="timeline-item">
                        <span class="timeline-icon"><?php echo dashboard_icon($item['icon']); ?></span>
                        <div>
                            <strong><?php echo h($item['title']); ?></strong>
                            <p><?php echo h($item['copy']); ?></p>
                        </div>
                        <small><?php echo h(dashboard_format_datetime($item['time'])); ?></small>
                    </div>
                <?php endforeach; ?>
            </div>
        </article>
    </article>
</section>
