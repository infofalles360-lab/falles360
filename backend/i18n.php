<?php
declare(strict_types=1);

function available_languages(): array
{
    return [
        'es' => 'Español',
        'en' => 'English',
        'ca' => 'Català',
        'fr' => 'Français',
    ];
}

function resolve_language(?string $lang): string
{
    $lang = is_string($lang) ? strtolower(trim($lang)) : 'es';

    return array_key_exists($lang, available_languages()) ? $lang : 'es';
}

function set_current_language_from_request(): void
{
    $requestLang = app_sanitize_input_value($_POST['lang'] ?? $_GET['lang'] ?? $_SESSION['app_lang'] ?? 'es', [
        'max_bytes' => 16,
    ]);
    $_SESSION['app_lang'] = resolve_language(is_string($requestLang) ? $requestLang : 'es');
}

function current_language(): string
{
    return resolve_language($_SESSION['app_lang'] ?? 'es');
}

function language_label(string $lang): string
{
    $languages = available_languages();

    return $languages[$lang] ?? $languages['es'];
}

function translations(): array
{
    return [
        'es' => [
            'guest_name' => 'Invitado',
            'errors' => [
                'missing_name' => 'Introduce tu nombre.',
                'invalid_name' => 'El nombre debe tener entre 2 y 100 caracteres.',
                'invalid_email' => 'Introduce un email valido.',
                'missing_password' => 'Introduce tu contrasena.',
                'password_too_short' => 'La contrasena debe tener al menos 8 caracteres.',
                'password_mismatch' => 'Las contrasenas no coinciden.',
                'email_taken' => 'Ya existe una cuenta con ese email.',
                'unknown_email' => 'No existe ninguna cuenta con ese email.',
                'blocked' => 'Tu cuenta esta bloqueada.',
                'invalid_credentials' => 'Credenciales incorrectas.',
                'reset_token_invalid' => 'El enlace no es valido o ha caducado. Solicita uno nuevo.',
                'db' => 'No se pudo completar el acceso. Revisa la conexion con la base de datos.',
            ],
            'login' => [
                'title' => 'Bienvenido de nuevo, fallero.',
                'back' => 'Volver al inicio',
                'page_title' => 'Login',
                'demo_title' => 'Acceso demo',
                'demo_hint' => 'Usa estas credenciales para probar el acceso real.',
                'demo_email' => 'Email',
                'demo_password' => 'Contraseña',
                'login_tab' => 'Iniciar Sesión',
                'register_tab' => 'Crear Cuenta',
                'form_title' => 'Accede a tu cuenta',
                'form_subtitle' => 'Elige idioma, inicia sesión o entra como invitado.',
                'register_form_title' => 'Crea tu cuenta',
                'register_form_subtitle' => 'Date de alta con nombre, email y contraseña segura.',
                'name' => 'Nombre',
                'name_placeholder' => 'Tu nombre',
                'email' => 'Email',
                'email_placeholder' => 'tu@email.com',
                'password' => 'Contraseña',
                'password_placeholder' => '********',
                'password_confirm' => 'Confirmar contraseña',
                'password_confirm_placeholder' => 'Repite tu contraseña',
                'forgot' => '¿Olvidaste tu contraseña?',
                'recover_tab' => 'Recuperar',
                'recover_form_title' => 'Recuperar contraseña',
                'recover_form_subtitle' => 'Indica el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.',
                'recover_submit' => 'Enviar enlace',
                'recover_sent' => 'Si existe una cuenta con ese email, en breve recibiras un mensaje con instrucciones.',
                'recover_back' => 'Volver al inicio de sesión',
                'recover_mail_subject' => 'Restablecer contraseña - Falles360',
                'recover_mail_body' => "Hola,\n\nPara crear una nueva contraseña en Falles360 abre este enlace (caduca en 2 horas):\n\n:link\n\nSi no has sido tú, ignora este mensaje.\n",
                'reset_page_title' => 'Nueva contraseña',
                'reset_form_title' => 'Elige tu nueva contraseña',
                'reset_form_subtitle' => 'Introduce la contraseña dos veces. Debe tener al menos 8 caracteres.',
                'reset_submit' => 'Guardar contraseña',
                'reset_success' => 'Contraseña actualizada. Ya puedes iniciar sesión.',
                'submit' => 'Iniciar Sesión',
                'register_submit' => 'Crear Cuenta',
                'guest' => 'Entrar como invitado',
                'or' => 'O continúa con',
                'success_notice' => 'Intento procesado. Si las credenciales son correctas, entrarás al panel.',
                'language' => 'Idioma',
                'social_google' => 'Google',
                'social_github' => 'GitHub',
                'security_chip' => 'Acceso seguro',
                'guest_chip' => 'Modo invitado',
                'translated_chip' => 'Multidioma',
            ],
            'dashboard' => [
                'page_title' => 'Panel',
                'back' => 'Volver al inicio',
                'logout' => 'Cerrar sesion',
                'guest_mode' => 'Modo invitado',
                'session_started' => 'Sesion iniciada',
                'hello' => 'Hola, :name',
                'guest_copy' => 'Has entrado como invitado. Ya puedes continuar con el flujo sin credenciales y despues conectar permisos reales.',
                'user_copy' => 'Tu acceso ya esta validado contra la base de datos de Falles360. Desde aqui puedes continuar construyendo el panel privado.',
                'access_type' => 'Tipo de acceso',
                'guest' => 'Invitado',
                'user' => 'Usuario',
                'email' => 'Email',
                'role' => 'Rol',
                'next_steps' => 'Siguientes pasos',
                'next_copy' => 'El acceso ya funciona con base de datos, invitado y sesiones reales. Estas son las siguientes piezas logicas para el panel.',
                'step_1_title' => 'Perfil',
                'step_1_copy' => 'Mostrar datos reales del usuario, avatar y preferencias personales.',
                'step_2_title' => 'Favoritos',
                'step_2_copy' => 'Conectar la tabla de favoritos para guardar fallas y eventos.',
                'step_3_title' => 'Agenda privada',
                'step_3_copy' => 'Crear una vista de actos guardados y alertas personalizadas.',
                'language' => 'Idioma',
            ],
        ],
        'en' => [
            'guest_name' => 'Guest',
            'errors' => [
                'missing_name' => 'Enter your name.',
                'invalid_name' => 'Your name must be between 2 and 100 characters.',
                'invalid_email' => 'Enter a valid email address.',
                'missing_password' => 'Enter your password.',
                'password_too_short' => 'Your password must be at least 8 characters long.',
                'password_mismatch' => 'Passwords do not match.',
                'email_taken' => 'An account already exists with that email.',
                'unknown_email' => 'No account was found with that email.',
                'blocked' => 'Your account is blocked.',
                'invalid_credentials' => 'Invalid credentials.',
                'reset_token_invalid' => 'This link is invalid or has expired. Request a new one.',
                'db' => 'Login could not be completed. Check the database connection.',
            ],
            'login' => [
                'title' => 'Welcome back, fallero.',
                'back' => 'Back to home',
                'page_title' => 'Login',
                'demo_title' => 'Demo access',
                'demo_hint' => 'Use these credentials to test the real login flow.',
                'demo_email' => 'Email',
                'demo_password' => 'Password',
                'login_tab' => 'Sign In',
                'register_tab' => 'Create Account',
                'form_title' => 'Access your account',
                'form_subtitle' => 'Choose a language, sign in or continue as guest.',
                'register_form_title' => 'Create your account',
                'register_form_subtitle' => 'Sign up with your name, email and a secure password.',
                'name' => 'Name',
                'name_placeholder' => 'Your name',
                'email' => 'Email',
                'email_placeholder' => 'you@email.com',
                'password' => 'Password',
                'password_placeholder' => '********',
                'password_confirm' => 'Confirm password',
                'password_confirm_placeholder' => 'Repeat your password',
                'forgot' => 'Forgot your password?',
                'recover_tab' => 'Recover',
                'recover_form_title' => 'Reset password',
                'recover_form_subtitle' => 'Enter your account email and we will send you a link to set a new password.',
                'recover_submit' => 'Send link',
                'recover_sent' => 'If an account exists for that email, you will receive instructions shortly.',
                'recover_back' => 'Back to sign in',
                'recover_mail_subject' => 'Reset your Falles360 password',
                'recover_mail_body' => "Hi,\n\nTo set a new password for Falles360 open this link (expires in 2 hours):\n\n:link\n\nIf you did not request this, you can ignore this email.\n",
                'reset_page_title' => 'New password',
                'reset_form_title' => 'Choose a new password',
                'reset_form_subtitle' => 'Enter your password twice. It must be at least 8 characters.',
                'reset_submit' => 'Save password',
                'reset_success' => 'Password updated. You can sign in now.',
                'submit' => 'Sign In',
                'register_submit' => 'Create Account',
                'guest' => 'Continue as guest',
                'or' => 'Or continue with',
                'success_notice' => 'Request processed. If your credentials are correct, you will enter the panel.',
                'language' => 'Language',
                'social_google' => 'Google',
                'social_github' => 'GitHub',
                'security_chip' => 'Secure access',
                'guest_chip' => 'Guest mode',
                'translated_chip' => 'Multi-language',
            ],
            'dashboard' => [
                'page_title' => 'Dashboard',
                'back' => 'Back to home',
                'logout' => 'Log out',
                'guest_mode' => 'Guest mode',
                'session_started' => 'Signed in',
                'hello' => 'Hello, :name',
                'guest_copy' => 'You signed in as guest. You can keep the flow moving without credentials and connect real permissions later.',
                'user_copy' => 'Your access is already validated against the Falles360 database. From here you can continue building the private panel.',
                'access_type' => 'Access type',
                'guest' => 'Guest',
                'user' => 'User',
                'email' => 'Email',
                'role' => 'Role',
                'next_steps' => 'Next steps',
                'next_copy' => 'The access layer already works with database, guest mode and real sessions. These are the logical next panel steps.',
                'step_1_title' => 'Profile',
                'step_1_copy' => 'Show real user data, avatar and personal preferences.',
                'step_2_title' => 'Favorites',
                'step_2_copy' => 'Connect the favorites table to save monuments and events.',
                'step_3_title' => 'Private agenda',
                'step_3_copy' => 'Create a saved events view and personalized alerts.',
                'language' => 'Language',
            ],
        ],
        'ca' => [
            'guest_name' => 'Convidat',
            'errors' => [
                'missing_name' => 'Introdueix el teu nom.',
                'invalid_name' => 'El nom ha de tindre entre 2 i 100 caracters.',
                'invalid_email' => 'Introdueix un correu valid.',
                'missing_password' => 'Introdueix la teua contrasenya.',
                'password_too_short' => 'La contrasenya ha de tindre almenys 8 caracters.',
                'password_mismatch' => 'Les contrasenyes no coincideixen.',
                'email_taken' => 'Ja existeix un compte amb este correu.',
                'unknown_email' => 'No existeix cap compte amb este correu.',
                'blocked' => 'El teu compte esta bloquejat.',
                'invalid_credentials' => 'Credencials incorrectes.',
                'reset_token_invalid' => 'L enllaç no es valid o ha caducat. Sol·licita un de nou.',
                'db' => 'No s ha pogut completar l accés. Revisa la connexio amb la base de dades.',
            ],
            'login' => [
                'title' => 'Benvingut de nou, faller.',
                'back' => 'Tornar a l inici',
                'page_title' => 'Acces',
                'demo_title' => 'Acces demo',
                'demo_hint' => 'Utilitza estes credencials per a provar l accés real.',
                'demo_email' => 'Correu',
                'demo_password' => 'Contrasenya',
                'login_tab' => 'Iniciar sessio',
                'register_tab' => 'Crear compte',
                'form_title' => 'Accedix al teu compte',
                'form_subtitle' => 'Tria idioma, inicia sessio o entra com a convidat.',
                'register_form_title' => 'Crea el teu compte',
                'register_form_subtitle' => 'Dona t d alta amb nom, correu i una contrasenya segura.',
                'name' => 'Nom',
                'name_placeholder' => 'El teu nom',
                'email' => 'Correu',
                'email_placeholder' => 'tu@email.com',
                'password' => 'Contrasenya',
                'password_placeholder' => '********',
                'password_confirm' => 'Confirmar contrasenya',
                'password_confirm_placeholder' => 'Repetix la contrasenya',
                'forgot' => 'Has oblidat la contrasenya?',
                'recover_tab' => 'Recuperar',
                'recover_form_title' => 'Recuperar contrasenya',
                'recover_form_subtitle' => 'Indica el correu del teu compte i t enviarem un enllaç per a triar una contrasenya nova.',
                'recover_submit' => 'Enviar enllaç',
                'recover_sent' => 'Si existeix un compte amb este correu, rebràs un missatge amb instruccions.',
                'recover_back' => 'Tornar a iniciar sessio',
                'recover_mail_subject' => 'Restablir contrasenya - Falles360',
                'recover_mail_body' => "Hola,\n\nPer a crear una contrasenya nova a Falles360 obri este enllaç (caduca en 2 hores):\n\n:link\n\nSi no has sigut tu, ignora este missatge.\n",
                'reset_page_title' => 'Nova contrasenya',
                'reset_form_title' => 'Tria la teua nova contrasenya',
                'reset_form_subtitle' => 'Introdueix la contrasenya dues vegades. Ha de tindre almenys 8 caracters.',
                'reset_submit' => 'Guardar contrasenya',
                'reset_success' => 'Contrasenya actualitzada. Ja pots iniciar sessio.',
                'submit' => 'Iniciar sessio',
                'register_submit' => 'Crear compte',
                'guest' => 'Entrar com a convidat',
                'or' => 'O continua amb',
                'success_notice' => 'Intent processat. Si les credencials son correctes, entraras al panell.',
                'language' => 'Idioma',
                'social_google' => 'Google',
                'social_github' => 'GitHub',
                'security_chip' => 'Acces segur',
                'guest_chip' => 'Mode convidat',
                'translated_chip' => 'Multiidioma',
            ],
            'dashboard' => [
                'page_title' => 'Panell',
                'back' => 'Tornar a l inici',
                'logout' => 'Tancar sessio',
                'guest_mode' => 'Mode convidat',
                'session_started' => 'Sessio iniciada',
                'hello' => 'Hola, :name',
                'guest_copy' => 'Has entrat com a convidat. Ja pots continuar sense credencials i afegir permisos reals mes avant.',
                'user_copy' => 'El teu acces ja esta validat contra la base de dades de Falles360. Des d aci pots continuar construint el panell privat.',
                'access_type' => 'Tipus d acces',
                'guest' => 'Convidat',
                'user' => 'Usuari',
                'email' => 'Correu',
                'role' => 'Rol',
                'next_steps' => 'Seguents passos',
                'next_copy' => 'La capa d acces ja funciona amb base de dades, convidat i sessions reals. Estos son els seguents passos logics.',
                'step_1_title' => 'Perfil',
                'step_1_copy' => 'Mostrar dades reals de l usuari, avatar i preferencies personals.',
                'step_2_title' => 'Favorits',
                'step_2_copy' => 'Connectar la taula de favorits per a guardar falles i actes.',
                'step_3_title' => 'Agenda privada',
                'step_3_copy' => 'Crear una vista d actes guardats i alertes personalitzades.',
                'language' => 'Idioma',
            ],
        ],
        'fr' => [
            'guest_name' => 'Invité',
            'errors' => [
                'missing_name' => 'Saisissez votre nom.',
                'invalid_name' => 'Le nom doit contenir entre 2 et 100 caracteres.',
                'invalid_email' => 'Saisissez un email valide.',
                'missing_password' => 'Saisissez votre mot de passe.',
                'password_too_short' => 'Le mot de passe doit contenir au moins 8 caracteres.',
                'password_mismatch' => 'Les mots de passe ne correspondent pas.',
                'email_taken' => 'Un compte existe deja avec cet email.',
                'unknown_email' => 'Aucun compte n a ete trouve avec cet email.',
                'blocked' => 'Votre compte est bloque.',
                'invalid_credentials' => 'Identifiants incorrects.',
                'reset_token_invalid' => 'Ce lien est invalide ou a expire. Demandez-en un nouveau.',
                'db' => 'La connexion n a pas pu etre completee. Verifiez la base de donnees.',
            ],
            'login' => [
                'title' => 'Bon retour, fallero.',
                'back' => 'Retour a l accueil',
                'page_title' => 'Connexion',
                'demo_title' => 'Acces demo',
                'demo_hint' => 'Utilisez ces identifiants pour tester la connexion reelle.',
                'demo_email' => 'Email',
                'demo_password' => 'Mot de passe',
                'login_tab' => 'Connexion',
                'register_tab' => 'Creer un compte',
                'form_title' => 'Accedez a votre compte',
                'form_subtitle' => 'Choisissez une langue, connectez-vous ou continuez en invite.',
                'register_form_title' => 'Creez votre compte',
                'register_form_subtitle' => 'Inscrivez-vous avec votre nom, email et un mot de passe securise.',
                'name' => 'Nom',
                'name_placeholder' => 'Votre nom',
                'email' => 'Email',
                'email_placeholder' => 'vous@email.com',
                'password' => 'Mot de passe',
                'password_placeholder' => '********',
                'password_confirm' => 'Confirmer le mot de passe',
                'password_confirm_placeholder' => 'Repetez votre mot de passe',
                'forgot' => 'Mot de passe oublie ?',
                'recover_tab' => 'Recuperer',
                'recover_form_title' => 'Recuperer le mot de passe',
                'recover_form_subtitle' => 'Indiquez l email de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.',
                'recover_submit' => 'Envoyer le lien',
                'recover_sent' => 'Si un compte existe pour cet email, vous recevrez bientot des instructions.',
                'recover_back' => 'Retour a la connexion',
                'recover_mail_subject' => 'Reinitialiser votre mot de passe Falles360',
                'recover_mail_body' => "Bonjour,\n\nPour definir un nouveau mot de passe sur Falles360, ouvrez ce lien (expire dans 2 heures) :\n\n:link\n\nSi vous n etes pas a l origine de cette demande, ignorez ce message.\n",
                'reset_page_title' => 'Nouveau mot de passe',
                'reset_form_title' => 'Choisissez un nouveau mot de passe',
                'reset_form_subtitle' => 'Saisissez le mot de passe deux fois. Au moins 8 caracteres.',
                'reset_submit' => 'Enregistrer le mot de passe',
                'reset_success' => 'Mot de passe mis a jour. Vous pouvez vous connecter.',
                'submit' => 'Se connecter',
                'register_submit' => 'Creer un compte',
                'guest' => 'Entrer comme invite',
                'or' => 'Ou continuer avec',
                'success_notice' => 'Requete traitee. Si vos identifiants sont corrects, vous entrerez dans le panneau.',
                'language' => 'Langue',
                'social_google' => 'Google',
                'social_github' => 'GitHub',
                'security_chip' => 'Acces securise',
                'guest_chip' => 'Mode invite',
                'translated_chip' => 'Multilingue',
            ],
            'dashboard' => [
                'page_title' => 'Tableau de bord',
                'back' => 'Retour a l accueil',
                'logout' => 'Se deconnecter',
                'guest_mode' => 'Mode invite',
                'session_started' => 'Session ouverte',
                'hello' => 'Bonjour, :name',
                'guest_copy' => 'Vous etes entre en invite. Vous pouvez continuer sans identifiants et connecter de vraies permissions plus tard.',
                'user_copy' => 'Votre acces est deja valide contre la base de donnees Falles360. A partir d ici vous pouvez continuer a construire le panneau prive.',
                'access_type' => 'Type d acces',
                'guest' => 'Invite',
                'user' => 'Utilisateur',
                'email' => 'Email',
                'role' => 'Role',
                'next_steps' => 'Etapes suivantes',
                'next_copy' => 'La couche d acces fonctionne deja avec base de donnees, mode invite et vraies sessions. Voici les prochaines etapes logiques.',
                'step_1_title' => 'Profil',
                'step_1_copy' => 'Afficher les donnees reelles de l utilisateur, son avatar et ses preferences.',
                'step_2_title' => 'Favoris',
                'step_2_copy' => 'Connecter la table des favoris pour enregistrer monuments et evenements.',
                'step_3_title' => 'Agenda prive',
                'step_3_copy' => 'Creer une vue des evenements sauvegardes et des alertes personnalisees.',
                'language' => 'Langue',
            ],
        ],
    ];
}

function t(string $key, array $replace = []): string
{
    $value = translations()[current_language()] ?? translations()['es'];

    foreach (explode('.', $key) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return $key;
        }

        $value = $value[$segment];
    }

    if (!is_string($value)) {
        return $key;
    }

    foreach ($replace as $placeholder => $replacement) {
        $value = str_replace(':' . $placeholder, (string) $replacement, $value);
    }

    return $value;
}

function with_lang(string $path, array $params = []): string
{
    $params['lang'] = current_language();

    $separator = str_contains($path, '?') ? '&' : '?';

    return $path . $separator . http_build_query($params);
}
