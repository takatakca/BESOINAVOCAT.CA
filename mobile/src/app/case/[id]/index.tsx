// One file: overview, documents, messages, requested documents, deadlines and appointments.
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Empty, ErrorNote, Eyebrow, Loading, Notice, ProgressBar, Row, Screen, Segmented, success, tap } from '../../../components/ui';
import { Icon } from '../../../components/Icon';
import { api } from '../../../lib/api';
import { useData } from '../../../lib/useData';
import { useSession } from '../../../lib/session';
import { openDocument, pick, Source, upload } from '../../../lib/files';
import { chooseSource } from '../../../components/chooseSource';
import { STATUS_LABEL, bytes, daysLabel, formatDate, formatDateTime, isImage, relative } from '../../../lib/format';
import { readinessRatio, readinessSteps } from '../../../lib/readiness';
import { colors, fonts, radius, type } from '../../../lib/theme';
import type { Document } from '../../../lib/types';

type Tab = 'apercu' | 'pieces' | 'echanges' | 'demandes' | 'echeances' | 'rdv';

export default function CaseScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab; add?: Source }>();
  const id = params.id;
  const { capabilities, user } = useSession();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? params.tab as Tab : 'apercu');
  const [uploading, setUploading] = useState<{ name: string; ratio: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const autoAdd = useRef(params.add);

  const { data, error, loading, refreshing, refresh, reload } = useData(async () => {
    const [details, requests, deadlines] = await Promise.all([
      api.caseDetails(id),
      api.requests(id).catch(() => null),
      api.deadlines(id).catch(() => null),
    ]);
    return { details, requests, deadlines: deadlines?.deadlines ?? [] };
  }, [id]);

  const addDocument = async (source: Source) => {
    try {
      const file = await pick(source);
      if (!file) return;
      setUploading({ name: file.name, ratio: 0 });
      await upload(id, file, capabilities?.maxDocumentBytes, ratio => setUploading({ name: file.name, ratio }));
      success();
      setNotice(`« ${file.name} » a été ajoutée au dossier.`);
      setTab('pieces');
      await reload();
    } catch (e: any) {
      Alert.alert('Ajout impossible', e?.message ?? 'La pièce n’a pas pu être ajoutée.');
    } finally { setUploading(null); }
  };

  useEffect(() => {
    if (!loading && autoAdd.current) { const source = autoAdd.current; autoAdd.current = undefined; addDocument(source); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) return <Loading />;
  if (!data) return <Screen><ErrorNote message={error ?? 'Dossier introuvable.'} onRetry={refresh} /></Screen>;

  const { details, requests, deadlines } = data;
  const c = details.case;
  const status = STATUS_LABEL[c.profile?.status ?? 'preparation'] ?? STATUS_LABEL.preparation;
  const latest = latestVersions(details.documents);
  const sessions = details.communications?.sessions ?? [];
  const openRequests = requests?.open ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}
      footer={tab === 'echanges' ? <Composer caseId={id} onSent={reload} /> : tab === 'pieces' ? <Button title="Ajouter une pièce" icon="upload" onPress={() => chooseSource(addDocument)} loading={Boolean(uploading)} /> : undefined}>
      <Stack.Screen options={{ title: c.reference || 'Dossier' }} />
      <Text style={type.title}>{c.title}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Badge label={status.label} tone={status.tone} />
        {c.profile?.domainLabel ? <Badge label={c.profile.domainLabel} tone="muted" /> : null}
      </View>

      <View style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 18 }}>
        <Segmented<Tab> value={tab} onChange={setTab} options={[
          { id: 'apercu', label: 'Aperçu' },
          { id: 'pieces', label: 'Pièces', count: latest.length },
          { id: 'echanges', label: 'Échanges', count: details.messages.length },
          { id: 'demandes', label: 'Demandes', count: openRequests },
          { id: 'echeances', label: 'Échéances', count: deadlines.length },
          { id: 'rdv', label: 'Rendez-vous', count: sessions.length },
        ]} />
      </View>

      {error ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {notice ? <View style={{ marginBottom: 14 }}><Notice icon="check">{notice}</Notice></View> : null}
      {uploading ? (
        <Card style={{ marginBottom: 14 }}>
          <Text style={[type.small, { marginBottom: 8 }]} numberOfLines={1}>Envoi de « {uploading.name} »…</Text>
          <ProgressBar ratio={uploading.ratio} />
        </Card>
      ) : null}

      {tab === 'apercu' ? <Overview data={data} onTab={setTab} onAdd={() => chooseSource(addDocument)} /> : null}

      {tab === 'pieces' ? (
        latest.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {latest.map((d, i) => <DocumentRow key={d.id} caseId={id} doc={d} last={i === latest.length - 1} />)}
          </Card>
        ) : <Empty icon="file" title="Aucune pièce" text="Photographiez un document ou choisissez un fichier. Formats acceptés : PDF, images, Word, Excel, texte." />
      ) : null}

      {tab === 'echanges' ? (
        details.messages.length ? details.messages.map(m => {
          const mine = Boolean(user && m.authorSubject === user.subject);
          return (
            <View key={m.id} style={{ marginBottom: 12, alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <View style={mine
                ? { backgroundColor: colors.wine, borderRadius: radius.lg, borderTopRightRadius: 4, padding: 14, maxWidth: '88%' }
                : { backgroundColor: colors.surface, borderRadius: radius.lg, borderTopLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: colors.line, maxWidth: '88%' }}>
                <Text style={[type.body, mine ? { color: '#fff' } : null]}>{m.body}</Text>
              </View>
              <Text style={[type.small, { fontSize: 11.5, marginTop: 4, marginHorizontal: 4 }]}>{mine ? 'Vous · ' : ''}{formatDateTime(m.createdAt)}</Text>
            </View>
          );
        }) : <Empty icon="message" title="Aucun échange" text="Écrivez vos questions pour l’avocat. Il les retrouvera dans le dossier." />
      ) : null}

      {tab === 'demandes' ? (
        requests?.requests.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {requests.requests.map((r, i, all) => (
              <Row key={r.id} icon={r.status === 'requested' ? 'inbox' : r.status === 'accepted' ? 'check' : 'clock'} tint={r.status === 'requested' ? colors.wine : colors.navy}
                title={r.title} subtitle={[requestLabel(r.status), r.dueDate ? `avant le ${formatDate(r.dueDate)}` : ''].filter(Boolean).join(' · ')}
                last={i === all.length - 1} onPress={() => router.push(`/case/${id}/request/${r.id}`)} />
            ))}
          </Card>
        ) : <Empty icon="inbox" title="Aucune pièce demandée" text="Quand votre avocat vous demande un document, il apparaît ici." />
      ) : null}

      {tab === 'echeances' ? (
        deadlines.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {deadlines.map((d, i, all) => (
              <Row key={d.id} icon="clock" tint={d.overdue ? colors.wine : colors.navy} title={d.title}
                subtitle={`${formatDate(d.dueDate)}${d.dueTime ? ` · ${d.dueTime.slice(0, 5)}` : ''} · ${d.status === 'open' ? daysLabel(d.daysLeft) : d.status === 'done' ? 'Faite' : 'Annulée'}`}
                last={i === all.length - 1} />
            ))}
          </Card>
        ) : <Empty icon="calendar" title="Aucune échéance" text="Les dates importantes fixées par votre avocat apparaîtront ici." />
      ) : null}

      {tab === 'rdv' ? (
        sessions.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {sessions.map((s, i, all) => (
              <Row key={s.id} icon={s.kind.includes('phone') || s.kind === 'mimt' ? 'phone' : 'video'} title={s.title || 'Rendez-vous'}
                subtitle={`${formatDateTime(s.scheduledAt)}${s.status === 'cancelled' ? ' · annulé' : ''}`} last={i === all.length - 1}
                onPress={s.joinUrl && s.status !== 'cancelled' ? () => Linking.openURL(s.joinUrl!) : undefined}
                right={s.joinUrl && s.status !== 'cancelled' ? <Badge label="Rejoindre" tone="wine" /> : undefined} />
            ))}
          </Card>
        ) : <Empty icon="video" title="Aucun rendez-vous" text="Les appels et rencontres vidéo prévus avec votre avocat apparaîtront ici." />
      ) : null}
    </Screen>
  );
}

