<?php
$columns = $definition['columns'] ?? [];
$gridTemplate = '1.45fr ' . implode(' ', array_fill(0, max(0, count($columns) - 1), 'minmax(104px,1fr)')) . ' 150px';
?>
<section class="content-grid content-grid--2-wide">
    <article class="panel">
        <div class="panel-head panel-head--spread">
            <div>
                <span class="section-tag">Modulo CRUD</span>
                <h3><?php echo h($definition['composer_title'] ?? 'Gestion'); ?></h3>
            </div>
            <div class="stat-chip-row">
                <?php foreach ($stats as $stat): ?>
                    <div class="stat-chip">
                        <strong><?php echo h($stat['value']); ?></strong>
                        <span><?php echo h($stat['label']); ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="filter-bar">
            <?php foreach (($definition['filters'] ?? []) as $filter): ?>
                <button class="filter-pill" type="button"><?php echo h($filter); ?></button>
            <?php endforeach; ?>
        </div>

        <?php if ($scope_note): ?>
            <div class="scope-note"><?php echo h($scope_note); ?></div>
        <?php endif; ?>

        <?php if ($rows !== []): ?>
            <div class="data-grid">
                <div class="data-grid-head" style="grid-template-columns: <?php echo h($gridTemplate); ?>;">
                    <?php foreach ($columns as $column): ?>
                        <span><?php echo h($column); ?></span>
                    <?php endforeach; ?>
                    <span>Acciones</span>
                </div>

                <?php foreach ($rows as $row): ?>
                    <?php
                    $searchable = strtolower($row['title'] . ' ' . $row['subtitle']);
                    foreach ($row['cells'] as $cell) {
                        $searchable .= ' ' . strtolower((string) ($cell['value'] ?? ''));
                    }
                    ?>
                    <div class="data-grid-row" style="grid-template-columns: <?php echo h($gridTemplate); ?>;" data-search-row="<?php echo h($searchable); ?>">
                        <div class="data-cell data-cell--lead">
                            <strong><?php echo h($row['title']); ?></strong>
                            <small><?php echo h($row['subtitle']); ?></small>
                        </div>
                        <?php foreach ($row['cells'] as $cell): ?>
                            <div class="data-cell">
                                <?php if (isset($cell['tone'])): ?>
                                    <span class="badge badge--<?php echo h($cell['tone']); ?>"><?php echo h((string) $cell['value']); ?></span>
                                <?php else: ?>
                                    <span><?php echo h((string) $cell['value']); ?></span>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                        <div class="data-actions">
                            <?php foreach ($row['actions'] as $action): ?>
                                <button type="button"><?php echo h($action); ?></button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="empty-state">
                <strong><?php echo h($definition['empty_title'] ?? 'Sin datos'); ?></strong>
                <p><?php echo h($definition['empty_copy'] ?? 'Todavia no hay registros.'); ?></p>
            </div>
        <?php endif; ?>
    </article>

    <aside class="stack-panel">
        <article class="panel panel--soft" id="composer">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Composer</span>
                    <h3><?php echo h($definition['composer_title'] ?? 'Editor'); ?></h3>
                    <p><?php echo h($definition['composer_copy'] ?? 'Formulario base.'); ?></p>
                </div>
            </div>

            <form class="composer-form" action="#" method="post">
                <?php foreach (($definition['form_sections'] ?? []) as $formSection): ?>
                    <fieldset class="form-section">
                        <legend><?php echo h($formSection['title']); ?></legend>
                        <div class="form-grid">
                            <?php foreach ($formSection['fields'] as $field): ?>
                                <label class="form-field <?php echo ($field['type'] ?? 'text') === 'textarea' ? 'form-field--full' : ''; ?>">
                                    <span><?php echo h($field['label']); ?></span>
                                    <?php if (($field['type'] ?? 'text') === 'select'): ?>
                                        <select>
                                            <?php foreach ($field['options'] as $option): ?>
                                                <option><?php echo h($option); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    <?php elseif (($field['type'] ?? 'text') === 'textarea'): ?>
                                        <textarea rows="<?php echo h((string) ($field['rows'] ?? 4)); ?>" placeholder="<?php echo h($field['placeholder'] ?? ''); ?>"></textarea>
                                    <?php else: ?>
                                        <input type="<?php echo h($field['type'] ?? 'text'); ?>" placeholder="<?php echo h($field['placeholder'] ?? ''); ?>">
                                    <?php endif; ?>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                <?php endforeach; ?>

                <div class="composer-actions">
                    <button type="button" class="button-primary">Guardar estructura</button>
                    <button type="button" class="button-secondary">Limpiar</button>
                </div>
            </form>
        </article>

        <article class="panel">
            <div class="panel-head">
                <div>
                    <span class="section-tag">Lineas de trabajo</span>
                    <h3>Lo que ya deja resuelto esta pantalla</h3>
                </div>
            </div>
            <ul class="bullet-list">
                <?php foreach (($definition['highlights'] ?? []) as $highlight): ?>
                    <li><?php echo h($highlight); ?></li>
                <?php endforeach; ?>
            </ul>
        </article>
    </aside>
</section>
