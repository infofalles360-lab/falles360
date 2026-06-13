<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

const GEO_PORTAL_DEFAULT_SOURCE = __DIR__ . '/../tmp-fallas-mapserver.geojson';

function geoportal_load_features(string $source): array
{
    if (!is_file($source)) {
        throw new RuntimeException('No se encontro el fichero GeoJSON: ' . $source);
    }

    $payload = json_decode((string) file_get_contents($source), true);

    if (!is_array($payload) || !isset($payload['features']) || !is_array($payload['features'])) {
        throw new RuntimeException('El GeoJSON no tiene un formato valido.');
    }

    return $payload['features'];
}

function geoportal_normalize(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $replacements = [
        'A.' => 'Avinguda',
        'Av.' => 'Avinguda',
        'Avda' => 'Avinguda',
        'Pl.' => 'Plaça',
        'Dr.' => 'Doctor',
        'Dr' => 'Doctor',
        'Sta.' => 'Santa',
        'Sta' => 'Santa',
        'S.' => 'Sant',
        'Mª' => 'Maria',
        'M.ª' => 'Maria',
        ' y ' => ' i ',
        'Port de Sta María' => 'Puerto de Santa Maria',
        'Port de Sta Maria' => 'Puerto de Santa Maria',
    ];

    $value = strtr($value, $replacements);
    $value = str_replace(['·', '’', "'"], ' ', $value);
    $value = preg_replace('/[.,;:\/()]+/u', ' ', $value) ?? $value;
    $value = preg_replace('/[-–—]+/u', ' ', $value) ?? $value;

    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($ascii !== false) {
        $value = $ascii;
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value) ?? $value;
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;

    return trim($value);
}

function geoportal_section_matches(string $dbSection, string $geoSection): bool
{
    $dbSection = trim($dbSection);
    $geoSection = trim($geoSection);

    if ($dbSection === '' || $geoSection === '') {
        return false;
    }

    if ($dbSection === $geoSection) {
        return true;
    }

    return $dbSection === 'Especial' && $geoSection === 'E';
}

function geoportal_token_score(string $left, string $right): float
{
    $leftTokens = array_values(array_unique(array_filter(explode(' ', $left))));
    $rightTokens = array_values(array_unique(array_filter(explode(' ', $right))));

    $intersection = array_intersect($leftTokens, $rightTokens);
    $union = array_unique(array_merge($leftTokens, $rightTokens));
    $jaccard = count($union) > 0 ? count($intersection) / count($union) : 0.0;

    similar_text($left, $right, $similarity);

    return ($jaccard * 100 * 0.65) + ($similarity * 0.35);
}

function geoportal_aliases(): array
{
    return [
        'A. Regne de València - Duc de Calàbria' => 'Avinguda Regne de València-Duc de Calàbria',
        'A.Jacinto Benavente-Regina Na Germana' => 'Avinguda Jacinto Benavente-Regina Na Germana',
        'Carrera de S.Lluís-A. Doctor Waksman' => 'Carrera de Sant Lluís-Avinguda Doctor Waksman',
        'Menéndez i Pelaio-Avinguda Catalunya' => 'Menéndez y Pelayo-Avinguda Catalunya',
        'Pl.Segòvia-Avinguda Dr.Tomàs Sala' => 'Plaça Segòvia-Avinguda Doctor Tomàs Sala',
        'S.Vicent de Paül-Dip. Clara Campoamor' => 'Sant Vicent de Paül-Dip. Clara Campoamor',
        'A.Tarongers-Universitat Politècnica' => 'Avinguda Tarongers-Universitat Politècnica',
        'A. Primat Reig-Sant Vicent de Paül' => 'Avinguda Primat Reig-Sant Vicent de Paül',
        'G.Tejero Langarita - Vicente Chuliá' => 'Gonzalo Tejero Langarita - Vicente Chuliá Campos',
        'República Argentina-Dr.Pallarés Iranzo' => 'República Argentina-Doctor Pallarés Iranzo',
        "Pl.d'Espanya-Ramón y Cajal-P.Benedito" => "Plaça d'Espanya-Ramón y Cajal-Pintor Benedito",
        'A. de Valladolid-Enginyer Vicent Pichó' => 'Avinguda de Valladolid-Enginyer Vicent Pichó',
        'Dr.Manuel Candela-Avinguda del Port' => 'Doctor Manuel Candela-Avinguda del Port',
        'S.Josep de Pignatelli-Dr.Peset Aleixandre' => 'Sant Josep de Pignatelli-Doctor Peset Aleixandre',
        'Dr. Peset Aleixandre-En Guillem Ferrer' => 'Doctor Peset Aleixandre-En Guillem Ferrer',
        "Carretera d'Escrivà-Coop. de S.Ferran" => "Carretera d'Escrivà-Coop. de Sant Ferran",
        'Mare de Déu de la Cabeça-Mortes Lerma' => 'Mare de Déu de la Cabeça-J.M. Mortes Lerma',
        'Marqués de Lozoya-Poeta.Josep Cervera' => 'Marqués de Lozoya-Poeta Josep Cervera i Grifol',
        'Actor Mora-Constitució' => 'Actor Mora-Avinguda Constitució',
        'Av.Regne de València-Mestre Serrano' => 'Avinguda Regne de València-Mestre Serrano',
        "M. Melià i Fuster-Mª Fernanda D'Ocón" => "Manuel Melià i Fuster-María Fernanda D'Ocón",
        'Pobla Valverde-II República Espanyola' => 'Puebla de Valverde-II República Espanyola',
        'Escultor García Mas-Port de Sta María' => 'Escultor García Mas-Puerto de Santa María',
        'A. Pianista Martínez Carrasco-Eslida' => 'Avinguda Pianista Martínez Carrasco-Eslida',
    ];
}

