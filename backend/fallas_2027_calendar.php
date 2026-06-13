<?php
declare(strict_types=1);

/**
 * Calendario base de Fallas 2027.
 *
 * Actualizado a 2026-06-03 con el programa oficial público de Fallas 2026
 * como base operativa para 2027 en los actos de calendario fijo de marzo.
 *
 * Nota:
 * - A fecha de 2026-06-03 la programación oficial detallada de Fallas 2027
 *   todavía no está publicada.
 * - La Ofrenda de 2027 podría sufrir ajustes si finalmente se aprueba un
 *   tercer día; hasta entonces se replica la estructura oficial de 2026.
 */

function fallas_2027_calendar_metadata(): array
{
    return [
        'updated_at' => '2026-06-03',
        'source_basis' => 'programa_oficial_fallas_2026_como_base_2027',
    ];
}

function fallas_2027_calendar_categories(): array
{
    return [
        ['name' => 'Mascletà', 'agenda_category' => 'mascleta', 'icon' => 'burst', 'color' => '#ff6b00'],
        ['name' => 'Castillo', 'agenda_category' => 'pirotecnia', 'icon' => 'fireworks', 'color' => '#6c5ce7'],
        ['name' => 'Tradición', 'agenda_category' => 'tradicion', 'icon' => 'heritage', 'color' => '#f59e0b'],
        ['name' => 'Visita oficial', 'agenda_category' => 'visita', 'icon' => 'official', 'color' => '#0284c7'],
        ['name' => 'Exposición', 'agenda_category' => 'exposicion', 'icon' => 'museum', 'color' => '#8e44ad'],
        ['name' => 'Plantà', 'agenda_category' => 'planta', 'icon' => 'hammer', 'color' => '#dc2626'],
        ['name' => 'Premios', 'agenda_category' => 'premios', 'icon' => 'award', 'color' => '#16a34a'],
        ['name' => 'Ofrenda', 'agenda_category' => 'ofrenda', 'icon' => 'flowers', 'color' => '#e91e63'],
        ['name' => 'Misa', 'agenda_category' => 'misa', 'icon' => 'church', 'color' => '#475569'],
        ['name' => 'Cremà', 'agenda_category' => 'crema', 'icon' => 'fire', 'color' => '#111827'],
    ];
}

