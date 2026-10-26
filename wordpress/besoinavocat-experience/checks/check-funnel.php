<?php
// Standalone PHP 7.4+ checks. No WordPress/database/network bootstrap.
function get_locale() { return 'fr_CA'; }
function home_url($path) { return 'https://besoinavocat.example' . $path; }
require dirname(__DIR__) . '/funnel.php';
function funnel_check($condition, $label) {
    if (!$condition) { throw new RuntimeException($label); }
}
ob_start();
$inline = ba_render_funnel('client', array('id' => 'intake-test'));
$unexpected_output = ob_get_clean();
funnel_check($unexpected_output === '', 'Renderer returns a string without echoing outside its buffer');
funnel_check(strpos($inline, 'data-ba-mode="inline"') !== false, 'Inline is the default');
funnel_check(strpos($inline, 'data-ba-intake-endpoint=""') !== false, 'No implicit online intake endpoint');
funnel_check(strpos($inline, 'data-ba-context="client"') !== false, 'Client context');
funnel_check(strpos($inline, 'data-ba-fr=') !== false && strpos($inline, 'data-ba-en=') !== false, 'Bilingual content present');
funnel_check(strpos($inline, 'change uniquement la langue de ce parcours') !== false, 'Language scope explicitly limited to the form');
funnel_check(strpos($inline, '100 <span>CAD</span>') !== false && strpos($inline, '300 <span>CAD</span>') !== false, 'Approved professional prices');
funnel_check(strpos($inline, '0 <span>CAD</span>') !== false, 'Free client request');
funnel_check(strpos($inline, 'Les crédits IA sont séparés') !== false, 'AI credits remain separate');
funnel_check(strpos($inline, 'ne déclenche aucun paiement') !== false, 'No checkout claim');
funnel_check(strpos($inline, 'tel:+15148252825') !== false, 'Phone fallback');
funnel_check(strpos($inline, '<script') === false && strpos($inline, '<form') === false, 'No executable script or nonfunctional fallback form');
$modal = ba_render_funnel('professional', array('mode' => 'modal', 'id' => 'intake-modal', 'language' => 'en', 'endpoint' => 'https://portal.example/api/intake'));
funnel_check(strpos($modal, '<dialog ') !== false && strpos($modal, '</dialog>') !== false, 'Native modal rendered');
funnel_check(!preg_match('/<dialog[^>]*\sopen(?:\s|=|>)/i', $modal), 'Modal is closed until explicitly opened');
funnel_check(strpos($modal, 'data-ba-language="en"') !== false && strpos($modal, 'data-ba-context="professional"') !== false, 'Professional and English preferences retained');
funnel_check(strpos($modal, 'data-ba-intake-endpoint="https://portal.example/api/intake"') !== false, 'Explicit HTTPS intake accepted');
foreach (array('http://portal.example/api/intake', 'https://u:p@portal.example/api/intake', 'https://portal.example/api/intake?name=test', 'https://portal.example/api/intake#token', 'https://portal.example/other', 'javascript:alert(1)') as $invalid) {
    $out = ba_render_funnel('client', array('endpoint' => $invalid));
    funnel_check(strpos($out, 'data-ba-intake-endpoint=""') !== false, 'Unsafe endpoint rejected: ' . $invalid);
}
$relative = ba_render_funnel('client', array('endpoint' => '/api/intake'));
funnel_check(strpos($relative, 'data-ba-intake-endpoint="/api/intake"') !== false, 'Explicit same-origin endpoint accepted');
$escaped = ba_render_funnel('<script>bad</script>', array('id' => 'bad" onload="alert(1)', 'language' => '<script>'));
funnel_check(strpos($escaped, 'onload=') === false && strpos($escaped, '<script>') === false, 'Untrusted options cannot inject markup');
funnel_check(strpos($escaped, 'data-ba-context="client"') !== false && strpos($escaped, 'data-ba-language="fr"') !== false, 'Invalid options use safe defaults');
$source = file_get_contents(dirname(__DIR__) . '/funnel.php');
foreach (array('add_filter(', 'add_action(', 'wp_update_post(', 'update_post_meta(', 'wp_mail(', 'wp_remote_post(', '$wpdb') as $forbidden) {
    funnel_check(strpos($source, $forbidden) === false, 'No post/form mutation or external action: ' . $forbidden);
}
echo "Funnel PHP checks passed.\n";
