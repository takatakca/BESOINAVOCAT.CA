// Plans (grille A, D-043) and the person's current plan and space used. Payment happens on the web portal only:
// store rules (Apple, Google) do not allow a card checkout for digital plans inside the app, so the app shows the
// plans and the current state, and says where to manage them, without a purchase button.
import { Text, View } from 'react-native';
import { Badge, Card, ErrorNote, Eyebrow, Loading, Notice, ProgressBar, Screen } from '../components/ui';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useData } from '../lib/useData';
import { useSession } from '../lib/session';
import { bytes, money } from '../lib/format';
import { colors, fonts, type } from '../lib/theme';

export default function Plans() {
  const { isLawyer } = useSession();
  const { data, error, loading, refreshing, refresh } = useData(async () => {
    const [pricing, billing] = await Promise.all([api.pricing(), api.billing().catch(() => null)]);
    return { pricing, billing };
  });
  if (loading) return <Loading />;
  const current = data?.billing?.plan?.id ?? 'free';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {data?.billing?.billed && data.billing.usage ? (
        <Card accent style={{ marginBottom: 22 }}>
          <Eyebrow>Mon forfait</Eyebrow>
          <Text style={type.title}>{data.billing.plan?.label}</Text>
          <View style={{ marginTop: 14 }}>
            <ProgressBar ratio={data.billing.usage.percent / 100} />
            <Text style={[type.small, { marginTop: 8 }]}>{bytes(data.billing.usage.bytes)} utilisés sur {bytes(data.billing.usage.quotaBytes)} · {data.billing.usage.cases} dossier{data.billing.usage.cases > 1 ? 's' : ''}{data.billing.usage.maxCases ? ` sur ${data.billing.usage.maxCases}` : ''}</Text>
          </View>
        </Card>
      ) : null}

      {!isLawyer ? (
        <>
          <Eyebrow>Forfaits clients</Eyebrow>
          {data?.pricing.client.plans.map(p => (
            <Card key={p.id} style={{ marginBottom: 14, ...(p.id === current ? { borderColor: colors.wine, borderWidth: 1.5 } : {}) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.title, { fontSize: 24 }]}>{p.label}</Text>
                  <Text style={[type.small, { marginTop: 2 }]}>{p.tagline}</Text>
                </View>
                {p.id === current ? <Badge label="Actuel" tone="wine" /> : null}
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink, marginTop: 14 }}>
                {p.prices.month ? `${money(p.prices.month)}` : 'Gratuit'}
                {p.prices.month ? <Text style={[type.small, { fontFamily: fonts.regular }]}> / mois{p.prices.year ? ` · ou ${money(p.prices.year)} / an` : ''}</Text> : null}
              </Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {p.features.map(f => (
                  <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Icon name="check" size={16} color={colors.green} strokeWidth={2.4} />
                    <Text style={[type.small, { color: colors.ink2, flex: 1 }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
          <Text style={[type.small, { marginBottom: 16, fontSize: 12 }]}>Prix en dollars canadiens, taxes en sus. Essai gratuit de {data?.pricing.trialDays ?? 14} jours sur les forfaits payants.</Text>
        </>
      ) : null}

      <Notice icon="globe">Pour changer de forfait ou gérer votre paiement, connectez-vous au portail BesoinAvocat depuis un navigateur. Votre forfait s’applique aussitôt dans l’application.</Notice>
    </Screen>
  );
}