function fallas_2027_calendar_locations(): array
{
    return [
        'plaza_ayuntamiento' => [
            'name' => 'Plaza del Ayuntamiento',
            'address' => "Plaça de l'Ajuntament, València",
            'latitude' => 39.4699070,
            'longitude' => -0.3762880,
        ],
        'museo_ciencias' => [
            'name' => 'Museo de las Ciencias',
            'address' => 'Avinguda del Professor López Piñero, València',
            'latitude' => 39.4541840,
            'longitude' => -0.3506740,
        ],
        'tribuna_ayuntamiento' => [
            'name' => 'Tribuna frente al Ayuntamiento',
            'address' => "Plaça de l'Ajuntament, València",
            'latitude' => 39.4699070,
            'longitude' => -0.3762880,
        ],
        'puente_monteolivete' => [
            'name' => 'Puente de Monteolivete',
            'address' => 'Puente de Monteolivete, València',
            'latitude' => 39.4567810,
            'longitude' => -0.3628610,
        ],
        'centro_ofrenda' => [
            'name' => 'Recorrido de la Ofrenda',
            'address' => 'Calles La Paz y San Vicente Mártir, València',
            'latitude' => 39.4745740,
            'longitude' => -0.3749720,
        ],
        'calle_la_paz' => [
            'name' => 'Calle de la Paz',
            'address' => 'Calle de la Paz, València',
            'latitude' => 39.4749610,
            'longitude' => -0.3726380,
        ],
        'calle_san_vicente' => [
            'name' => 'Calle de San Vicente Mártir',
            'address' => 'Calle de San Vicente Mártir, València',
            'latitude' => 39.4707330,
            'longitude' => -0.3773110,
        ],
        'toda_valencia' => [
            'name' => 'Toda Valencia',
            'address' => 'València',
            'latitude' => 39.4699075,
            'longitude' => -0.3762881,
        ],
        'puente_san_jose' => [
            'name' => 'Puente de San José',
            'address' => 'Puente de San José, València',
            'latitude' => 39.4804370,
            'longitude' => -0.3815450,
        ],
        'catedral' => [
            'name' => 'Catedral de Valencia',
            'address' => "Plaça de l'Almoina, València",
            'latitude' => 39.4759120,
            'longitude' => -0.3758800,
        ],
        'calle_paz_porta_mar' => [
            'name' => 'Calle de la Paz hasta Porta de la Mar',
            'address' => 'Calle de la Paz hasta Porta de la Mar, València',
            'latitude' => 39.4738580,
            'longitude' => -0.3708590,
        ],
        'ciudad_artista_fallero' => [
            'name' => 'Ciudad del Artista Fallero',
            'address' => 'Ciudad del Artista Fallero, València',
            'latitude' => 39.4949820,
            'longitude' => -0.4001580,
        ],
        'central_policia_local' => [
            'name' => 'Central de la Policía Local',
            'address' => 'Avenida del Cid, València',
            'latitude' => 39.4693820,
            'longitude' => -0.4028480,
        ],
        'parque_bomberos' => [
            'name' => 'Parque de Bomberos de la Avenida de la Plata',
            'address' => 'Avenida de la Plata, València',
            'latitude' => 39.4584520,
            'longitude' => -0.3678610,
        ],
        'monumento_segrelles' => [
            'name' => 'Monumento al Pintor Segrelles',
            'address' => 'Plaza del Pintor Segrelles, València',
            'latitude' => 39.4697540,
            'longitude' => -0.3900350,
        ],
        'monumento_maximiliano_thous' => [
            'name' => 'Monumento a Maximiliano Thous',
            'address' => 'Cruce de Sagunto y Maximiliano Thous, València',
            'latitude' => 39.4896170,
            'longitude' => -0.3717150,
        ],
        'monumento_maestro_serrano' => [
            'name' => 'Monumento al Maestro Serrano',
            'address' => 'Avenida del Reino de Valencia, València',
            'latitude' => 39.4622920,
            'longitude' => -0.3631030,
        ],
        'fuerzas_armadas' => [
            'name' => 'Homenaje de las Fuerzas Armadas',
            'address' => 'València',
            'latitude' => 39.4699075,
            'longitude' => -0.3762881,
        ],
        'coches_antigor' => [
            'name' => 'Salida de la Ronda Fallera de Coches de l’Antigor',
            'address' => 'Plaza del Ayuntamiento, València',
            'latitude' => 39.4699070,
            'longitude' => -0.3762880,
        ],
    ];
}

function fallas_2027_calendar_date_range(): array
{
    return [
        'start' => '2027-03-01',
        'end' => '2027-03-19',
        'cleanup_end' => '2027-03-20',
    ];
}