function Overview({ data, onTab, onAdd }: { data: any; onTab: (t: Tab) => void; onAdd: () => void }) {
  const { details } = data;
  const c = details.case;
  const steps = readinessSteps(details);
  const ratio = readinessRatio(steps);
  const isClient = c.role === 'client';
  return (
    <View>
      {isClient && c.profile?.status !== 'accepte' ? (
        <Card accent style={{ marginBottom: 16 }}>
          <Eyebrow>Préparation pour un avocat</Eyebrow>
          <ProgressBar ratio={ratio} />
          {steps.map(s => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Icon name={s.done ? 'check' : 'clock'} size={17} color={s.done ? colors.green : colors.faint} strokeWidth={2.2} />
              <Text style={[type.small, { color: s.done ? colors.muted : colors.ink }]}>{s.label}</Text>
            </View>
          ))}
          <Button title={c.profile?.status === 'pret' ? 'Modifier le résumé' : 'Préparer le dossier'} icon="sparkle" small style={{ marginTop: 16 }} onPress={() => router.push(`/case/${c.id}/prepare`)} />
        </Card>
      ) : null}
      {c.profile?.status === 'accepte' ? (
        <View style={{ marginBottom: 16 }}><Notice icon="check">Un avocat a accepté ce dossier le {formatDate(c.profile.acceptedAt)}. Les conditions du mandat se discutent directement avec lui.</Notice></View>
      ) : null}
      {c.profile?.summary ? (
        <Card style={{ marginBottom: 16 }}>
          <Eyebrow>Situation</Eyebrow>
          <Text style={type.body}>{c.profile.summary}</Text>
        </Card>
      ) : null}
      <Card style={{ paddingVertical: 4, marginBottom: 16 }}>
        <Row icon="file" title="Pièces" subtitle={`${latestVersions(details.documents).length} au dossier`} onPress={() => onTab('pieces')} />
        <Row icon="message" title="Échanges" subtitle={details.messages.length ? `Dernier ${relative(details.messages.at(-1).createdAt)}` : 'Aucun message'} onPress={() => onTab('echanges')} />
        <Row icon="inbox" title="Pièces demandées" subtitle={data.requests?.open ? `${data.requests.open} à fournir` : 'Rien à fournir'} tint={data.requests?.open ? colors.wine : colors.navy} onPress={() => onTab('demandes')} />
        <Row icon="calendar" title="Échéances" subtitle={data.deadlines.length ? `${data.deadlines.length} au calendrier` : 'Aucune'} onPress={() => onTab('echeances')} last />
      </Card>
      <Button title="Ajouter une pièce" icon="camera" variant="secondary" onPress={onAdd} />
      <Text style={[type.small, { marginTop: 14, textAlign: 'center', fontSize: 12 }]}>Dossier créé le {formatDate(c.createdAt)}</Text>
    </View>
  );
}

