// Answer a document request from the lawyer: add the document (photo or file) and an optional note.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorNote, Field, Loading, Notice, ProgressBar, Screen, success } from '../../../../components/ui';
import { chooseSource } from '../../../../components/chooseSource';
import { api } from '../../../../lib/api';
import { pick, Picked, Source, upload } from '../../../../lib/files';
import { useData } from '../../../../lib/useData';
import { useSession } from '../../../../lib/session';
import { formatDate } from '../../../../lib/format';
import { type } from '../../../../lib/theme';

export default function ProvideRequest() {
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId: string }>();
  const { capabilities } = useSession();
  const { data, loading, error } = useData(() => api.requests(id), [id]);
  const [file, setFile] = useState<Picked | null>(null);
  const [answer, setAnswer] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading) return <Loading />;
  const request = data?.requests.find(r => r.id === requestId);
  if (!request) return <Screen><ErrorNote message={error ?? 'Demande introuvable.'} /></Screen>;
  const canAnswer = request.status === 'requested';

  const choose = (source: Source) => { pick(source).then(p => p && setFile(p)).catch(e => setFailure(e.message)); };
  const submit = async () => {
    setFailure(null); setProgress(0);
    try {
      let documentId: string | undefined;
      if (file) documentId = (await upload(id, file, capabilities?.maxDocumentBytes, setProgress)).id;
      await api.provideRequest(id, requestId, { ...(documentId ? { documentId } : {}), ...(answer.trim() ? { answer: answer.trim() } : {}) });
      success();
      router.back();
    } catch (e: any) { setFailure(e.message); } finally { setProgress(null); }
  };

  return (
    <Screen footer={canAnswer ? <Button title="Envoyer à l’avocat" icon="send" onPress={submit} loading={progress !== null} disabled={!file && !answer.trim()} /> : undefined}>
      <Card accent style={{ marginBottom: 18 }}>
        <Text style={type.heading}>{request.title}</Text>
        {request.note ? <Text style={[type.body, { marginTop: 8 }]}>{request.note}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge label={canAnswer ? 'À fournir' : request.status === 'provided' ? 'Fournie' : request.status === 'accepted' ? 'Acceptée' : 'Fermée'} tone={canAnswer ? 'wine' : 'green'} />
          {request.dueDate ? <Badge label={`Avant le ${formatDate(request.dueDate)}`} tone="gold" /> : null}
        </View>
      </Card>
      {canAnswer ? (
        <>
          {file ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={type.small}>Pièce choisie</Text>
              <Text style={[type.heading, { marginTop: 4 }]} numberOfLines={2}>{file.name}</Text>
              {progress !== null ? <View style={{ marginTop: 12 }}><ProgressBar ratio={progress} /></View> : null}
              <Button title="Choisir une autre pièce" variant="ghost" small onPress={() => chooseSource(choose)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
            </Card>
          ) : <Button title="Ajouter la pièce" icon="camera" variant="secondary" onPress={() => chooseSource(choose)} style={{ marginBottom: 16 }} />}
          <Field label="Note pour l’avocat (facultatif)" value={answer} onChangeText={setAnswer} multiline placeholder="Une précision sur ce document" />
          {failure ? <ErrorNote message={failure} /> : null}
        </>
      ) : (
        <Notice icon="check">{request.answer ? `Votre réponse : ${request.answer}` : 'Cette demande a déjà reçu une réponse.'}</Notice>
      )}
    </Screen>
  );
}
