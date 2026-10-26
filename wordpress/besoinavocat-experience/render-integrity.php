<?php
/** Targeted public-render corrections. Never writes Elementor data or post content. */
if (!defined('ABSPATH')) { exit; }

final class BesoinAvocat_Render_Integrity {
    public static function boot() {
        add_filter('the_content', array(__CLASS__, 'content'), 999);
        add_filter('elementor/frontend/the_content', array(__CLASS__, 'content'), 999);
        add_filter('elementor/widget/render_content', array(__CLASS__, 'widget'), 999, 2);
    }

    private static function plain($value) {
        $value = preg_replace('~<br\s*/?>~i', ' ', $value);
        return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }

    /** Replaces an exact data-id element with balanced nesting; malformed HTML is unchanged. */
    public static function replace_element($html, $id, $replacement) {
        $pattern = '~<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?</\1\s*>|</?([a-zA-Z][a-zA-Z0-9:-]*)\b(?:[^>\x22\x27]|\x22[^\x22]*\x22|\x27[^\x27]*\x27)*>~i';
        if (!preg_match_all($pattern, $html, $tokens, PREG_OFFSET_CAPTURE)) { return $html; }
        $start = null;
        $tag = null;
        $depth = 0;
        foreach ($tokens[0] as $token) {
            $raw = $token[0];
            $offset = $token[1];
            if (!preg_match('~^<(/?)([a-zA-Z][a-zA-Z0-9:-]*)\b~', $raw, $parts)) { continue; }
            $name = strtolower($parts[2]);
            if ($name === 'script' || $name === 'style') { continue; }
            $closing = $parts[1] === '/';
            if ($start === null) {
                if ($closing || !in_array($name, array('div', 'section', 'article', 'aside'), true)) { continue; }
                if (!preg_match('~\bdata-id\s*=\s*([\x22\x27])' . preg_quote($id, '~') . '\1~', $raw)) { continue; }
                $start = $offset;
                $tag = $name;
                $depth = 1;
                continue;
            }
            if ($name !== $tag) { continue; }
            $depth += $closing ? -1 : (preg_match('~/\s*>$~', $raw) ? 0 : 1);
            if ($depth === 0) {
                return substr($html, 0, $start) . $replacement . substr($html, $offset + strlen($raw));
            }
        }
        return $html;
    }

    public static function headings($html, $page_id) {
        return preg_replace_callback('~(<h[1-6]\b[^>]*>)([\s\S]*?)(</h[1-6]\s*>)~i', function ($match) use ($page_id) {
            $text = self::plain($match[2]);
            $replacement = null;
            if ($page_id === 151) {
                $professional_headings = array(
                    '75 000+' => 'Présence',
                    'références / an' => 'Offre en préparation',
                    '30 à 40%' => 'Collaboration',
                    "d'ouverture de dossier" => 'Prix à définir',
                    'd’ouverture de dossier' => 'Prix à définir',
                    '8 à 12x' => 'Cabinet',
                    'retour sur investissement' => 'Conditions à définir',
                    'Besoinavocat.ca est une plateforme Web qui permet à des avocats de rencontrer des clients potentiels. En offrant un espace de réseautage bien pensé, Besoinavocat.ca permet de jumeler le bon professionnel/cabinet au bon client selon une correspondance de critères bien précis : budget, domaine d’expertise, spécialité (particulier ou entreprise), proximité, etc.' => 'BesoinAvocat prépare un espace de travail pour organiser les pièces et les échanges entre clients et professionnels. Les fonctions de collaboration, les accès et les offres sont en préparation ; aucun réseau de mise en relation ni abonnement n’est activé par cet aperçu.'
                );
                if (isset($professional_headings[$text])) {
                    return $match[1] . esc_html($professional_headings[$text]) . $match[3];
                }
            }
            if ($text === '+ de 800 avocats compétents, partout au Québec et en Ontario!') {
                $replacement = 'Préparez votre dossier avec BesoinAvocat.';
            } elseif ($text === 'More than 800 lawyers all around Quebec and Ontario!') {
                $replacement = 'Prepare your case with BesoinAvocat.';
            } elseif ($page_id === 5529 && $text === 'Liste des Meilleurs Avocats à Montréal (2025) - Plus de 800 avocats partenaires') {
                $replacement = 'Préparer une consultation juridique à Montréal';
            } elseif ($page_id === 827 && in_array($text, array(
                'Are you looking for a lawyer specialized in real estate law? Look no further, JuriGo can put you in contact with one of our partner lawyers!',
                'Are you looking for a lawyer specialized in real estate law? Look no further, BesoinAvocat can put you in contact with one of our partner lawyers!',
                'Are you looking for a lawyer specialized in real estate law? Look no further, Besoinavocat can put you in contact with one of our partner lawyers!'
            ), true)) {
                $replacement = 'Prepare your real estate law questions and documents with BesoinAvocat.';
            } elseif ($page_id === 13 && $text === 'Besoinavocat.ca est un service gratuit développé par des professionnels du droit qui vous permet d’être mis en relation avec un avocat susceptible de vous aider efficacement. Nous croyons qu’avec une prise en charge rapide, vous optimisez vos chances de gagner votre dossier.') {
                $replacement = 'BesoinAvocat vous aide à organiser vos informations et à préparer vos échanges avec un avocat.';
            }
            return $replacement === null ? $match[0] : $match[1] . esc_html($replacement) . $match[3];
        }, $html);
    }