function DocumentRow({ caseId, doc, last }: { caseId: string; doc: Document; last: boolean }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    if (busy) return;
    setBusy(true);
    try { await openDocument(caseId, doc); } catch (e: any) { Alert.alert('Ouverture impossible', e?.message ?? 'Réessayez.'); } finally { setBusy(false); }
  };
  return (
    <Row icon={isImage(doc.mimeType) ? 'image' : 'file'} title={doc.name} last={last}
      subtitle={[bytes(doc.bytes ?? doc.size), formatDate(doc.createdAt), doc.versionNumber > 1 ? `version ${doc.versionNumber}` : ''].filter(Boolean).join(' · ')}
      onPress={open} right={busy ? <Text style={type.small}>…</Text> : <Icon name="download" size={18} color={colors.faint} />} />
  );
}

function Composer({ caseId, onSent }: { caseId: string; onSent: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try { await api.sendMessage(caseId, body); setText(''); success(); onSent(); } catch (e: any) { Alert.alert('Envoi impossible', e.message); } finally { setBusy(false); }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
      <TextInput value={text} onChangeText={setText} multiline placeholder="Écrire au dossier…" placeholderTextColor={colors.faint} maxLength={20000}
        style={{ flex: 1, minHeight: 46, maxHeight: 140, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 23, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15.5, color: colors.ink, backgroundColor: colors.surface }} />
      <Pressable onPress={() => { tap(); send(); }} disabled={busy || !text.trim()} accessibilityLabel="Envoyer"
        style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? colors.wine : colors.lineStrong, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
        <Icon name="send" size={20} color={colors.white} />
      </Pressable>
    </View>
  );
}

const TABS: Tab[] = ['apercu', 'pieces', 'echanges', 'demandes', 'echeances', 'rdv'];

function latestVersions(documents: Document[]) {
  const byRoot = new Map<string, Document>();
  for (const d of documents) {
    const prev = byRoot.get(d.rootDocumentId);
    if (!prev || d.versionNumber > prev.versionNumber) byRoot.set(d.rootDocumentId, d);
  }
  return [...byRoot.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const requestLabel = (status: string) => ({ requested: 'À fournir', provided: 'Fournie, en vérification', accepted: 'Acceptée', cancelled: 'Annulée' } as Record<string, string>)[status] ?? status;
