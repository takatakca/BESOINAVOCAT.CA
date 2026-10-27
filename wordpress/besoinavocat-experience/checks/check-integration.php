<?php
// Run without WordPress. No live page, account or request is created.
define('ABSPATH', __DIR__);
$GLOBALS['ba_test_shortcode'] = false;
$GLOBALS['ba_test_enqueued'] = array();
function add_action() {}
function add_filter() {}
function add_shortcode() {}
function is_admin() { return false; }
function is_singular($type = null) { return true; }
function is_front_page() { return true; }
function get_queried_object_id() { return 13; }
function is_main_query() { return true; }
function in_the_loop() { return true; }
function get_post() { return (object) array('post_content' => 'Original article'); }
function has_shortcode($content, $tag) { return $tag === 'besoinavocat_intake' && $GLOBALS['ba_test_shortcode']; }
function get_page_by_path($path) { return null; }
function home_url($path) { return 'https://besoinavocat.ca' . $path; }
function plugin_dir_url($file) { return 'https://besoinavocat.ca/wp-content/plugins/besoinavocat-experience/'; }
function get_locale() { return 'fr_CA'; }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function wp_enqueue_style($handle) { $GLOBALS['ba_test_enqueued'][] = $handle; }
function wp_enqueue_script($handle) { $GLOBALS['ba_test_enqueued'][] = $handle; }
function check_integration($condition, $label) { if (!$condition) { throw new RuntimeException($label); } }
require dirname(__DIR__) . '/besoinavocat-experience.php';

$original = '<article><h1>Information juridique existante</h1><p>Article 1457, source et code conservés.</p><a href="/archives/">Archives</a></article>';
$rendered = BesoinAvocat_Experience::front_content($original);
check_integration(strpos($rendered, $original) === 0, 'Original content retained byte for byte before additions');
check_integration(strpos($rendered, 'data-ba-funnel-open') === false, 'New public trigger disabled by default');
ob_start(); BesoinAvocat_Experience::intake_modal(); $modal = ob_get_clean();
check_integration($modal === '', 'No automatic popup by default');
BesoinAvocat_Experience::assets();
check_integration(!in_array('besoinavocat-funnel', $GLOBALS['ba_test_enqueued'], true), 'Inactive funnel does not load contact scripts');
$GLOBALS['ba_test_shortcode'] = true;
BesoinAvocat_Experience::assets();
check_integration(in_array('besoinavocat-funnel', $GLOBALS['ba_test_enqueued'], true), 'Explicit shortcode loads its assets');
$intake = BesoinAvocat_Experience::intake(array('role' => 'professional', 'endpoint' => 'https://unexpected.example/api/intake'));
check_integration(strpos($intake, 'data-ba-intake-endpoint=""') !== false, 'Shortcode cannot select a contact-data recipient');
check_integration(strpos($intake, 'unexpected.example') === false, 'Untrusted shortcode destination ignored');
check_integration(strpos($intake, 'data-ba-context="professional"') !== false, 'Professional interest is distinct from client path');
check_integration(strpos($rendered, '100 $ CA') !== false && strpos($rendered, '300 $ CA') !== false, 'Announced prices present');
echo "WordPress integration checks passed.\n";