function fallas_2027_calendar_events(): array
{
    $locations = fallas_2027_calendar_locations();
    $events = [];

    for ($day = 1; $day <= 19; $day++) {
        $date = sprintf('2027-03-%02d', $day);
        $events[] = fallas_2027_calendar_event(
            'Mascletà',
            'Mascletà',
            'Mascletà oficial en la Plaza del Ayuntamiento.',
            $date,
            '14:00:00',
            null,
            $locations['plaza_ayuntamiento'],
            true
        );
    }

    $events[] = fallas_2027_calendar_event('Tradición', 'Concurso del Cant de l’Estoreta', 'Concurso tradicional fallero organizado por la falla Plaza del Árbol con patrocinio de JCF.', '2027-03-01', '10:00:00', null, $locations['plaza_ayuntamiento']);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-01', '20:00:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Visita oficial', 'Visita a la Ciudad del Artista Fallero', 'Visita institucional de las Falleras Mayores de Valencia y sus Cortes de Honor a los talleres falleros.', '2027-03-02', '10:30:00', null, $locations['ciudad_artista_fallero']);
    $events[] = fallas_2027_calendar_event('Visita oficial', 'Visita a la Central de la Policía Local', 'Visita institucional de las Falleras Mayores de Valencia y sus Cortes de Honor a la Central de la Policía Local.', '2027-03-04', '11:00:00', null, $locations['central_policia_local']);
    $events[] = fallas_2027_calendar_event('Tradición', 'Homenaje de las Fuerzas Armadas a las FFMMV y CCHH', 'Homenaje oficial de las Fuerzas Armadas a las Falleras Mayores de Valencia y sus Cortes de Honor.', '2027-03-05', '18:30:00', null, $locations['fuerzas_armadas']);
    $events[] = fallas_2027_calendar_event('Tradición', 'Ronda Fallera de coches de l’Antigor', 'Salida oficial de la Ronda Fallera de coches de l’Antigor desde la Plaza del Ayuntamiento.', '2027-03-06', '12:00:00', null, $locations['coches_antigor']);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-06', '23:59:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Visita oficial', 'Visita al Parque de Bomberos', 'Visita de la Fallera Mayor de Valencia y su Corte de Honor al Parque de Bomberos de la Avenida de la Plata.', '2027-03-07', '10:00:00', null, $locations['parque_bomberos']);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-07', '20:00:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Tradición', 'Homenaje al Pintor Segrelles', 'Homenaje organizado por la comisión Plaza del Pintor Segrelles.', '2027-03-08', '11:30:00', null, $locations['monumento_segrelles']);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-08', '23:59:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-12', '20:30:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Tradición', 'Muestra de bailes y canciones populares', 'Muestra organizada por la Federación de Folklore de la Comunidad Valenciana en la Plaza del Ayuntamiento.', '2027-03-13', '20:00:00', null, $locations['plaza_ayuntamiento']);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-13', '23:59:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Exposición', 'Clausura de la Exposición del Ninot Infantil', 'Clausura oficial de la Exposición del Ninot Infantil.', '2027-03-14', '17:00:00', null, $locations['museo_ciencias']);
    $events[] = fallas_2027_calendar_event('Exposición', 'Proclamación del Ninot Indultat Infantil 2027', 'Lectura del veredicto popular y proclamación del Ninot Indultat Infantil 2027. A continuación, recogida de ninots hasta las 20:00.', '2027-03-14', '17:30:00', '20:00:00', $locations['museo_ciencias'], true);
    $events[] = fallas_2027_calendar_event('Castillo', 'Espectáculo pirotécnico nocturno', 'Espectáculo pirotécnico nocturno en la Plaza del Ayuntamiento.', '2027-03-14', '23:59:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Plantà', 'Plantà de todas las fallas infantiles', 'Plantà oficial de todas las fallas infantiles.', '2027-03-15', '09:00:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Exposición', 'Clausura de la Exposición del Ninot', 'Clausura oficial de la Exposición del Ninot.', '2027-03-15', '17:00:00', null, $locations['museo_ciencias']);
    $events[] = fallas_2027_calendar_event('Exposición', 'Proclamación del Ninot Indultat 2027', 'Lectura del veredicto popular y proclamación del Ninot Indultat 2027. A continuación, recogida de ninots hasta las 20:00.', '2027-03-15', '17:30:00', '20:00:00', $locations['museo_ciencias'], true);
    $events[] = fallas_2027_calendar_event('Castillo', 'L’Alba de les Falles', 'L’Alba de les Falles en toda la ciudad, con espectáculo pirotécnico en la Plaza del Ayuntamiento.', '2027-03-15', '23:59:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Plantà', 'Plantà de todas las fallas', 'Plantà oficial de todas las fallas.', '2027-03-16', '08:00:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Premios', 'Entrega de Premios Infantiles', 'Entrega de premios infantiles, presentaciones infantiles, Cabalgata del Ninot y llibrets infantiles en la tribuna del Ayuntamiento.', '2027-03-16', '16:30:00', null, $locations['tribuna_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Castillo', 'Castillo de fuegos artificiales', 'Castillo de fuegos artificiales en el Puente de Monteolivete.', '2027-03-16', '23:59:00', null, $locations['puente_monteolivete'], true);
    $events[] = fallas_2027_calendar_event('Premios', 'Entrega de Premios', 'Entrega de premios de fallas, calles iluminadas, presentaciones y llibrets.', '2027-03-17', '09:00:00', null, $locations['tribuna_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Ofrenda', 'Ofrenda de flores a la Mare de Déu', 'Primera jornada de la Ofrenda de flores a la Mare de Déu. La distribución de sectores sigue la estructura oficial 2026 mientras se publica el programa 2027.', '2027-03-17', '15:30:00', null, $locations['centro_ofrenda'], true, 'Recorridos oficiales por las calles La Paz y San Vicente Mártir.');

    $ofrenda17 = [
        ['2027-03-17', '15:30:00', 'Ofrenda - Rascanya', 'Rascanya desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '17:10:00', 'Ofrenda - Camins al Grau', 'Camins al Grau desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '18:55:00', 'Ofrenda - Ruzafa A', 'Ruzafa A desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '19:55:00', 'Ofrenda - Ruzafa B', 'Ruzafa B desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '20:40:00', 'Ofrenda - Pla del Reial-Benimaclet', 'Pla del Reial-Benimaclet desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '22:40:00', 'Ofrenda - Canyamelar-Grau-Nazaret', 'Canyamelar-Grau-Nazaret desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '00:10:00', 'Ofrenda - La Xerea', 'La Xerea desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-17', '15:30:00', 'Ofrenda - Patraix', 'Patraix desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '16:45:00', 'Ofrenda - Botànic-La Petxina', 'Botànic-La Petxina desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '17:45:00', 'Ofrenda - El Carmen', 'El Carmen desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '18:30:00', 'Ofrenda - Jesús', 'Jesús desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '19:45:00', 'Ofrenda - Quart de Poblet-Xirivella', 'Quart de Poblet-Xirivella desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '21:25:00', 'Ofrenda - La Cruz Cubierta', 'La Cruz Cubierta desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '22:40:00', 'Ofrenda - El Pilar-Sant Francesc', 'El Pilar-Sant Francesc desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-17', '23:55:00', 'Ofrenda - La Seu-El Mercat', 'La Seu-El Mercat desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '00:25:00', 'Ofrenda - Casas Regionales', 'Casas Regionales desfilan por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '00:35:00', 'Ofrenda - Juntas Locales', 'Juntas Locales desfilan por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '00:45:00', 'Ofrenda - Falla de la FMIV', 'Desfila la falla de la Fallera Mayor Infantil de Valencia por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '00:50:00', 'Ofrenda - Comitiva Oficial', 'Desfila la comitiva oficial con delegaciones invitadas.', 'calle_san_vicente'],
        ['2027-03-18', '00:55:00', 'Ofrenda - Últimas cinco FMIV', 'Desfile de las últimas cinco Falleras Mayores Infantiles de Valencia.', 'calle_san_vicente'],
        ['2027-03-18', '01:00:00', 'Ofrenda - Fallera Mayor Infantil de Valencia', 'Desfile de la Fallera Mayor Infantil de Valencia y su Corte de Honor.', 'calle_san_vicente'],
    ];

    foreach ($ofrenda17 as [$date, $time, $title, $description, $locationKey]) {
        $events[] = fallas_2027_calendar_event('Ofrenda', $title, $description, $date, $time, null, $locations[$locationKey]);
    }

    $events[] = fallas_2027_calendar_event('Castillo', 'Castillo de fuegos artificiales', 'Castillo de fuegos artificiales en el Puente de Monteolivete.', '2027-03-17', '23:59:00', null, $locations['puente_monteolivete'], true);
    $events[] = fallas_2027_calendar_event('Tradición', 'Homenaje al poeta Maximiliano Thous', 'Homenaje en el monumento situado en el cruce de las calles Sagunto y Maximiliano Thous.', '2027-03-18', '10:00:00', null, $locations['monumento_maximiliano_thous']);
    $events[] = fallas_2027_calendar_event('Tradición', 'Homenaje al Maestro Serrano', 'Homenaje en su monumento de la Avenida del Reino de Valencia.', '2027-03-18', '12:00:00', null, $locations['monumento_maestro_serrano']);
    $events[] = fallas_2027_calendar_event('Ofrenda', 'Ofrenda de flores a la Mare de Déu', 'Segunda jornada de la Ofrenda de flores a la Mare de Déu. La distribución de sectores sigue la estructura oficial 2026 mientras se publica el programa 2027.', '2027-03-18', '15:30:00', null, $locations['centro_ofrenda'], true, 'Recorridos oficiales por las calles La Paz y San Vicente Mártir.');

    $ofrenda18 = [
        ['2027-03-18', '15:30:00', 'Ofrenda - Quatre Carreres', 'Quatre Carreres desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '17:10:00', 'Ofrenda - Benimámet-Burjassot-Beniferri', 'Benimámet-Burjassot-Beniferri desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '19:10:00', 'Ofrenda - Pla del Remei-Gran Vía', 'Pla del Remei-Gran Vía desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '20:40:00', 'Ofrenda - Malvarrosa-Cabañal-Beteró', 'Malvarrosa-Cabañal-Beteró desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '21:55:00', 'Ofrenda - Algirós', 'Algirós desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '22:55:00', 'Ofrenda - Poblats al Sud', 'Poblats al Sud desfila por el itinerario de la calle La Paz.', 'calle_la_paz'],
        ['2027-03-18', '15:30:00', 'Ofrenda - Benicalap', 'Benicalap desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '16:45:00', 'Ofrenda - Campanar', 'Campanar desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '18:00:00', 'Ofrenda - La Roqueta-Arrancapins', 'La Roqueta-Arrancapins desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '19:30:00', 'Ofrenda - Olivereta', 'Olivereta desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '21:15:00', 'Ofrenda - Zaidia', 'Zaidia desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-18', '22:50:00', 'Ofrenda - Mislata', 'Mislata desfila por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-19', '00:05:00', 'Ofrenda - Casas Regionales', 'Casas Regionales desfilan por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-19', '00:15:00', 'Ofrenda - Entidades invitadas', 'Entidades invitadas desfilan por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-19', '00:25:00', 'Ofrenda - Falla de la FMV', 'Desfila la falla de la Fallera Mayor de Valencia por el itinerario de la calle San Vicente.', 'calle_san_vicente'],
        ['2027-03-19', '00:30:00', 'Ofrenda - Comitiva Oficial', 'Desfila la comitiva oficial con delegaciones invitadas.', 'calle_san_vicente'],
        ['2027-03-19', '00:35:00', 'Ofrenda - Últimas cinco FMV', 'Desfile de las últimas cinco Falleras Mayores de Valencia.', 'calle_san_vicente'],
        ['2027-03-19', '00:40:00', 'Ofrenda - Fallera Mayor de Valencia', 'Desfile de la Fallera Mayor de Valencia y su Corte de Honor.', 'calle_san_vicente'],
    ];

    foreach ($ofrenda18 as [$date, $time, $title, $description, $locationKey]) {
        $events[] = fallas_2027_calendar_event('Ofrenda', $title, $description, $date, $time, null, $locations[$locationKey]);
    }

    $events[] = fallas_2027_calendar_event('Castillo', 'Nit del Foc', 'Nit del Foc con castillo de fuegos artificiales en el Puente de Monteolivete.', '2027-03-18', '23:59:00', null, $locations['puente_monteolivete'], true);
    $events[] = fallas_2027_calendar_event('Ofrenda', 'Ofrenda de flores a San José', 'Ofrenda de flores de las Falleras Mayores de Valencia y sus Cortes de Honor frente a la imagen del Patriarca en el Puente de San José.', '2027-03-19', '11:00:00', null, $locations['puente_san_jose'], true);
    $events[] = fallas_2027_calendar_event('Misa', 'Misa solemne en honor a San José', 'Misa solemne en honor a San José en la Catedral de Valencia.', '2027-03-19', '12:00:00', null, $locations['catedral'], true);
    $events[] = fallas_2027_calendar_event('Tradición', 'Cabalgata del Fuego', 'Cabalgata del Fuego desde la calle de la Paz hasta la Porta de la Mar.', '2027-03-19', '19:00:00', null, $locations['calle_paz_porta_mar'], true, 'Recorrido desde la calle de la Paz hasta la Porta de la Mar.');
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de las fallas infantiles', 'Inicio oficial de la Cremà de las fallas infantiles.', '2027-03-19', '20:00:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de la falla infantil de la Sección Especial', 'Cremà de la falla infantil que obtenga el primer premio de la Sección Especial.', '2027-03-19', '20:30:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de la falla infantil municipal', 'Cremà de la falla infantil de la Plaza del Ayuntamiento.', '2027-03-19', '21:00:00', null, $locations['plaza_ayuntamiento'], true);
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de todas las fallas', 'Cremà oficial de todas las fallas de Valencia.', '2027-03-19', '22:00:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de la falla ganadora de la Sección Especial', 'Cremà de la falla que obtenga el primer premio de la Sección Especial.', '2027-03-19', '22:30:00', null, $locations['toda_valencia'], true);
    $events[] = fallas_2027_calendar_event('Cremà', 'Cremà de la falla municipal', 'Cremà de la falla de la Plaza del Ayuntamiento.', '2027-03-19', '23:00:00', null, $locations['plaza_ayuntamiento'], true);

    usort(
        $events,
        static function (array $left, array $right): int {
            return ($left['sort_datetime'] . '|' . $left['title']) <=> ($right['sort_datetime'] . '|' . $right['title']);
        }
    );

    return $events;
}

function fallas_2027_calendar_event(
    string $categoryName,
    string $title,
    string $description,
    string $date,
    ?string $startTime,
    ?string $endTime,
    array $location,
    bool $featured = false,
    ?string $routeText = null
): array {
    static $indexedCategories = null;

    if ($indexedCategories === null) {
        $indexedCategories = [];
        foreach (fallas_2027_calendar_categories() as $category) {
            $indexedCategories[$category['name']] = $category;
        }
    }

    $category = $indexedCategories[$categoryName];
    $timeForSort = $startTime ?? '00:00:00';

    return [
        'category_name' => $category['name'],
        'agenda_category' => $category['agenda_category'],
        'category_icon' => $category['icon'],
        'category_color' => $category['color'],
        'title' => $title,
        'description' => $description,
        'event_date' => $date,
        'start_time' => $startTime,
        'end_time' => $endTime,
        'sort_datetime' => $date . ' ' . $timeForSort,
        'display_time' => fallas_2027_calendar_display_time($startTime, $endTime),
        'location_name' => $location['name'],
        'location' => $location['name'],
        'address' => $location['address'],
        'latitude' => (float) $location['latitude'],
        'longitude' => (float) $location['longitude'],
        'route_text' => $routeText,
        'is_all_day' => false,
        'is_featured' => $featured,
    ];
}

function fallas_2027_calendar_display_time(?string $startTime, ?string $endTime): string
{
    if ($startTime === null || $startTime === '') {
        return '';
    }

    $display = substr($startTime, 0, 5);

    if ($endTime !== null && $endTime !== '') {
        $display .= '-' . substr($endTime, 0, 5);
    }

    return $display;
}
