<?php
/**
 * BesoinAvocat intake presentation only. No WordPress account, post, mail or payment.
 * Integration (enqueue assets/funnel.css and assets/funnel.js separately):
 * echo ba_render_funnel('client');
 * echo ba_render_funnel('professional', array('mode'=>'modal', 'id'=>'ba-intake-modal'));
 * Trigger: <button data-ba-funnel-open="ba-intake-modal" data-ba-funnel-role="professional">…</button>
 * Supply options['endpoint'] only after the Node intake endpoint is approved/tested.
 * No endpoint by default. No script is registered or automatically displayed here.
 */

function ba_render_funnel($context = 'client', $options = array()) {
    static $instance = 0;
    $instance++;
    $options = is_array($options) ? $options : array();
    $role = in_array($context, array('professional', 'lawyer'), true) ? 'professional' : 'client';
    $mode = isset($options['mode']) && $options['mode'] === 'modal' ? 'modal' : 'inline';
    $default_language = function_exists('get_locale') && strpos(get_locale(), 'en') === 0 ? 'en' : 'fr';
    $language = isset($options['language']) && in_array($options['language'], array('fr', 'en'), true) ? $options['language'] : $default_language;
    $id = isset($options['id']) && is_string($options['id']) && preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/D', $options['id']) ? $options['id'] : 'ba-intake-' . $instance;
    $endpoint = isset($options['endpoint']) && is_string($options['endpoint']) ? trim($options['endpoint']) : '';
    $parts = $endpoint !== '' ? parse_url($endpoint) : false;
    if ($endpoint !== '/api/intake' && (!$parts || !isset($parts['scheme'], $parts['host'], $parts['path']) ||
        $parts['scheme'] !== 'https' || $parts['path'] !== '/api/intake' || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']))) {
        $endpoint = '';
    }
    $privacy = function_exists('home_url') ? home_url('/politique-de-confidentialite/') : '/politique-de-confidentialite/';
    $escape = function ($value) { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
    $label = function ($fr, $en, $tag = 'span', $class = '') use ($language, $escape) {
        $allowed = array('span', 'p', 'h2', 'h3', 'small', 'strong');
        if (!in_array($tag, $allowed, true)) { $tag = 'span'; }
        return '<' . $tag . ($class !== '' ? ' class="' . $escape($class) . '"' : '') . ' data-ba-fr="' . $escape($fr) . '" data-ba-en="' . $escape($en) . '">' . $escape($language === 'en' ? $en : $fr) . '</' . $tag . '>';
    };
    $panel_tag = $mode === 'modal' ? 'dialog' : 'section';
    ob_start(); ?>
    <div id="<?php echo $escape($id); ?>" class="ba-funnel ba-funnel--<?php echo $escape($mode); ?>" lang="<?php echo $escape($language); ?>" data-ba-funnel data-ba-context="<?php echo $escape($role); ?>" data-ba-mode="<?php echo $escape($mode); ?>" data-ba-language="<?php echo $escape($language); ?>" data-ba-intake-endpoint="<?php echo $escape($endpoint); ?>" data-ba-privacy-url="<?php echo $escape($privacy); ?>">
        <<?php echo $panel_tag; ?> class="ba-funnel__panel" <?php echo $mode === 'modal' ? 'data-ba-dialog' : ''; ?> aria-labelledby="<?php echo $escape($id); ?>-title">
            <header class="ba-funnel__header">
                <div class="ba-funnel__brand"><span class="ba-funnel__monogram" aria-hidden="true">b.</span><div><strong>BesoinAvocat</strong><?php echo $label('Une prochaine étape, en clair.', 'A clear next step.', 'small'); ?></div></div>
                <div class="ba-funnel__tools">
                    <div class="ba-funnel__language" role="group" aria-label="<?php echo $language === 'en' ? 'Language' : 'Langue'; ?>" data-ba-aria-fr="Langue" data-ba-aria-en="Language">
                        <button type="button" data-ba-language-button="fr" lang="fr" aria-label="Français" aria-pressed="<?php echo $language === 'fr' ? 'true' : 'false'; ?>">FR</button>
                        <button type="button" data-ba-language-button="en" lang="en" aria-label="English" aria-pressed="<?php echo $language === 'en' ? 'true' : 'false'; ?>">EN</button>
                    </div>
                    <?php if ($mode === 'modal') : ?>
                        <button type="button" class="ba-funnel__close" data-ba-action="close" aria-label="<?php echo $language === 'en' ? 'Close this form' : 'Fermer ce parcours'; ?>" data-ba-aria-fr="Fermer ce parcours" data-ba-aria-en="Close this form"><span aria-hidden="true">×</span></button>
                    <?php endif; ?>
                </div>
            </header>
            <div class="ba-funnel__intro">
                <?php echo $label('PRÉPARER UNE DEMANDE', 'PREPARE A REQUEST', 'span', 'ba-funnel__eyebrow'); ?>
                <h2 id="<?php echo $escape($id); ?>-title" data-ba-fr="Commençons par l’essentiel." data-ba-en="Let’s start with the essentials."><?php echo $language === 'en' ? 'Let’s start with the essentials.' : 'Commençons par l’essentiel.'; ?></h2>
                <?php echo $label('Choisissez votre parcours. Aucun récit de votre affaire ni document personnel n’est demandé ici.', 'Choose your path. We do not ask for your case story or personal documents here.', 'p'); ?>
                <?php echo $label('FR / EN change uniquement la langue de ce parcours.', 'FR / EN changes the language of this form only.', 'small', 'ba-funnel__fine'); ?>
            </div>
            <div data-ba-funnel-view class="ba-funnel__view">
                <p><?php echo $language === 'en' ? 'This guided form requires JavaScript. You can also call BesoinAvocat.' : 'Ce parcours guidé nécessite JavaScript. Vous pouvez aussi appeler BesoinAvocat.'; ?> <a href="tel:+15148252825">514 825-2825</a></p>
            </div>
            <section class="ba-funnel__pricing" aria-labelledby="<?php echo $escape($id); ?>-pricing">
                <h3 id="<?php echo $escape($id); ?>-pricing" data-ba-fr="Des tarifs distincts, dès le départ." data-ba-en="Clear, separate pricing from the start."><?php echo $language === 'en' ? 'Clear, separate pricing from the start.' : 'Des tarifs distincts, dès le départ.'; ?></h3>
                <div class="ba-funnel__prices">
                    <article><?php echo $label('Clients', 'Clients', 'span', 'ba-funnel__price-label'); ?><p class="ba-funnel__price">0 <span>CAD</span></p><?php echo $label('pour déposer une demande', 'to submit a request', 'p'); ?><?php echo $label('Les honoraires de votre avocat sont distincts.', 'Your lawyer’s fees are separate.', 'small'); ?></article>
                    <article><?php echo $label('Avocats · formule hebdomadaire', 'Lawyers · weekly option', 'span', 'ba-funnel__price-label'); ?><p class="ba-funnel__price">100 <span>CAD</span></p><?php echo $label('par semaine', 'per week', 'p'); ?><button type="button" class="ba-funnel__text-button" data-ba-plan="weekly" data-ba-fr="Préparer mon intérêt" data-ba-en="Prepare my interest"><?php echo $language === 'en' ? 'Prepare my interest' : 'Préparer mon intérêt'; ?></button></article>
                    <article><?php echo $label('Avocats · formule mensuelle', 'Lawyers · monthly option', 'span', 'ba-funnel__price-label'); ?><p class="ba-funnel__price">300 <span>CAD</span></p><?php echo $label('par mois', 'per month', 'p'); ?><button type="button" class="ba-funnel__text-button" data-ba-plan="monthly" data-ba-fr="Préparer mon intérêt" data-ba-en="Prepare my interest"><?php echo $language === 'en' ? 'Prepare my interest' : 'Préparer mon intérêt'; ?></button></article>
                </div>
                <?php echo $label('Les crédits IA sont séparés. Leur prix n’est pas défini ici. Ce parcours ne crée aucun abonnement et ne déclenche aucun paiement. L’habilitation professionnelle, les modalités et les taxes applicables seront précisées avant toute activation.', 'AI credits are separate. Their price is not defined here. This form does not create a subscription or trigger a payment. Professional authorization, terms and applicable taxes will be clarified before any activation.', 'p', 'ba-funnel__fine'); ?>
            </section>
            <footer class="ba-funnel__footer"><a href="tel:+15148252825" data-ba-aria-fr="Appeler BesoinAvocat au 514 825-2825" data-ba-aria-en="Call BesoinAvocat at 514 825-2825" aria-label="<?php echo $language === 'en' ? 'Call BesoinAvocat at 514 825-2825' : 'Appeler BesoinAvocat au 514 825-2825'; ?>">514 825-2825</a><?php echo $label('BesoinAvocat est un outil de préparation, pas un cabinet d’avocats. Aucune relation avocat-client n’est créée par ce parcours.', 'BesoinAvocat is a preparation tool, not a law firm. This form does not establish a lawyer-client relationship.', 'p'); ?></footer>
        </<?php echo $panel_tag; ?>>
    </div>
    <?php return ob_get_clean();
}
