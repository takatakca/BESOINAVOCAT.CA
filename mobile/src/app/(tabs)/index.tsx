// Accueil: greeting, the file in progress with its preparation steps, what is coming up, quick actions.
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Empty, ErrorNote, Eyebrow, Loading, ProgressBar, Row, Screen, tap } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';
import { useSession } from '../../lib/session';
import { STATUS_LABEL, bytes, daysLabel, formatDate, relative } from '../../lib/format';
import { readinessRatio, readinessSteps } from '../../lib/readiness';
import { colors, fonts, radius, type } from '../../lib/theme';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user, isLawyer } = useSession();
  const { data, error, loading, refreshing, refresh } = useData(async () => {
    const [{ cases }, upcoming, billing] = await Promise.all([api.cases(), api.upcoming(30).catch(() => ({ deadlines: [] })), api.billing().catch(() => null)]);
    const own = cases.filter(c => c.role === 'client');
    const focus = own.find(c => c.profile?.status !== 'accepte') ?? own[0] ?? cases[0] ?? null;
    const details = focus ? await api.caseDetails(focus.id).catch(() => null) : null;
    return { cases, focus, details, deadlines: upcoming.deadlines, billing };
  });

  if (loading) return <Loading />;
  const firstName = (user?.name ?? '').split(' ')[0];

  const steps = data?.details ? readinessSteps(data.details) : [];
  const ratio = readinessRatio(steps);
  const next = steps.find(s => !s.done);
  const lastMessage = data?.details?.messages.at(-1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={type.label}>{formatDate(new Date().toISOString())}</Text>
          <Pressable onPress={() => { tap(); router.push('/search'); }} hitSlop={10} accessibilityLabel="Rechercher" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search" size={19} color={colors.navy} />
          </Pressable>
        </View>
        <Text style={[type.display, { marginTop: 6 }]}>{greeting()}{firstName ? `, ${firstName}` : ''}.</Text>
        <Text style={[type.body, { marginTop: 4, marginBottom: 22 }]}>{isLawyer ? 'Vos dossiers et ceux qui attendent un avocat.' : 'Voici où en est votre dossier.'}</Text>

        {error ? <ErrorNote message={error} onRetry={refresh} /> : null}

        {data?.focus && data.details ? (
          <Card accent style={{ marginBottom: 16 }} onPress={() => router.push(`/case/${data.focus!.id}`)}>
            <Eyebrow>Dossier en cours</Eyebrow>
            <Text style={[type.title, { fontSize: 24 }]} numberOfLines={2}>{data.focus.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Badge label={(STATUS_LABEL[data.focus.profile?.status] ?? STATUS_LABEL.preparation).label} tone={(STATUS_LABEL[data.focus.profile?.status] ?? STATUS_LABEL.preparation).tone} />
              {data.focus.profile?.domainLabel ? <Badge label={data.focus.profile.domainLabel} tone="muted" /> : null}
            </View>
            {data.focus.role === 'client' && data.focus.profile?.status !== 'accepte' ? (
              <View style={{ marginTop: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 }}>Préparation</Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.wine }}>{Math.round(ratio * 100)} %</Text>
                </View>
                <ProgressBar ratio={ratio} />
                {steps.map(s => (
                  <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: s.done ? colors.green : colors.surface, borderWidth: s.done ? 0 : 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                      {s.done ? <Icon name="check" size={13} color={colors.white} strokeWidth={2.6} /> : null}
                    </View>
                    <Text style={[type.small, { color: s.done ? colors.muted : colors.ink, textDecorationLine: s.done ? 'line-through' : 'none' }]}>{s.label}</Text>
                  </View>
                ))}
                {next ? <Button title={next.id === 'documents' ? 'Ajouter une pièce' : 'Continuer la préparation'} icon={next.id === 'documents' ? 'upload' : 'sparkle'} small style={{ marginTop: 16 }}
                  onPress={() => router.push(next.id === 'documents' ? `/case/${data.focus!.id}?tab=pieces` : `/case/${data.focus!.id}/prepare`)} /> : null}
              </View>
            ) : data.focus.profile?.status === 'accepte' ? (
              <Text style={[type.small, { marginTop: 12 }]}>Un avocat a accepté ce dossier le {formatDate(data.focus.profile.acceptedAt)}. Vous pouvez maintenant convenir du mandat avec lui.</Text>
            ) : null}
          </Card>
        ) : !error ? (
          <Card accent style={{ marginBottom: 16 }}>
            <Empty icon="folder" title="Créez votre premier dossier" text="Donnez-lui un titre, puis ajoutez vos pièces à votre rythme." action={<Button title="Nouveau dossier" icon="plus" onPress={() => router.push('/case/new')} />} />
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <Quick icon="camera" label="Photographier une pièce" onPress={() => data?.focus ? router.push(`/case/${data.focus.id}?tab=pieces&add=camera`) : router.push('/case/new')} />
          <Quick icon="message" label="Écrire à l’avocat" onPress={() => data?.focus ? router.push(`/case/${data.focus.id}?tab=echanges`) : router.push('/case/new')} />
          <Quick icon="plus" label="Nouveau dossier" onPress={() => router.push('/case/new')} />
        </View>

        <Eyebrow>À venir</Eyebrow>
        <Card style={{ paddingVertical: 4, marginBottom: 22 }}>
          {data?.deadlines.length ? data.deadlines.slice(0, 4).map((d, i, all) => (
            <Row key={d.id} icon="clock" tint={d.overdue ? colors.wine : colors.navy} title={d.title} subtitle={`${daysLabel(d.daysLeft)} · ${d.caseTitle ?? ''}`} last={i === all.length - 1} onPress={() => d.caseId && router.push(`/case/${d.caseId}?tab=echeances`)} />
          )) : <Text style={[type.small, { paddingVertical: 16 }]}>Aucune échéance dans les 30 prochains jours.</Text>}
        </Card>

        {lastMessage ? (
          <>
            <Eyebrow>Dernier échange</Eyebrow>
            <Card style={{ marginBottom: 22 }} onPress={() => router.push(`/case/${data!.focus!.id}?tab=echanges`)}>
              <Text style={type.body} numberOfLines={3}>{lastMessage.body}</Text>
              <Text style={[type.small, { marginTop: 8 }]}>{relative(lastMessage.createdAt)}</Text>
            </Card>
          </>
        ) : null}

        {data?.billing?.billed && data.billing.usage ? (
          <>
            <Eyebrow>Mon forfait</Eyebrow>
            <Card style={{ marginBottom: 22 }} onPress={() => router.push('/plans')}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={type.heading}>{data.billing.plan?.label ?? 'Découverte'}</Text>
                <Text style={type.small}>{bytes(data.billing.usage.bytes)} sur {bytes(data.billing.usage.quotaBytes)}</Text>
              </View>
              <ProgressBar ratio={data.billing.usage.percent / 100} color={data.billing.usage.percent > 85 ? colors.wine : colors.navy3} />
            </Card>
          </>
        ) : null}

        <View style={{ backgroundColor: colors.sunken, borderRadius: radius.md, padding: 14 }}>
          <Text style={[type.small, { fontSize: 12 }]}>BesoinAvocat est un outil de préparation de dossier. Ce n’est pas un cabinet d’avocats et il ne donne pas de conseils juridiques.</Text>
        </View>
      </Screen>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12, minHeight: 92, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.goldInk} />
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink, lineHeight: 16, marginTop: 8 }}>{label}</Text>
    </Pressable>
  );
}
