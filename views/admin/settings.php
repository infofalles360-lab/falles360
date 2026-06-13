<section class="content-grid content-grid--2">
    <?php foreach ($groups as $group): ?>
        <article class="panel <?php echo $group['title'] === 'Experiencia' ? 'panel--accent' : 'panel--soft'; ?>">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Grupo</span>
                    <h3><?php echo h($group['title']); ?></h3>
                    <p><?php echo h($group['copy']); ?></p>
                </div>
            </div>
            <div class="toggle-stack">
                <?php foreach ($group['items'] as $item): ?>
                    <label class="toggle-row">
                        <span>
                            <strong><?php echo h($item['label']); ?></strong>
                        </span>
                        <span class="toggle <?php echo $item['state'] ? 'is-on' : ''; ?>">
                            <span></span>
                        </span>
                    </label>
                <?php endforeach; ?>
            </div>
        </article>
    <?php endforeach; ?>
</section>

<section class="content-grid content-grid--3">
    <?php foreach ($cards as $card): ?>
        <article class="panel">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Estado</span>
                    <h3><?php echo h($card['title']); ?></h3>
                </div>
            </div>
            <p class="panel-copy"><?php echo h($card['copy']); ?></p>
        </article>
    <?php endforeach; ?>
</section>
