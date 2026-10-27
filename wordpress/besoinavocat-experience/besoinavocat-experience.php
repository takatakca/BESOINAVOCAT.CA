<?php
/**
 * Plugin Name: BesoinAvocat — Expérience
 * Description: Présentation réversible de l’accueil et aperçu du futur tableau de bord. Aucun compte, dépôt, paiement ou contenu existant n’est modifié.
 * Version: 0.2.3
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: BesoinAvocat
 * License: GPL-2.0-or-later
 * Text Domain: besoinavocat-experience
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/render-integrity.php';
require_once __DIR__ . '/funnel.php';

final class BesoinAvocat_Experience {
    const VERSION = '0.2.3';

    public static function boot() {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'assets'), 99);
        add_filter('body_class', array(__CLASS__, 'body_classes'));
        add_filter('the_content', array(__CLASS__, 'front_content'), 99);
        add_shortcode('besoinavocat_dashboard', array(__CLASS__, 'dashboard'));
        add_shortcode('besoinavocat_intake', array(__CLASS__, 'intake'));
        add_action('wp_footer', array(__CLASS__, 'intake_modal'));
    }

    private static function funnel_enabled() {
        return defined('BESOINAVOCAT_FUNNEL_ENABLED') && BESOINAVOCAT_FUNNEL_ENABLED === true;
    }

    private static function has_intake() {
        $post = get_post();
        return is_singular() && $post && has_shortcode($post->post_content, 'besoinavocat_intake');
    }

    private static function intake_endpoint() {
        // The page/shortcode cannot choose a recipient for contact data.
        return defined('BESOINAVOCAT_INTAKE_ENDPOINT') && BESOINAVOCAT_INTAKE_ENDPOINT === 'https://portail.besoinavocat.ca/api/intake'
            ? BESOINAVOCAT_INTAKE_ENDPOINT : '';
    }

    public static function intake($attributes = array()) {
        $role = isset($attributes['role']) && $attributes['role'] === 'professional' ? 'professional' : 'client';
        return ba_render_funnel($role, array('endpoint' => self::intake_endpoint()));
    }

    public static function intake_modal() {
        if (is_admin() || !self::is_front() || !self::funnel_enabled()) { return; }
        echo ba_render_funnel('client', array('mode' => 'modal', 'id' => 'ba-intake-modal', 'endpoint' => self::intake_endpoint()));
    }

    private static function is_dashboard() {
        $post = get_post();
        return is_singular() && $post && has_shortcode($post->post_content, 'besoinavocat_dashboard');
    }

    private static function is_front() {
        return is_front_page() && (int) get_queried_object_id() === 13;
    }

    public static function assets() {
        if (is_admin()) { return; }
        $base = plugin_dir_url(__FILE__);
        wp_enqueue_style('besoinavocat-common', $base . 'assets/common.css', array(), self::VERSION);
        wp_enqueue_script('besoinavocat-common', $base . 'assets/common.js', array(), self::VERSION, true);
        if (self::has_intake() || (self::is_front() && self::funnel_enabled())) {
            wp_enqueue_style('besoinavocat-funnel', $base . 'assets/funnel.css', array(), self::VERSION);
            wp_enqueue_script('besoinavocat-funnel', $base . 'assets/funnel.js', array(), self::VERSION, true);
        }
        if (!self::is_front() && !self::is_dashboard()) { return; }
        wp_enqueue_style('besoinavocat-experience', $base . 'assets/experience.css', array(), self::VERSION);
        wp_enqueue_script('besoinavocat-experience', $base . 'assets/experience.js', array(), self::VERSION, true);
    }

    public static function body_classes($classes) {
        if (self::is_front()) {
            $classes[] = 'ba-experience-front';
        }
        if (self::is_dashboard()) {
            $classes[] = 'ba-experience-dashboard';
        }
        return $classes;
    }

    private static function url($path) {
        return esc_url(home_url($path));
    }

    private static function dashboard_url() {
        $page = get_page_by_path('tableau-de-bord');
        if ($page && $page->post_status === 'publish') {
            return esc_url(get_permalink($page));
        }
        return '#ba-tableau-apercu';
    }

    private static function arrow() {
        return '<span aria-hidden="true">↗</span>';
    }

    private static function icon($name) {
        $paths = array(
            'folder' => '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11H3z"/>',
            'document' => '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
            'message' => '<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
            'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            'spark' => '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
            'phone' => '<path d="m7 3-4 2c0 9 7 16 16 16l2-4-5-3-2 3a14 14 0 0 1-7-7l3-2z"/>',
            'lock' => '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
            'check' => '<path d="m5 12 4 4L19 6"/>',
        );
        return '<svg class="ba-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . (isset($paths[$name]) ? $paths[$name] : $paths['document']) . '</svg>';
    }

    private static function navigation() {
        ob_start(); ?>
        <nav class="ba-nav ba-component" data-ba-slot="navigation" aria-label="Navigation BesoinAvocat" data-ba-policy-client="<?php echo self::url('/conditions-dutilisation-des-justiciables/'); ?>" data-ba-policy-professional="<?php echo self::url('/conditions-dutilisation-des-professionnels/'); ?>" data-ba-policy-privacy="<?php echo self::url('/politique-de-confidentialite/'); ?>">
            <button class="ba-menu-toggle" type="button" aria-expanded="false" aria-controls="ba-navigation-links">Menu <span aria-hidden="true">☰</span></button>
            <div id="ba-navigation-links" class="ba-nav-links">
                <a href="<?php echo self::url('/demande/'); ?>">Trouver un avocat</a>
                <?php if (self::funnel_enabled()) : ?><button type="button" class="ba-text-link" data-ba-funnel-open="ba-intake-modal" data-ba-funnel-role="client">Préparer une demande · FR / EN</button><?php endif; ?>
                <a href="<?php echo self::url('/professionnels/'); ?>">Professionnels</a>
                <a href="<?php echo self::url('/faq/'); ?>">Questions</a>
                <a class="ba-nav-dashboard" href="<?php echo self::dashboard_url(); ?>">Tableau de bord <?php echo self::arrow(); ?></a>
            </div>
        </nav>
        <?php return ob_get_clean();
    }

    private static function mini_dashboard() {
        ob_start(); ?>
        <aside class="ba-hero-card ba-component" data-ba-slot="hero-card" aria-label="Illustration fictive du futur tableau de bord">
            <div class="ba-mini-top"><span class="ba-mini-logo" aria-hidden="true">b.</span><span>Votre espace de travail<small>Tableau de bord BesoinAvocat</small></span><span class="ba-mini-dot" aria-hidden="true"></span></div>
            <span class="ba-label ba-label-soft">Aperçu — données fictives</span>
            <h2>Un dossier.<br>Un fil conducteur.</h2>
            <p>Pièces, sources et échanges : un aperçu de leur future organisation.</p>
            <div class="ba-mini-row"><?php echo self::icon('folder'); ?><span>Dossier d’exemple<small>Aucune affaire réelle</small></span><span class="ba-mini-status">Aperçu</span></div>
            <div class="ba-mini-row"><?php echo self::icon('document'); ?><span>Pièce d’exemple<small>Provenance à documenter</small></span><span class="ba-mini-status">Fictif</span></div>
            <div class="ba-mini-row"><?php echo self::icon('message'); ?><span>Échanges au dossier<small>Fonction en préparation</small></span><span class="ba-mini-status">À venir</span></div>
            <a class="ba-mini-link" href="<?php echo self::dashboard_url(); ?>">Découvrir le projet <?php echo self::arrow(); ?></a>
            <small class="ba-fine">Connexion et dépôt non activés. Aucun document réel.</small>
        </aside>
        <?php return ob_get_clean();
    }

    private static function client_offer() {
        ob_start(); ?>
        <section id="ba-tableau-apercu" class="ba-component ba-client-section" data-ba-slot="client-offer" aria-labelledby="ba-client-title">
            <div class="ba-section-inner ba-client-grid">
                <div><span class="ba-eyebrow">LA PROCHAINE ÉTAPE DE BESOINAVOCAT</span><h2 id="ba-client-title">Votre dossier,<br><em>plus clair dès le départ.</em></h2><p class="ba-lead">Un futur espace commun pour préparer les pièces, suivre les échanges et garder une vue d’ensemble.</p><a class="ba-button" href="<?php echo self::dashboard_url(); ?>">Voir le tableau de bord <?php echo self::arrow(); ?></a></div>
                <div class="ba-client-card"><span class="ba-label">Portail en préparation</span><h3>Pour les clients,<br>publier une demande sera toujours gratuit.</h3><p>Les honoraires de l’avocat et les options payantes sont distincts. Aucun mandat ni abonnement ne découle de cet aperçu.</p><ul class="ba-check-list"><li><?php echo self::icon('check'); ?>Un classement avec la provenance de chaque pièce</li><li><?php echo self::icon('check'); ?>Des échanges rattachés au bon dossier</li><li><?php echo self::icon('check'); ?>Un suivi du temps soumis à validation</li></ul><p class="ba-fine">Fonctions prévues, dépôt non activé. Aucun fichier personnel n’est demandé ici.</p><a class="ba-text-link" href="<?php echo self::url('/demande/'); ?>">Décrire mon besoin <?php echo self::arrow(); ?></a></div>
            </div>
        </section>
        <?php return ob_get_clean();
    }

    private static function professional_offers() {
        $offers = array(
            array('01', 'À la semaine', '100 $ CA', 'par semaine', array('Inscription professionnelle', 'Fonctions de collaboration en préparation', 'Crédits IA achetés séparément')),
            array('02', 'Au mois', '300 $ CA', 'par mois', array('Inscription professionnelle', 'Fonctions de collaboration en préparation', 'Crédits IA achetés séparément')),
            array('03', 'Crédits IA', 'En supplément', 'Tarif à définir', array('Consommation distincte de l’inscription', 'Services IA à raccorder', 'Achat de crédits non activé')),
        );
        ob_start(); ?>
        <section id="ba-offres-avocats" class="ba-component ba-offers-section" data-ba-slot="professional-offers" aria-labelledby="ba-offers-title">
            <div class="ba-section-inner">
                <div class="ba-section-heading"><div><span class="ba-eyebrow">POUR LES AVOCATS ET LES CABINETS</span><h2 id="ba-offers-title">Choisissez votre rythme.<br><em>Préparez la suite.</em></h2></div><div><span class="ba-label">Tarifs annoncés</span><p>100 $ CA par semaine ou 300 $ CA par mois.<br>Souscription non ouverte. Taxes et conditions à préciser avant activation.</p></div></div>
                <div class="ba-offers-grid">
                    <?php foreach ($offers as $index => $offer) : ?>
                    <article class="ba-offer-card<?php echo $index === 1 ? ' ba-offer-featured' : ''; ?>"><span class="ba-offer-number"><?php echo esc_html($offer[0]); ?></span><h3><?php echo esc_html($offer[1]); ?></h3><p class="ba-offer-price"><?php echo esc_html($offer[2]); ?><small><?php echo esc_html($offer[3]); ?></small></p><ul><?php foreach ($offer[4] as $feature) : ?><li><?php echo self::icon('check'); ?><?php echo esc_html($feature); ?></li><?php endforeach; ?></ul><a class="ba-text-link" href="<?php echo self::url('/professionnels/'); ?>">Espace professionnels <?php echo self::arrow(); ?></a></article>
                    <?php endforeach; ?>
                </div>
                <div class="ba-voice-card"><span class="ba-voice-symbol"><?php echo self::icon('phone'); ?></span><div><span class="ba-eyebrow">OPTION ENVISAGÉE</span><h3>Un assistant téléphonique IA.</h3><p>Accueil des appels et orientation vers la bonne personne : un service à concevoir avec ses limites, ses consentements et ses modalités. Aucun appel ni enregistrement n’est activé ici.</p></div><span class="ba-label">En préparation</span></div>
            </div>
        </section>
        <?php return ob_get_clean();
    }

    public static function front_content($content) {
        if (is_admin() || !self::is_front() || !is_main_query() || !in_the_loop() || strpos($content, 'id="ba-experience-additions"') !== false) {
            return $content;
        }
        // Existing HTML is followed by additive blocks. A later server filter applies
        // only the documented claim corrections; the database remains unchanged.
        return $content . '<div id="ba-experience-additions">' . self::navigation() . self::mini_dashboard() . self::client_offer() . self::professional_offers() . '</div>';
    }

    public static function dashboard($attributes = array(), $content = null) {
        ob_start(); ?>
        <div class="ba-component ba-dashboard-page">
            <div class="ba-dashboard-intro"><span class="ba-eyebrow">TABLEAU DE BORD BESOINAVOCAT</span><h2>Un espace commun.<br><em>Un dossier bien préparé.</em></h2><p>Découvrez l’organisation envisagée pour les clients et les avocats. Cet aperçu ne contient aucune donnée réelle et n’ouvre aucun compte.</p><span class="ba-label">Portail en préparation · connexion non activée</span></div>
            <div class="ba-dashboard-layout">
                <section class="ba-demo-shell" aria-label="Aperçu fictif du futur tableau de bord">
                    <div class="ba-demo-heading"><span class="ba-mini-logo" aria-hidden="true">b.</span><div>Tableau de bord<small>Aperçu — données fictives · lecture seule</small></div></div>
                    <div class="ba-demo-tabs" role="tablist" aria-label="Rubriques de l’aperçu"><button type="button" id="ba-tab-documents" role="tab" aria-selected="true" aria-controls="ba-panel-documents" data-ba-tab="documents">Pièces</button><button type="button" id="ba-tab-messages" role="tab" aria-selected="false" aria-controls="ba-panel-messages" tabindex="-1" data-ba-tab="messages">Échanges</button><button type="button" id="ba-tab-time" role="tab" aria-selected="false" aria-controls="ba-panel-time" tabindex="-1" data-ba-tab="time">Temps</button></div>
                    <div class="ba-demo-panel" id="ba-panel-documents" role="tabpanel" aria-labelledby="ba-tab-documents" tabindex="0"><span class="ba-eyebrow">DOSSIER D’EXEMPLE — FICTIF</span><h3>Chaque pièce garde sa source.</h3><p>Une illustration de classement, sans preuve ni document authentique.</p><div class="ba-demo-table"><div><strong>Document</strong><strong>Nature</strong><strong>État</strong></div><div><span>Note d’exemple</span><span>Déclaration fictive</span><span class="ba-demo-tag">À vérifier</span></div><div><span>Chronologie d’exemple</span><span>Analyse fictive</span><span class="ba-demo-tag">À vérifier</span></div></div><p class="ba-fine">Aucun fichier téléchargeable. Aucun OCR ni contrôle réel effectué.</p></div>
                    <div class="ba-demo-panel" id="ba-panel-messages" role="tabpanel" aria-labelledby="ba-tab-messages" tabindex="0" hidden><span class="ba-eyebrow">ÉCHANGE DE DÉMONSTRATION</span><h3>Garder le fil du dossier.</h3><p class="ba-demo-message">Exemple fictif : « Je souhaite préparer les documents utiles pour notre prochaine rencontre. »</p><p class="ba-fine">Illustration uniquement. Aucun message n’est transmis et aucun professionnel réel ne participe à cet aperçu.</p></div>
                    <div class="ba-demo-panel" id="ba-panel-time" role="tabpanel" aria-labelledby="ba-tab-time" tabindex="0" hidden><span class="ba-eyebrow">SUIVI PRÉVU — FICTIF</span><h3>Déclarer. Puis faire valider.</h3><p>Le temps de travail sera saisi et soumis à une validation distincte. Ouvrir une page ou saisir du texte ne déclenchera aucun honoraire.</p><div class="ba-time-placeholder"><span>Durée réelle</span><strong>—</strong><span>Aucune entrée réelle</span></div><p class="ba-fine">Aucun tarif, crédit ou paiement activé.</p></div>
                </section>
                <aside class="ba-access-card"><span class="ba-access-icon"><?php echo self::icon('lock'); ?></span><h3>Votre accès,<br>lors de l’ouverture.</h3><p>La connexion est en préparation. Les accès aux dossiers seront ouverts après validation.</p><button type="button" class="ba-button" disabled>Connexion en préparation</button><p class="ba-fine">Cet aperçu ne crée aucun compte et ne demande aucun document personnel.</p><div class="ba-access-services"><span>Assistant IA documentaire <em>À connecter</em></span><span>Crédits et paiements <em>À connecter</em></span><span>Assistant téléphonique <em>À connecter</em></span></div></aside>
            </div>
            <div class="ba-audience-grid"><section><span class="ba-eyebrow">VOUS ÊTES CLIENT</span><h3>Une demande toujours gratuite.</h3><p>Publier une demande sera toujours gratuit pour les clients. Les honoraires de l’avocat et les options payantes sont distincts.</p><a class="ba-text-link" href="<?php echo self::url('/demande/'); ?>">Décrire mon besoin <?php echo self::arrow(); ?></a></section><section><span class="ba-eyebrow">VOUS ÊTES AVOCAT</span><h3>Un espace pour collaborer.</h3><p>Inscription proposée à 100 $ CA par semaine ou 300 $ CA par mois. Crédits IA en supplément. Souscription non ouverte; taxes et conditions à préciser avant activation.</p><a class="ba-text-link" href="<?php echo self::url('/professionnels/'); ?>">Consulter l’espace professionnels <?php echo self::arrow(); ?></a></section></div>
            <p class="ba-dashboard-contact">Nous joindre : <a href="tel:+15148252825">514 825-2825</a></p>
            <p class="ba-dashboard-footnote">Les sources, les déclarations et les analyses doivent rester distinctes. Une extraction OCR nécessite un contrôle sur l’original. Cet espace de préparation ne remplace pas l’analyse de votre avocat.</p>
        </div>
        <?php return ob_get_clean();
    }
}

BesoinAvocat_Experience::boot();