function geoportal_prepare_feature(array $feature): ?array
{
    $properties = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
    $geometry = is_array($feature['geometry'] ?? null) ? $feature['geometry'] : [];
    $coordinates = is_array($geometry['coordinates'] ?? null) ? $geometry['coordinates'] : [];
    $name = trim((string) ($properties['nombre'] ?? ''));

    if ($name === '' || count($coordinates) < 2) {
        return null;
    }

    return [
        'name' => $name,
        'normalized_name' => geoportal_normalize($name),
        'section' => trim((string) ($properties['seccion'] ?? '')),
        'latitude' => (float) $coordinates[1],
        'longitude' => (float) $coordinates[0],
        'image_url' => trim((string) ($properties['boceto'] ?? '')),
        'is_experimental' => (int) ($properties['experim'] ?? 0) === 1,
    ];
}

function geoportal_match_feature(array $row, array $features, array $indexedByName, array $aliases): ?array
{
    $sourceName = (string) ($row['name'] ?? '');
    $lookupName = $aliases[$sourceName] ?? $sourceName;
    $normalizedLookup = geoportal_normalize($lookupName);

    if ($normalizedLookup !== '' && isset($indexedByName[$normalizedLookup])) {
        $candidate = $indexedByName[$normalizedLookup];
        if (geoportal_section_matches((string) ($row['section_name'] ?? ''), $candidate['section'])) {
            return $candidate;
        }
    }

    $dbSection = (string) ($row['section_name'] ?? '');
    $normalizedSource = geoportal_normalize($sourceName);
    $ranked = [];

    foreach ($features as $candidate) {
        $score = geoportal_token_score($normalizedSource, $candidate['normalized_name']);
        if (geoportal_section_matches($dbSection, $candidate['section'])) {
            $score += 10;
        }
        $ranked[] = ['candidate' => $candidate, 'score' => $score];
    }

    usort(
        $ranked,
        static fn (array $left, array $right): int => $right['score'] <=> $left['score']
    );

    $best = $ranked[0] ?? null;
    $second = $ranked[1] ?? null;

    if ($best === null) {
        return null;
    }

    $score = $best['score'];
    $gap = $second === null ? $score : $score - $second['score'];
    $sectionMatched = geoportal_section_matches($dbSection, $best['candidate']['section']);

    if ($sectionMatched && $score >= 80 && $gap >= 6) {
        return $best['candidate'];
    }

    if ($score >= 92 && $gap >= 10) {
        return $best['candidate'];
    }

    return null;
}

function geoportal_category_for_feature(array $row, array $feature): string
{
    $current = strtolower(trim((string) ($row['category'] ?? '')));
    if (in_array($current, ['principal', 'infantil', 'experimental'], true)) {
        return $current;
    }

    return $feature['is_experimental'] ? 'experimental' : 'principal';
}

function geoportal_update_row(PDO $pdo, array $row, array $feature): void
{
    $statement = $pdo->prepare(
        'UPDATE fallas
         SET latitude = :latitude,
             longitude = :longitude,
             category = CASE
                 WHEN COALESCE(NULLIF(TRIM(category), \'\'), \'\') = \'\' THEN :category
                 ELSE category
             END,
             section_name = CASE
                 WHEN COALESCE(NULLIF(TRIM(section_name), \'\'), \'\') = \'\' THEN :section_name
                 ELSE section_name
             END,
             image_url = CASE
                 WHEN COALESCE(NULLIF(TRIM(image_url), \'\'), \'\') = \'\' THEN :image_url
                 ELSE image_url
             END
         WHERE id = :id'
    );

    $statement->execute([
        'id' => (int) $row['id'],
        'latitude' => $feature['latitude'],
        'longitude' => $feature['longitude'],
        'category' => geoportal_category_for_feature($row, $feature),
        'section_name' => $feature['section'] === 'E' ? 'Especial' : $feature['section'],
        'image_url' => $feature['image_url'],
    ]);
}

$source = $argv[1] ?? GEO_PORTAL_DEFAULT_SOURCE;
$features = [];

foreach (geoportal_load_features($source) as $feature) {
    $prepared = geoportal_prepare_feature($feature);
    if ($prepared !== null) {
        $features[] = $prepared;
    }
}

$indexedByName = [];
foreach ($features as $feature) {
    $indexedByName[$feature['normalized_name']] = $feature;
}

$aliases = geoportal_aliases();
$pdo = db();
$rows = $pdo->query('SELECT id, name, section_name, category, image_url FROM fallas ORDER BY id ASC')->fetchAll();

$updated = 0;
$unmatched = [];

foreach ($rows as $row) {
    $match = geoportal_match_feature($row, $features, $indexedByName, $aliases);
    if ($match === null) {
        $unmatched[] = [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'section_name' => (string) ($row['section_name'] ?? ''),
        ];
        continue;
    }

    geoportal_update_row($pdo, $row, $match);
    $updated++;
}

$pdo->exec(
    "UPDATE fallas
     SET category = 'principal'
     WHERE COALESCE(NULLIF(TRIM(category), ''), '') = ''"
);

echo 'Geoportal source: ' . $source . PHP_EOL;
echo 'Total fallas revisadas: ' . count($rows) . PHP_EOL;
echo 'Fallas sincronizadas: ' . $updated . PHP_EOL;
echo 'Fallas sin match: ' . count($unmatched) . PHP_EOL;

if ($unmatched !== []) {
    echo PHP_EOL . 'Pendientes de revisar:' . PHP_EOL;
    foreach ($unmatched as $item) {
        echo '- [' . $item['section_name'] . '] ' . $item['name'] . ' (#' . $item['id'] . ')' . PHP_EOL;
    }
}
