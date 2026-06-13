<?php
declare(strict_types=1);

$mapPreviewPoints = array_slice($map_points ?? [], 0, 4);
$agendaGroups = dashboard_group_agenda($agenda ?? []);
$calendarGroups = array_slice($agendaGroups, 0, 5);
$activeAgendaGroup = $calendarGroups[0] ?? null;
$agendaPreview = $activeAgendaGroup['items'] ?? array_slice($agenda ?? [], 0, 4);
$displayTitle = (string) ($showcase['app_title'] ?? $showcase['right_title'] ?? 'Mis Fallas');
$displaySubtitle = (string) ($showcase['app_subtitle'] ?? $showcase['right_subtitle'] ?? 'Valencia Festival Guide');
$displayMeta = (string) ($showcase['app_meta'] ?? $showcase['meta'] ?? 'Mapa / Agenda');
?>
<section class="showcase-board showcase-board--app">
    <article class="showcase-app-card">
        <div class="showcase-app-head">
            <div class="showcase-title-wrap">
                <span class="showcase-mark"><?php echo dashboard_icon('flame'); ?></span>
                <div>
                    <strong><?php echo h($displayTitle); ?></strong>
                    <span><?php echo h($displaySubtitle); ?></span>
                    <small class="showcase-rating-line">
                        <span class="showcase-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                        <?php echo h($displayMeta); ?>
                    </small>
                </div>
            </div>

            <a class="showcase-link" href="<?php echo h(dashboard_url('home')); ?>">
                <?php echo h($showcase['cta'] ?? 'Ver'); ?>
            </a>
        </div>

        <div class="showcase-phone-gallery">
            <article class="phone-screen phone-screen--map">
                <div class="phone-screen-top">
                    <small>00:52</small>
                    <span><?php echo h($displayTitle); ?></span>
                </div>
                <div class="phone-screen-body phone-screen-body--map">
                    <svg viewBox="0 0 180 320" class="phone-route" aria-hidden="true">
                        <path d="M56 260C84 236 86 208 100 184C114 160 122 142 124 96"></path>
                    </svg>
                    <?php foreach ($mapPreviewPoints as $index => $point): ?>
                        <span
                            class="phone-map-pin <?php echo $index === 2 ? 'is-active' : ''; ?>"
                            style="left: <?php echo h((string) max(16, min(84, $point['x']))); ?>%; top: <?php echo h((string) max(16, min(84, $point['y']))); ?>%;"
                        ></span>
                    <?php endforeach; ?>
                </div>
                <div class="phone-location-list">
                    <?php foreach (array_slice($mapPreviewPoints, 0, 2) as $point): ?>
                        <div class="phone-location-item">
                            <span class="dot"></span>
                            <div>
                                <strong><?php echo h($point['title']); ?></strong>
                                <small><?php echo h($point['meta']); ?></small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <div class="phone-bottom-nav">
                    <span class="is-active"></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </article>

            <article class="phone-screen phone-screen--agenda">
                <div class="phone-screen-top">
                    <small>00:52</small>
                    <span><?php echo h($displayTitle); ?> 2027</span>
                </div>
                <div class="phone-screen-title">
                    <strong><?php echo h($displayTitle); ?> <em>2027</em></strong>
                </div>
                <div class="calendar-card">
                    <div class="calendar-row">
                        <?php foreach ($calendarGroups as $index => $group): ?>
                            <span class="calendar-day <?php echo $index === 0 ? 'is-active' : ''; ?>">
                                <small><?php echo h($group['weekday_short']); ?></small>
                                <strong><?php echo h($group['day_number']); ?></strong>
                                <em><?php echo h((string) $group['item_count']); ?> act.</em>
                            </span>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php if ($activeAgendaGroup !== null): ?>
                    <div class="calendar-summary">
                        <strong><?php echo h($activeAgendaGroup['label_long']); ?></strong>
                        <small><?php echo h((string) $activeAgendaGroup['item_count']); ?> eventos destacados</small>
                    </div>
                <?php endif; ?>
                <div class="agenda-preview-list">
                    <?php foreach ($agendaPreview as $item): ?>
                        <div class="agenda-preview-item">
                            <span class="agenda-preview-dot"></span>
                            <div class="agenda-preview-copy">
                                <strong><?php echo h($item['title']); ?></strong>
                                <small><?php echo h($item['time']); ?> / <?php echo h($item['location']); ?></small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <div class="phone-bottom-nav phone-bottom-nav--light">
                    <span class="is-active"></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </article>

            <article class="phone-screen phone-screen--dark">
                <div class="phone-screen-top phone-screen-top--dark">
                    <small>00:53</small>
                    <span><?php echo h($displayTitle); ?> <em>2027</em></span>
                </div>
                <div class="phone-screen-title phone-screen-title--dark">
                    <strong><?php echo h($displayTitle); ?> <em>2027</em></strong>
                </div>
                <div class="dark-chip-row">
                    <?php foreach ($calendarGroups as $index => $group): ?>
                        <span class="<?php echo $index === 0 ? 'is-active' : ''; ?>">
                            <?php echo h($group['day_number']); ?>
                        </span>
                    <?php endforeach; ?>
                </div>
                <div class="agenda-preview-list agenda-preview-list--dark">
                    <?php foreach ($agendaPreview as $item): ?>
                        <div class="agenda-preview-item agenda-preview-item--dark">
                            <span class="agenda-preview-dot"></span>
                            <div class="agenda-preview-copy">
                                <strong><?php echo h($item['title']); ?></strong>
                                <small><?php echo h($item['time']); ?> / <?php echo h($item['location']); ?></small>
                            </div>
                            <span class="agenda-heart">&#9829;</span>
                        </div>
                    <?php endforeach; ?>
                </div>
                <div class="phone-bottom-nav phone-bottom-nav--dark">
                    <span class="is-active"></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </article>
        </div>

        <div class="showcase-stat-strip">
            <?php foreach ($hero_stats as $stat): ?>
                <div class="showcase-stat-pill">
                    <span><?php echo dashboard_icon($stat['icon']); ?></span>
                    <div>
                        <strong><?php echo h($stat['value']); ?></strong>
                        <small><?php echo h($stat['label']); ?></small>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </article>
</section>