    private static function page_widget($html, $page_id, $widget_id = null) {
        $rules = require __DIR__ . '/render-rules.php';
        foreach ($rules as $rule) {
            if ($page_id !== $rule['page_id'] || ($widget_id !== null && $widget_id !== $rule['widget_id'])) { continue; }
            // A rule applies only to the observed full text, never to a broad keyword.
            if (strpos(self::plain($html), self::plain($rule['before'])) === false) { continue; }
            if ($widget_id !== null) { return $rule['after']; }
            $html = self::replace_element($html, $rule['widget_id'], '<div class="ba-editorial-correction">' . $rule['after'] . '</div>');
        }
        return $html;
    }

    private static function thetford($html, $page_id) {
        if ($page_id !== 5715) { return $html; }
        return str_replace(array(
            'À la recherche d’un avocat spécialisé en droit criminel? Besoinavocat vous conseille les trois cabinets suivants:',
            'À la recherche d’un avocat spécialisé en droit criminel? BesoinAvocat vous conseille les trois cabinets suivants:'
        ), 'Noms cités dans cet article au sujet du droit criminel, sans recommandation ni partenariat avec BesoinAvocat :', $html);
    }

    public static function recurrent_claims($html, $page_id = 0) {
        $neutral = 'BesoinAvocat vous aide à préparer vos informations et vos questions avant une consultation juridique.';
        $rules = array(
            'Ne cherchez plus loin, Besoinavocat peut vous mettre rapidement en contact avec l’un de nos avocats partenaires dans votre coin!' => $neutral,
            'Ne cherchez plus, Besoinavocat peut vous mettre en contact avec l’un de nos avocats partenaires!' => $neutral,
            'Vous n’avez pas à chercher plus loin, Besoinavocat peut vous mettre en contact avec l’un de nos avocats partenaires!' => $neutral,
            'Ne cherchez plus loin, Besoinavocat peut vous mettre en contact avec l’un de nos avocats partenaires!' => $neutral,
            'Nous pouvons vous mettre en contact avec l’un de nos avocats partenaires qualifiés en matière de bail commercial.' => 'Rassemblez votre bail commercial et les échanges utiles avant de consulter un avocat.'
        );
        if ($page_id === 13) {
            $rules += array(
                'Notre système trie les avocats pour répondre à vos besoins et préférences.' => 'Préparez votre recherche en précisant votre besoin et les questions à poser.',
                'Vous êtes mis en relation avec un avocat pour répondre à votre besoin.' => 'Confirmez directement avec le professionnel la prise en charge et les services proposés.',
                'Avec Besoinavocat.ca, choisissez le bon professionnel et augmentez vos chances de gagner votre dossier!' => 'Avec BesoinAvocat, préparez les informations et les pièces utiles à votre dossier.',
                'Besoinavocat.ca croit qu’en choisissant le bon professionnel, vous augmenterez vos chances de gagner votre dossier.' => 'Choisissez votre professionnel et convenez directement avec lui du mandat, des services et des honoraires. Aucun résultat ne peut être garanti.'
            );
        }
        // The two observed NBSP variants are decoded here. Only text nodes are
        // considered; tags, attributes, comments, scripts and styles are untouched.
        foreach (array_keys($rules) as $before) {
            $rules[str_replace('Besoinavocat ', "Besoinavocat\xc2\xa0", $before)] = $rules[$before];
        }
        $tokens = '~<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?</\1\s*>|<(?:[^>\x22\x27]|\x22[^\x22]*\x22|\x27[^\x27]*\x27)*>|([^<]+)~i';
        return preg_replace_callback($tokens, function ($match) use ($rules) {
            if (!isset($match[2]) || $match[2] === '') { return $match[0]; }
            $text = html_entity_decode($match[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $changed = strtr($text, $rules);
            return $text === $changed ? $match[0] : htmlspecialchars($changed, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }, $html);
    }

    private static function professional_faq() {
        return '<section class="ba-integrity-note ba-professional-faq" aria-labelledby="ba-professional-faq-title"><h2 id="ba-professional-faq-title">Les offres professionnelles se préparent</h2><h3>Quelles offres sont prévues ?</h3><p>Présence, Collaboration et Cabinet sont trois offres en préparation. Leurs fonctionnalités et leurs conditions restent à définir.</p><h3>Quels sont les prix ?</h3><p>Les prix sont à définir. Aucun volume de références, taux de conversion ou rendement n’est promis.</p><h3>Un abonnement est-il activé ?</h3><p>Non. Cette présentation ne crée aucun compte professionnel, mandat ou abonnement. Les honoraires d’un avocat sont convenus directement avec son client.</p></section>';
    }

    public static function widget($html, $widget) {
        if (is_admin()) { return $html; }
        $page_id = (int) get_queried_object_id();
        if ($page_id === 151 && $widget->get_id() === '9f15bdf') { return self::professional_faq(); }
        $html = self::page_widget($html, $page_id, $widget->get_id());
        return self::recurrent_claims(self::thetford(self::headings($html, $page_id), $page_id), $page_id);
    }

    public static function content($html) {
        if (is_admin() || !is_singular('page')) { return $html; }
        $page_id = (int) get_queried_object_id();
        $html = self::page_widget($html, $page_id);
        $html = self::recurrent_claims(self::thetford(self::headings($html, $page_id), $page_id), $page_id);
        if ($page_id === 13) {
            $html = self::replace_element($html, '5f7e339', '');
            $html = self::replace_element($html, 'a589ac7', '<section class="ba-integrity-note" aria-labelledby="ba-first-exchange"><h2 id="ba-first-exchange">Bien préparer votre premier échange</h2><p>Rassemblez les faits, les dates clés et les pièces disponibles.</p></section>');
        }
        if ($page_id === 151) {
            $html = self::replace_element($html, '9f15bdf', self::professional_faq());
        }
        // Elementor renders header/footer templates through the same hook. Only
        // the actual page document receives a note, never those other fragments.
        $main_document = preg_match('~\bdata-elementor-id\s*=\s*([\x22\x27])' . $page_id . '\1~', $html);
        if ($main_document && in_array($page_id, array(2186, 4663, 5009, 5082, 5595, 5715), true) && strpos($html, 'id="ba-editorial-affiliations"') === false) {
            $html = '<aside id="ba-editorial-affiliations" class="ba-integrity-note"><p>Les cabinets cités dans cet article ne sont pas des partenaires de BesoinAvocat. Ces noms sont conservés à titre documentaire ; leur présence ne constitue pas une recommandation de BesoinAvocat.</p></aside>' . $html;
        }
        return $html;
    }
}

BesoinAvocat_Render_Integrity::boot();
