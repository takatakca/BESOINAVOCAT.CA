<?php
// Standalone checks; not packaged or loaded by WordPress.
define('ABSPATH', __DIR__);
function add_filter() {}
function is_admin() { return false; }
function is_singular($type = null) { return true; }
function get_queried_object_id() { return $GLOBALS['test_page']; }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
require dirname(__DIR__) . '/render-integrity.php';
function check($condition, $label) { if (!$condition) { throw new RuntimeException($label); } }
$GLOBALS['test_page'] = 13;
$source = '<main><div data-id="5f7e339"><div>4.6</div><div><span>839 Google Reviews</span></div></div><div data-id="keep">Keep</div><div data-id="a589ac7"><div>Historical review</div></div><footer>Regions</footer></main>';
$out = BesoinAvocat_Render_Integrity::content($source);
check(strpos($out, '839') === false && strpos($out, 'Historical review') === false, 'Review blocks removed');
check(strpos($out, '<div data-id="keep">Keep</div>') !== false && strpos($out, '<footer>Regions</footer>') !== false, 'Adjacent content untouched');
check(substr_count($out, '<div') === substr_count($out, '</div>'), 'Div balance preserved');
check(BesoinAvocat_Render_Integrity::content($out) === $out, 'Idempotent correction');
$broken = '<div data-id="target"><div>incomplete';
check(BesoinAvocat_Render_Integrity::replace_element($broken, 'target', '') === $broken, 'Malformed content unchanged');
$nested = '<section data-id="target"><section title="a > b">inner</section><script>"</section>"</script></section><p>after</p>';
check(BesoinAvocat_Render_Integrity::replace_element($nested, 'target', '') === '<p>after</p>', 'Nested quoted and raw-text tags');
$unrelated = '<h2>800 dollars : question de preuve</h2><p>Le partenaire commercial de la société</p>';
check(BesoinAvocat_Render_Integrity::headings($unrelated, 123) === $unrelated, 'Unrelated numbers and partners unchanged');
check(strpos(BesoinAvocat_Render_Integrity::headings('<h2>+ de 800 avocats compétents,<br />partout au Québec et en Ontario!</h2>', 123), '800') === false, 'Exact 800 heading corrected');
check(strpos(BesoinAvocat_Render_Integrity::headings('<h2>Are you looking for a lawyer specialized in real estate law? Look no further, BesoinAvocat can put you in contact with one of our partner lawyers!</h2>', 827), 'our partner lawyers') === false, 'English affiliate heading corrected');
$claim = 'Ne cherchez plus loin, Besoinavocat&nbsp;peut vous mettre en contact avec l’un de nos avocats partenaires!';
$claim_out = BesoinAvocat_Render_Integrity::recurrent_claims('<p>' . $claim . '</p><a href="/keep/">Lien conservé</a>');
check(strpos($claim_out, 'avocats partenaires') === false && strpos($claim_out, '<a href="/keep/">Lien conservé</a>') !== false, 'Exact recurrent CTA corrected, link preserved');
$script = '<script>const old = "' . $claim . '";</script>';
check(BesoinAvocat_Render_Integrity::recurrent_claims($script) === $script, 'Raw script text untouched');
$home_claim = '<h2>Besoinavocat.ca croit qu’en choisissant le bon professionnel, vous augmenterez vos chances de gagner votre dossier.<br>Vous souhaitez en savoir plus?<u><a href="/faq">Consultez notre page d’information!</a></u></h2>';
$home_out = BesoinAvocat_Render_Integrity::recurrent_claims($home_claim, 13);
check(strpos($home_out, 'vous augmenterez vos chances') === false && strpos($home_out, '<u><a href="/faq">Consultez notre page d’information!</a></u>') !== false, 'Home claim changed and FAQ link preserved');
check(BesoinAvocat_Render_Integrity::recurrent_claims($home_claim, 999) === $home_claim, 'New home correction stays within page13');
$GLOBALS['test_page'] = 5715;
$editorial = BesoinAvocat_Render_Integrity::content('<div data-elementor-id="5715"><p>À la recherche d’un avocat spécialisé en droit criminel? Besoinavocat vous conseille les trois cabinets suivants:</p><ul><li>Doyons Avocats</li></ul></div>');
check(strpos($editorial, 'Doyons Avocats') !== false && strpos($editorial, 'vous conseille') === false, 'Named citation retained without recommendation');
check(strpos($editorial, 'ne sont pas des partenaires') !== false, 'Editorial note');
$thetf = '<p>Voici le TOP 3 des meilleurs avocats familialistes à Thetford Mines:</p><ul><li><a href="/source/">Chabot & associés</a></li></ul><p>Article 1457 du Code civil, référence informative.</p>';
$thetf_out = BesoinAvocat_Render_Integrity::recurrent_claims($thetf, 5715);
check(strpos($thetf_out, 'TOP 3') === false && strpos($thetf_out, '<a href="/source/">Chabot & associés</a>') !== false && strpos($thetf_out, 'Article 1457 du Code civil, référence informative.') !== false, 'Remove ranking while preserving names, links and legal references');
check(BesoinAvocat_Render_Integrity::recurrent_claims($thetf, 999) === $thetf, 'Editorial sentence correction stays scoped to observed page');
$rank = '<h2>Top 10 avocats fiscalistes à Montréal</h2><p>Informations fiscales conservées.</p>';
check(strpos(BesoinAvocat_Render_Integrity::headings($rank, 4663), 'références documentaires') !== false, 'Observed ranking heading neutralized');
check(BesoinAvocat_Render_Integrity::headings($rank, 999) === $rank, 'Other pages not retitled');
$header = '<div data-elementor-id="604"><p>Header unchanged</p></div>';
check(BesoinAvocat_Render_Integrity::content($header) === $header, 'No editorial note in header/footer template');
$GLOBALS['test_page'] = 151;
$professionals = '<h2>75 000+</h2><h2>30 à 40%</h2><h2>8 à 12x</h2><div data-id="9f15bdf"><div>6 000 références par mois</div></div><p>Other text retained</p>';
$professional_out = BesoinAvocat_Render_Integrity::content($professionals);
check(strpos($professional_out, '75 000+') === false && strpos($professional_out, '6 000 références') === false, 'Professional figures and old FAQ removed');
check(strpos($professional_out, 'Other text retained') !== false && strpos($professional_out, '100 $ CA par semaine') !== false && strpos($professional_out, '300 $ CA par mois') !== false, 'Professional prices changed without adjacent loss');
if (isset($argv[1])) {
    $GLOBALS['test_page'] = 13;
    $dom = file_get_contents($argv[1]);
    $changed = BesoinAvocat_Render_Integrity::content($dom);
    foreach (array('5f7e339', 'a589ac7') as $removed) { check(strpos($changed, 'data-id="' . $removed . '"') === false, 'Observed review container removed'); }
    foreach (array('6298a30', 'f2cc2da', '69fc55c', '6f536fd') as $retained) { check(strpos($changed, 'data-id="' . $retained . '"') !== false, 'Observed footer and hero retained'); }
    check(strpos($changed, '839 Google Reviews') === false, 'Observed rating removed');
}
echo "Render integrity checks passed.\n";
